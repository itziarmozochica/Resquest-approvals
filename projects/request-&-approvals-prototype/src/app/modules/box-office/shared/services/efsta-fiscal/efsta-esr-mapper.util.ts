import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Coupon, RESCHEDULE_COUPON_CREATION_PURPOSE } from '@fz-original/app/shared/models/cart/coupon.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { OrderTaxes } from '@fz-original/app/shared/models/order/order-taxes.model';

import { HuFiscalRefundData, HuRefundType } from '../../components/hu-fiscal-refund-popup/hu-fiscal-refund.model';
import {
  BuildEsrRequestOptions,
  BuildRefundEsrRequestOptions,
  classifyHuPayment,
  distributeDiscountByHeadroom,
  formatAmount,
  getLineTotal,
  resolveHuPayGroupFromDescription,
  sortSessionsForFiscalMapping,
} from './efsta-esr-mapper-common.util';
import { FiscalTransactionLineItem, FiscalTransactionResponse, FiscalTransactionVatRate } from './fiscal-transaction-api.service';
import { EsrCustomer, EsrMod, EsrPay, EsrPos, EsrPosItem, EsrRequest, EsrTax } from './models/efsta-esr.model';
import { EfstaFiscalGroupResolver } from './models/efsta-fiscal-group.model';
import { buildPackFiscalBlocks, PackFiscalBlock } from './pack-fiscal-lines.util';

const HUNGARIAN_TAX_RATE_TO_GROUP: Record<number, string> = {
  0: 'D',
  5: 'C',
  18: 'B',
  27: 'A',
};

const HUNGARIAN_TAX_GROUP_TO_RATE: Record<string, number> = {
  A: 27,
  B: 18,
  C: 5,
  D: 0,
  E: 0,
};

const DEFAULT_TAX_GROUP = 'A';

const SERVICE_PRODUCT_TYPES = new Set<string>([
  'admission_ticket',
  'admission_ticket_super_reduced',
  'cultural_admission_ticket',
  'exhibition_admission_ticket',
  'aquarium_admission_ticket',
]);

function resolvePositionTypeBySessionTypeId(
  sessionTypeId: number | null | undefined,
  productTypeBySessionTypeId?: Map<number, string>,
): string | undefined {
  const productType = sessionTypeId != null ? productTypeBySessionTypeId?.get(sessionTypeId) : undefined;
  return productType != null && SERVICE_PRODUCT_TYPES.has(productType) ? 'Svc' : undefined;
}

function resolvePositionType(session: CartSession, productTypeBySessionTypeId?: Map<number, string>): string | undefined {
  return resolvePositionTypeBySessionTypeId(session.sessionType?.id, productTypeBySessionTypeId);
}

export function resolveHungarianTaxGroupByRate(rate: number): string | undefined {
  return Object.prototype.hasOwnProperty.call(HUNGARIAN_TAX_RATE_TO_GROUP, rate) ? HUNGARIAN_TAX_RATE_TO_GROUP[rate] : undefined;
}

export function hungarianTaxRateToTaxGroup(rate: number): string {
  return resolveHungarianTaxGroupByRate(rate) ?? DEFAULT_TAX_GROUP;
}

function getTicketLineTotal(session: CartSession): number {
  return (session.unitPrice?.amount ?? 0) * session.units;
}

function getSurchargeLineTotal(session: CartSession): number {
  return (session.surchargePerTicket?.amount ?? 0) * session.units;
}

export function resolveTaxGroup(session: CartSession, taxes: OrderTaxes[], taxRateBySessionTypeId?: Map<number, number>): string {
  const sessionTypeId = session.sessionType?.id;
  const itemTaxRate = sessionTypeId != null ? taxRateBySessionTypeId?.get(sessionTypeId) : undefined;

  if (itemTaxRate != null) {
    return hungarianTaxRateToTaxGroup(itemTaxRate);
  }
  if (taxes.length > 0) {
    return hungarianTaxRateToTaxGroup(taxes[0].rate);
  }
  return DEFAULT_TAX_GROUP;
}

export function resolveSurchargeTaxGroup(
  session: CartSession,
  productTaxGroup: string,
  surchargeTaxRateBySessionTypeId?: Map<number, number>,
): string {
  const sessionTypeId = session.sessionType?.id;
  if (surchargeTaxRateBySessionTypeId != null && sessionTypeId != null) {
    const surchargeRate = surchargeTaxRateBySessionTypeId.get(sessionTypeId);
    if (surchargeRate != null) {
      return hungarianTaxRateToTaxGroup(surchargeRate);
    }
  }
  return productTaxGroup;
}

interface HuPosItemsContext {
  currency?: string;
  productTypeBySessionTypeId?: Map<number, string>;
  surchargeTaxRateBySessionTypeId?: Map<number, number>;
  taxRateBySessionTypeId?: Map<number, number>;
  taxes: OrderTaxes[];
}

interface HuPositionBlock {
  mods: EsrMod[];
  position: EsrPos;
}

interface HuSurchargePositionInput {
  amount: number;
  description: string;
  positionType: string | undefined;
  quantity: string | undefined;
  taxGroup: string;
  unitCount: number;
}

function buildHuUnitPrice(lineTotal: number, quantity: number, currency?: string): string | undefined {
  if (!Number.isFinite(quantity) || quantity === 0 || Math.abs(quantity) === 1) {
    return undefined;
  }
  return formatAmount(Math.abs(lineTotal / quantity), currency);
}

function isHuUnitPriceExact(amount: string, unitPrice: string | undefined, unitCount: number, currency?: string): boolean {
  return (
    unitPrice == null ||
    formatAmount(Number(unitPrice) * Math.abs(unitCount), currency) === formatAmount(Math.abs(Number(amount)), currency)
  );
}

function buildHuSurchargeBlock(input: HuSurchargePositionInput, currency?: string): HuPositionBlock {
  const amount = formatAmount(input.amount, currency);
  const unitPrice = buildHuUnitPrice(input.amount, input.unitCount, currency);
  const hasExactUnitPrice = isHuUnitPriceExact(amount, unitPrice, input.unitCount, currency);
  return {
    mods: [],
    position: {
      _: 'Pos',
      PN: '',
      PTY: input.positionType,
      Dsc: input.description,
      TaxG: input.taxGroup,
      Amt: amount,
      ...(hasExactUnitPrice && input.quantity != null ? { Qty: input.quantity } : {}),
      ...(hasExactUnitPrice && unitPrice != null ? { Pri: unitPrice } : {}),
    },
  };
}

function buildLegacySessionBlocks(session: CartSession, itemNumber: number, context: HuPosItemsContext): HuPositionBlock[] {
  const description = session.sessionType?.ticketReceiptLabel ?? session.sessionType?.label ?? session.sessionName ?? `Item ${itemNumber}`;
  const surchargeAmount = getSurchargeLineTotal(session);
  const hasSurcharge = surchargeAmount > 0;
  const ticketAmount = hasSurcharge ? getTicketLineTotal(session) : getLineTotal(session);
  const taxGroup = resolveTaxGroup(session, context.taxes, context.taxRateBySessionTypeId);
  const quantity = session.units > 1 ? String(session.units) : undefined;
  const positionType = resolvePositionType(session, context.productTypeBySessionTypeId);
  const ticketBlock: HuPositionBlock = {
    mods: [],
    position: {
      _: 'Pos',
      PN: '',
      PTY: positionType,
      IN: session.sessionType?.id ? String(session.sessionType.id) : undefined,
      Dsc: description,
      TaxG: taxGroup,
      Amt: formatAmount(ticketAmount, context.currency),
      Qty: quantity,
    },
  };

  if (!hasSurcharge) {
    return [ticketBlock];
  }

  return [
    ticketBlock,
    buildHuSurchargeBlock(
      {
        amount: surchargeAmount,
        description: `${description} - Surcharge`,
        positionType,
        quantity,
        taxGroup: resolveSurchargeTaxGroup(session, taxGroup, context.surchargeTaxRateBySessionTypeId),
        unitCount: session.units,
      },
      context.currency,
    ),
  ];
}

function buildPackBlockBlocks(session: CartSession, block: PackFiscalBlock, context: HuPosItemsContext): HuPositionBlock[] {
  const { component, fee } = block;
  const taxGroup =
    component.taxRate != null
      ? hungarianTaxRateToTaxGroup(component.taxRate)
      : resolveTaxGroup(session, context.taxes, context.taxRateBySessionTypeId);
  const quantity = component.quantity > 1 ? String(component.quantity) : undefined;
  const componentBlock: HuPositionBlock = {
    mods: [],
    position: {
      _: 'Pos',
      PN: '',
      PTY: resolvePositionTypeBySessionTypeId(component.sessionTypeId, context.productTypeBySessionTypeId),
      IN: component.sessionTypeId != null ? String(component.sessionTypeId) : undefined,
      Dsc: component.text,
      TaxG: taxGroup,
      Amt: formatAmount(block.amount, context.currency),
      Qty: quantity,
    },
  };

  if (fee == null) {
    return [componentBlock];
  }

  const feeTaxGroup =
    fee.taxRate != null
      ? hungarianTaxRateToTaxGroup(fee.taxRate)
      : resolveSurchargeTaxGroup(session, taxGroup, context.surchargeTaxRateBySessionTypeId);

  return [
    componentBlock,
    buildHuSurchargeBlock(
      {
        amount: fee.amount,
        description: fee.text,
        positionType: undefined,
        quantity: fee.quantity > 1 ? String(fee.quantity) : undefined,
        taxGroup: feeTaxGroup,
        unitCount: fee.quantity,
      },
      context.currency,
    ),
  ];
}

function renumberHuBlock(block: HuPositionBlock, index: number): HuPositionBlock {
  const positionNumber = String(index + 1);
  return {
    mods: block.mods.map(mod => ({ ...mod, PN: positionNumber })),
    position: { ...block.position, PN: positionNumber },
  };
}

function huBlockNet(block: HuPositionBlock, currency?: string): number {
  const netAmount = Number(block.position.Amt) + block.mods.reduce((sum, mod) => sum + Number(mod.Amt), 0);
  return Number(formatAmount(netAmount, currency));
}

function dropHuZeroValueBlocks(blocks: readonly HuPositionBlock[], currency?: string): HuPositionBlock[] {
  const valuedBlocks = blocks.filter(block => huBlockNet(block, currency) !== 0);
  const keptBlocks = valuedBlocks.length === 0 ? blocks : valuedBlocks;
  return keptBlocks.map(renumberHuBlock);
}

function flattenHuBlocks(blocks: readonly HuPositionBlock[], currency?: string): EsrPosItem[] {
  return dropHuZeroValueBlocks(blocks, currency).flatMap(block => [block.position, ...block.mods]);
}

function buildPositionBlocks(cart: Cart, taxes: OrderTaxes[], currency?: string, options?: BuildEsrRequestOptions): HuPositionBlock[] {
  const context: HuPosItemsContext = {
    currency,
    productTypeBySessionTypeId: options?.productTypeBySessionTypeId,
    surchargeTaxRateBySessionTypeId: options?.surchargeTaxRateBySessionTypeId,
    taxRateBySessionTypeId: options?.taxRateBySessionTypeId,
    taxes,
  };
  const blocks: HuPositionBlock[] = [];
  let itemNumber = 0;

  cart.sessionItemsByDatetime.forEach((sessions: CartSession[]) => {
    for (const session of sessions) {
      itemNumber += 1;
      const packBlocks = buildPackFiscalBlocks(session, options?.fiscalLinesByTicketId, currency);
      if (packBlocks == null) {
        blocks.push(...buildLegacySessionBlocks(session, itemNumber, context));
        continue;
      }
      for (const block of packBlocks) {
        blocks.push(...buildPackBlockBlocks(session, block, context));
      }
    }
  });

  return blocks.map(renumberHuBlock);
}

function attachDiscountMods(blocks: readonly HuPositionBlock[], mods: readonly EsrMod[]): HuPositionBlock[] {
  const modsByPN = new Map<string, EsrMod[]>();
  for (const mod of mods) {
    modsByPN.set(mod.PN, [...(modsByPN.get(mod.PN) ?? []), mod]);
  }
  return blocks.map(block => {
    const discountMods = modsByPN.get(block.position.PN) ?? [];
    return discountMods.length === 0 ? block : { mods: [...block.mods, ...discountMods], position: block.position };
  });
}

const MAX_DSC_LENGTH = 40;
export const HU_DEPOSIT_DESCRIPTION = 'Előleg';

interface DiscountPosLine {
  PN: string;
  amount: number;
}

interface DiscountGroup {
  taxGroup: string;
  amount: number;
  posItems: ReadonlyArray<DiscountPosLine>;
}

function buildAmountDiscountMods(discountAmount: number, description: string, posItems: EsrPos[], currency?: string): EsrMod[] {
  const groupByTaxGroup = new Map<string, DiscountGroup>();
  for (const pos of posItems) {
    const existing = groupByTaxGroup.get(pos.TaxG);
    const posLine: DiscountPosLine = { PN: pos.PN, amount: Number(pos.Amt) };
    groupByTaxGroup.set(
      pos.TaxG,
      existing != null
        ? { ...existing, amount: existing.amount + posLine.amount, posItems: [...existing.posItems, posLine] }
        : { taxGroup: pos.TaxG, amount: posLine.amount, posItems: [posLine] },
    );
  }
  const groups = Array.from(groupByTaxGroup.values());

  const posGrandTotal = groups.reduce((sum, group) => sum + group.amount, 0);
  if (posGrandTotal <= 0 || discountAmount <= 0) {
    return [];
  }

  const discountMagnitude = Math.min(discountAmount, posGrandTotal);
  const totalDiscount = -discountMagnitude;

  const modAmountByGroup = distributeDiscountByHeadroom(
    totalDiscount,
    new Map(groups.map(group => [group.taxGroup, group.amount])),
    currency,
  );

  const dsc = description.slice(0, MAX_DSC_LENGTH);
  const mods: EsrMod[] = [];
  for (const group of groups) {
    const groupModAmount = modAmountByGroup.get(group.taxGroup) ?? 0;
    if (groupModAmount === 0) {
      continue;
    }
    const modAmountByPN = distributeDiscountByHeadroom(groupModAmount, new Map(group.posItems.map(pos => [pos.PN, pos.amount])), currency);
    for (const pos of group.posItems) {
      const posModAmount = modAmountByPN.get(pos.PN) ?? 0;
      if (posModAmount !== 0) {
        mods.push({ _: 'Mod', PN: pos.PN, Dsc: dsc, Amt: formatAmount(posModAmount, currency) });
      }
    }
  }

  return mods;
}

export function buildDiscountMods(coupon: Coupon, posItems: EsrPos[], currency?: string): EsrMod[] {
  const dsc = coupon.title || coupon.code || 'DISC';
  return buildAmountDiscountMods(Math.abs(coupon.discount.amount), dsc, posItems, currency);
}

function resolvePaidDepositAmount(cart: Cart, paidDepositAmount?: Money | null): number {
  if (paidDepositAmount == null || !Number.isFinite(paidDepositAmount.amount) || paidDepositAmount.amount <= 0) {
    return 0;
  }
  const currency = cart.total?.currency;
  if (currency != null && paidDepositAmount.currency !== currency) {
    return 0;
  }
  return paidDepositAmount.amount;
}

function buildCombinedDiscountDescription(coupon: Coupon | null | undefined, couponAmount: number, depositAmount: number): string {
  const parts: string[] = [];
  if (couponAmount > 0) {
    parts.push(coupon?.title || coupon?.code || 'DISC');
  }
  if (depositAmount > 0) {
    parts.push(HU_DEPOSIT_DESCRIPTION);
  }
  return parts.join(' + ');
}

export function hasVoucher(cart: Cart): boolean {
  return (cart.appliedCoupon?.discount?.amount ?? 0) > 0;
}

function buildPayItem(cart: Cart, total: string, resolveFiscalGroup?: EfstaFiscalGroupResolver): EsrPay {
  if (Number(total) === 0) {
    return { _: 'Pay', Dsc: 'Cash', PayG: 'Cash', Amt: total };
  }
  const { description, payGroup } = classifyHuPayment(cart.paymentMethod, resolveFiscalGroup);
  return { _: 'Pay', Dsc: description, PayG: payGroup, Amt: total };
}

function buildTaxItemsFromPosItems(posItems: EsrPosItem[], currency?: string): EsrTax[] {
  const taxGroupByPN = new Map<string, string>();
  const amtByTaxGroup = new Map<string, number>();

  for (const item of posItems) {
    if (item._ === 'Pos') {
      taxGroupByPN.set(item.PN, item.TaxG);
      amtByTaxGroup.set(item.TaxG, (amtByTaxGroup.get(item.TaxG) ?? 0) + Number(item.Amt));
    }
  }

  for (const item of posItems) {
    if (item._ === 'Mod') {
      const taxGroup = taxGroupByPN.get(item.PN);
      if (taxGroup != null) {
        amtByTaxGroup.set(taxGroup, (amtByTaxGroup.get(taxGroup) ?? 0) + Number(item.Amt));
      }
    }
  }

  return [...amtByTaxGroup.entries()].map(([taxGroup, totalAmt]) => {
    const rate = HUNGARIAN_TAX_GROUP_TO_RATE[taxGroup] ?? 0;
    const tAmt = (totalAmt * rate) / (100 + rate);
    const net = totalAmt - tAmt;
    return {
      _: 'Tax' as const,
      Amt: formatAmount(totalAmt, currency),
      Net: formatAmount(net, currency),
      Prc: String(rate),
      TAmt: formatAmount(tAmt, currency),
      TaxG: taxGroup,
    };
  });
}

export interface ReprintFiscalData {
  fiscalNumber: string;
  originalDate: string;
}

interface EsrBaseFields {
  posItems: EsrPosItem[];
  formattedTotal: string;
  taxItems: EsrTax[];
}

function buildEsrBaseFields(cart: Cart, taxes: OrderTaxes[], options?: BuildEsrRequestOptions): EsrBaseFields {
  const currency = cart.total?.currency;
  let blocks = buildPositionBlocks(cart, taxes, currency, options);

  const coupon = cart.appliedCoupon;
  const couponAmount = coupon != null ? Math.max(0, coupon.discount?.amount ?? 0) : 0;
  const depositAmount = resolvePaidDepositAmount(cart, options?.paidDepositAmount);
  if (couponAmount + depositAmount > 0) {
    blocks = attachDiscountMods(
      blocks,
      buildAmountDiscountMods(
        couponAmount + depositAmount,
        buildCombinedDiscountDescription(coupon, couponAmount, depositAmount),
        blocks.map(block => block.position),
        currency,
      ),
    );
  }

  const posItems = flattenHuBlocks(blocks, currency);

  const posTotal = posItems.reduce((sum, item) => sum + Number(item.Amt), 0);
  const formattedTotal = formatAmount(posTotal, currency);
  const taxItems = buildTaxItemsFromPosItems(posItems, currency);

  return { posItems, formattedTotal, taxItems };
}

export function buildEsrRequest(orderId: number, cart: Cart, taxes: OrderTaxes[], options?: BuildEsrRequestOptions): EsrRequest {
  const { posItems, formattedTotal, taxItems } = buildEsrBaseFields(cart, taxes, options);

  return {
    Tra: {
      ESR: {
        D: options?.orderDate ?? new Date().toISOString(),
        TL: options?.placeId ?? '',
        T: formattedTotal,
        Ref: `order_id:${orderId}`,
        PosA: posItems,
        PayA: [buildPayItem(cart, formattedTotal, options?.resolveFiscalGroup)],
        TaxA: taxItems,
      },
    },
  };
}

export function buildReprintEsrRequest(
  orderId: number,
  cart: Cart,
  taxes: OrderTaxes[],
  reprintData: ReprintFiscalData,
  options?: BuildEsrRequestOptions,
): EsrRequest {
  const { posItems, formattedTotal, taxItems } = buildEsrBaseFields(cart, taxes, options);

  return {
    Tra: {
      ESR: {
        D: new Date().toISOString(),
        TL: options?.placeId ?? '',
        T: formattedTotal,
        NFS: 'DUP',
        RFN: reprintData.fiscalNumber,
        RD: reprintData.originalDate,
        Ref: `order_id:${orderId}`,
        PosA: posItems,
        PayA: [buildPayItem(cart, formattedTotal, options?.resolveFiscalGroup)],
        TaxA: taxItems,
      },
    },
  };
}

export type RefundMapError =
  | 'line-count-mismatch'
  | 'non-fiscal-session-in-cart'
  | 'duplicate-ticket-id'
  | 'quantity-overflow'
  | 'ambiguous-predecessor-lines'
  | 'predecessor-ticket-count-mismatch';

export interface RefundSelectionInput {
  readonly ticketId: number;
  readonly items: ReadonlyArray<{ readonly orderItemIds: ReadonlyArray<number> }>;
}

function countRefundedUnits(selection: RefundSelectionInput): number {
  return selection.items.filter(item => item.orderItemIds.length > 0).length;
}

function sumRefundedUnitsByTicketId(selections: ReadonlyArray<RefundSelectionInput>): Map<number, number> {
  const refundedUnitsByTicketId = new Map<number, number>();
  for (const selection of selections) {
    refundedUnitsByTicketId.set(selection.ticketId, (refundedUnitsByTicketId.get(selection.ticketId) ?? 0) + countRefundedUnits(selection));
  }
  return refundedUnitsByTicketId;
}

function resolveSoldUnits(lineItems: ReadonlyArray<FiscalTransactionLineItem>, indexes: ReadonlyArray<number>): number | null {
  const soldUnits = lineItems[indexes[0]].quantity;
  return indexes.every(index => lineItems[index].quantity === soldUnits) ? soldUnits : null;
}

function buildRefundedQuantityByLineIndexes(
  lineItems: ReadonlyArray<FiscalTransactionLineItem>,
  lineIndexesByTicketId: ReadonlyMap<number, ReadonlyArray<number>>,
  selections: ReadonlyArray<RefundSelectionInput>,
  remainingUnitsByTicketId?: ReadonlyMap<number, number>,
): Map<number, number> | RefundMapError {
  const result = new Map<number, number>();
  for (const [ticketId, refundedUnits] of sumRefundedUnitsByTicketId(selections)) {
    const indexes = lineIndexesByTicketId.get(ticketId);
    if (indexes == null) {
      return 'line-count-mismatch';
    }
    if (refundedUnits === 0) {
      continue;
    }
    const remainingUnits = remainingUnitsByTicketId?.get(ticketId);
    if (remainingUnits != null && refundedUnits > remainingUnits) {
      return 'quantity-overflow';
    }
    const soldUnits = resolveSoldUnits(lineItems, indexes);
    if (soldUnits == null) {
      return 'line-count-mismatch';
    }
    if (refundedUnits > soldUnits) {
      return 'quantity-overflow';
    }
    indexes.forEach(index => result.set(index, refundedUnits));
  }
  return result;
}

export function buildRefundedQuantityByLineIndex(
  cart: Cart,
  originalTransaction: FiscalTransactionResponse,
  selections: ReadonlyArray<RefundSelectionInput>,
  remainingUnitsByTicketId?: ReadonlyMap<number, number>,
): Map<number, number> | RefundMapError {
  const lineItems = originalTransaction.line_items ?? [];

  if (lineItems.length > 0 && lineItems.every(item => item.ticket_id != null)) {
    const lineIndexesByTicketId = new Map<number, number[]>();
    lineItems.forEach((item, index) =>
      lineIndexesByTicketId.set(item.ticket_id!, [...(lineIndexesByTicketId.get(item.ticket_id!) ?? []), index]),
    );
    return buildRefundedQuantityByLineIndexes(lineItems, lineIndexesByTicketId, selections, remainingUnitsByTicketId);
  }

  const orderedSessions = sortSessionsForFiscalMapping(cart);

  const lineIndexesByTicketId = new Map<number, number[]>();
  let lineIndex = 0;
  for (const session of orderedSessions) {
    if (session.ticketId == null) {
      return 'non-fiscal-session-in-cart';
    }
    if (lineIndexesByTicketId.has(session.ticketId)) {
      return 'duplicate-ticket-id';
    }
    lineIndexesByTicketId.set(session.ticketId, [lineIndex]);
    lineIndex++;
  }

  if (lineItems.length !== lineIndex) {
    return 'line-count-mismatch';
  }

  return buildRefundedQuantityByLineIndexes(lineItems, lineIndexesByTicketId, selections, remainingUnitsByTicketId);
}

function groupLineIndexesByTicket(lineItems: ReadonlyArray<FiscalTransactionLineItem>): number[][] {
  const groupKeys = lineItems.map((lineItem: FiscalTransactionLineItem, index: number) =>
    lineItem.ticket_id != null ? `ticket:${lineItem.ticket_id}` : `line:${index}`,
  );
  const firstIndexByGroupKey = new Map(groupKeys.map((groupKey: string, index: number): [string, number] => [groupKey, index]).reverse());
  const groupPosition = (index: number): number => firstIndexByGroupKey.get(groupKeys[index]) ?? index;
  const groupedIndexes = [...groupKeys.keys()].sort(
    (left: number, right: number) => groupPosition(left) - groupPosition(right) || left - right,
  );
  const groupStarts = groupedIndexes.flatMap((lineIndex: number, position: number) =>
    position === 0 || groupKeys[lineIndex] !== groupKeys[groupedIndexes[position - 1]] ? [position] : [],
  );
  return groupStarts.map((start: number, group: number) => groupedIndexes.slice(start, groupStarts[group + 1] ?? groupedIndexes.length));
}

function joinSortedUnits(units: ReadonlyArray<number>): string {
  return [...units].sort((left: number, right: number) => left - right).join(',');
}

function refundsEverySoldUnit(
  lineItems: ReadonlyArray<FiscalTransactionLineItem>,
  lineIndexGroups: ReadonlyArray<ReadonlyArray<number>>,
  successorTicketIds: ReadonlyArray<number>,
  selections: ReadonlyArray<RefundSelectionInput>,
  remainingUnitsByTicketId?: ReadonlyMap<number, number>,
): boolean {
  const refundedUnitsByTicketId = sumRefundedUnitsByTicketId(selections);
  const staysWithinSuccessor = [...refundedUnitsByTicketId.keys()].every((ticketId: number) => successorTicketIds.includes(ticketId));
  const refundedUnits = successorTicketIds.map((ticketId: number) => refundedUnitsByTicketId.get(ticketId) ?? 0);
  const refundsEveryRemainingUnit = successorTicketIds.every(
    (ticketId: number, position: number) =>
      refundedUnits[position] === (remainingUnitsByTicketId?.get(ticketId) ?? refundedUnits[position]),
  );
  const soldUnitsByGroup = lineIndexGroups
    .map((group: ReadonlyArray<number>) => resolveSoldUnits(lineItems, group))
    .filter((soldUnits: number | null): soldUnits is number => soldUnits != null);
  if (!staysWithinSuccessor || !refundsEveryRemainingUnit || soldUnitsByGroup.length !== lineIndexGroups.length) {
    return false;
  }
  return joinSortedUnits(refundedUnits) === joinSortedUnits(soldUnitsByGroup);
}

export function buildPredecessorRefundedQuantityByLineIndex(
  cart: Cart,
  predecessorTransaction: FiscalTransactionResponse,
  selections: ReadonlyArray<RefundSelectionInput>,
  remainingUnitsByTicketId?: ReadonlyMap<number, number>,
): Map<number, number> | RefundMapError {
  const lineItems = predecessorTransaction.line_items ?? [];
  const ticketIds = sortSessionsForFiscalMapping(cart).map((session: CartSession) => session.ticketId);
  if (ticketIds.some((ticketId: number | undefined) => ticketId == null)) {
    return 'non-fiscal-session-in-cart';
  }
  const successorTicketIds = ticketIds.filter((ticketId: number | undefined): ticketId is number => ticketId != null);
  if (new Set(successorTicketIds).size !== successorTicketIds.length) {
    return 'duplicate-ticket-id';
  }

  const lineIndexGroups = groupLineIndexesByTicket(lineItems);
  if (lineIndexGroups.length !== successorTicketIds.length) {
    return 'predecessor-ticket-count-mismatch';
  }
  if (refundsEverySoldUnit(lineItems, lineIndexGroups, successorTicketIds, selections, remainingUnitsByTicketId)) {
    return new Map(lineItems.map((lineItem: FiscalTransactionLineItem, index: number): [number, number] => [index, lineItem.quantity]));
  }

  const lineIndexesByTicketId = new Map<number, number[]>(
    successorTicketIds.map((ticketId: number, position: number) => [ticketId, lineIndexGroups[position]]),
  );
  const refundedQuantityByLineIndex = buildRefundedQuantityByLineIndexes(
    lineItems,
    lineIndexesByTicketId,
    selections,
    remainingUnitsByTicketId,
  );
  if (typeof refundedQuantityByLineIndex === 'string') {
    return refundedQuantityByLineIndex;
  }
  const refundsEveryLine = lineItems.every(
    (lineItem: FiscalTransactionLineItem, index: number) => refundedQuantityByLineIndex.get(index) === lineItem.quantity,
  );
  return refundsEveryLine || haveSameFiscalValue(lineItems, lineIndexGroups) ? refundedQuantityByLineIndex : 'ambiguous-predecessor-lines';
}

function describeUnitFiscalValue(lineItem: FiscalTransactionLineItem): string {
  const quantity = lineItem.quantity > 0 ? lineItem.quantity : 1;
  const unitSurcharge = lineItem.surcharge_amount != null ? Number(lineItem.surcharge_amount) / quantity : null;
  return [Number(lineItem.amount) / quantity, lineItem.vat_rate, unitSurcharge, lineItem.surcharge_vat_rate ?? null].join('|');
}

function haveSameFiscalValue(
  lineItems: ReadonlyArray<FiscalTransactionLineItem>,
  lineIndexGroups: ReadonlyArray<ReadonlyArray<number>>,
): boolean {
  const groupValues = lineIndexGroups.map((group: ReadonlyArray<number>) =>
    group.map((index: number) => describeUnitFiscalValue(lineItems[index])).join(';'),
  );
  return groupValues.every((groupValue: string) => groupValue === groupValues[0]);
}

export function buildVatRatesFromLineItems(lineItems: FiscalTransactionLineItem[], currency?: string): FiscalTransactionVatRate[] {
  const grossByTaxGroup = new Map<string, number>();
  for (const item of lineItems) {
    grossByTaxGroup.set(item.vat_rate, (grossByTaxGroup.get(item.vat_rate) ?? 0) + Number(item.amount));
    if (item.surcharge_amount != null && item.surcharge_vat_rate != null) {
      grossByTaxGroup.set(item.surcharge_vat_rate, (grossByTaxGroup.get(item.surcharge_vat_rate) ?? 0) + Number(item.surcharge_amount));
    }
  }
  return [...grossByTaxGroup.entries()].map(([taxGroup, gross]) => {
    const rate = HUNGARIAN_TAX_GROUP_TO_RATE[taxGroup] ?? 0;
    const tax = (gross * rate) / (100 + rate);
    return {
      gross: formatAmount(gross, currency),
      net: formatAmount(gross - tax, currency),
      rate: taxGroup,
      tax: formatAmount(tax, currency),
    };
  });
}

function computeHuOriginalGross(lineItems: readonly FiscalTransactionLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + Math.abs(Number(item.amount)) + Math.abs(Number(item.surcharge_amount ?? 0)), 0);
}

/**
 * The sale's `gross − declared total` gap also holds a paid deposit (`Előleg`), not only the coupon.
 * Pass `maxDiscount` (the coupon amount) to replay the coupon share alone, as a partial return must.
 */
export function computeHuDerivedDiscount(
  lineItems: readonly FiscalTransactionLineItem[],
  declaredTotal: number,
  maxDiscount = Number.POSITIVE_INFINITY,
): number {
  const originalGross = computeHuOriginalGross(lineItems);
  const derivedDiscount = Math.min(originalGross - declaredTotal, maxDiscount);
  return derivedDiscount > 0 && originalGross > 0 ? derivedDiscount : 0;
}

export function resolveHuCouponAmount(coupon: Coupon | null | undefined): number {
  if (coupon?.creationPurpose === RESCHEDULE_COUPON_CREATION_PURPOSE) {
    return 0;
  }
  return Math.max(0, coupon?.discount?.amount ?? 0);
}

export function isHuRescheduleCarryFullRefund(
  lineItems: readonly FiscalTransactionLineItem[],
  refundedQuantityByLineIndex: ReadonlyMap<number, number> | undefined,
  coupon: Coupon | null | undefined,
): boolean {
  return coupon?.creationPurpose === RESCHEDULE_COUPON_CREATION_PURPOSE && isHuFullReturn(lineItems, refundedQuantityByLineIndex);
}

function resolveHuFullRefundMaxDiscount(
  lineItems: readonly FiscalTransactionLineItem[],
  declaredTotal: number | undefined,
  coupon: Coupon | null | undefined,
): number {
  if (coupon?.creationPurpose !== RESCHEDULE_COUPON_CREATION_PURPOSE || declaredTotal == null) {
    return Number.POSITIVE_INFINITY;
  }
  const carriedAmount = Math.max(0, coupon.discount?.amount ?? 0);
  return Math.max(0, computeHuDerivedDiscount(lineItems, declaredTotal) - carriedAmount);
}

export interface HuRefundBreakdown {
  posItems: EsrPosItem[];
  taxItems: EsrTax[];
  total: number;
}

export function buildHuRefundBreakdown(
  lineItems: FiscalTransactionLineItem[],
  isFullVoid: boolean,
  refundedQuantityByLineIndex: ReadonlyMap<number, number> | undefined,
  declaredTotal: number | undefined,
  currency?: string,
  coupon?: Coupon | null,
): HuRefundBreakdown {
  const isFullRefund = isFullVoid || isHuFullReturn(lineItems, refundedQuantityByLineIndex);
  const maxDiscount = isFullRefund ? resolveHuFullRefundMaxDiscount(lineItems, declaredTotal, coupon) : resolveHuCouponAmount(coupon);
  const posItems = buildRefundPosItems(lineItems, isFullVoid, refundedQuantityByLineIndex, currency, declaredTotal, maxDiscount);
  const total = posItems.reduce((sum, item) => sum + Number(item.Amt), 0);
  const taxItems = buildTaxItemsFromPosItems(posItems, currency);
  return { posItems, taxItems, total };
}

export function buildRefundEsrRequest(
  refundType: HuRefundType,
  fiscalData: HuFiscalRefundData,
  originalTransaction: FiscalTransactionResponse,
  options?: BuildRefundEsrRequestOptions,
): EsrRequest {
  if (!originalTransaction.fiscal_number || !originalTransaction.created_at) {
    throw new Error(
      `Cannot build refund ESR request: original transaction missing RFN/RD ` +
        `(fiscal_number=${originalTransaction.fiscal_number} created_at=${originalTransaction.created_at})`,
    );
  }

  const currency = options?.currency;
  const isFullVoid = refundType === 'void';
  const lineItems = originalTransaction.line_items ?? [];
  const paymentTypes = originalTransaction.amounts_per_payment_type ?? [];

  const declaredTotal = originalTransaction.total != null ? Number(originalTransaction.total) : undefined;
  const {
    posItems,
    taxItems,
    total: refundTotal,
  } = buildHuRefundBreakdown(lineItems, isFullVoid, options?.refundedQuantityByLineIndex, declaredTotal, currency, options?.coupon);

  if (posItems.length === 0) {
    throw new Error('Cannot build refund ESR request: no line items to refund');
  }

  const formattedTotal = formatAmount(refundTotal, currency);

  const payDescription = paymentTypes.length > 0 ? paymentTypes[0].type : 'Cash';
  const payGroup = resolveHuPayGroupFromDescription(payDescription);

  const ctm: EsrCustomer = {
    Nam: fiscalData.customerName,
    TaxId: fiscalData.customerTaxId,
    Adr: fiscalData.customerAddress,
    Zip: fiscalData.customerZip,
    City: fiscalData.customerCity,
    Ctry: 'HU',
  };

  return {
    Tra: {
      ESR: {
        D: new Date().toISOString(),
        TL: options?.placeId ?? '',
        T: formattedTotal,
        ...(isFullVoid ? { Void: '1' } : {}),
        RFN: originalTransaction.fiscal_number,
        RD: originalTransaction.created_at,
        Rsn: fiscalData.reasonCode,
        Ctm: ctm,
        PosA: posItems,
        PayA: [
          {
            _: 'Pay' as const,
            Dsc: payDescription,
            PayG: payGroup,
            Amt: formattedTotal,
          },
        ],
        TaxA: taxItems,
      },
    },
  };
}

function buildRefundLineBlocks(
  lineItem: FiscalTransactionLineItem,
  amount: number,
  quantity: number,
  isFullVoid: boolean,
  currency?: string,
): HuPositionBlock[] {
  const ticketBlock: HuPositionBlock = {
    mods: [],
    position: {
      _: 'Pos',
      PN: '',
      Dsc: lineItem.description,
      TaxG: lineItem.vat_rate,
      Amt: formatAmount(amount, currency),
      Qty: String(quantity),
      ...(isFullVoid ? { Void: '1' } : {}),
    },
  };

  if (lineItem.surcharge_amount == null || lineItem.surcharge_vat_rate == null) {
    return [ticketBlock];
  }

  const surchargeAmount = isFullVoid
    ? -Math.abs(Number(lineItem.surcharge_amount))
    : -(Number(lineItem.surcharge_amount) / lineItem.quantity) * Math.abs(quantity);
  const formattedSurchargeAmount = formatAmount(surchargeAmount, currency);
  const unitPrice = buildHuUnitPrice(surchargeAmount, quantity, currency);
  const hasExactUnitPrice = isHuUnitPriceExact(formattedSurchargeAmount, unitPrice, quantity, currency);

  return [
    ticketBlock,
    {
      mods: [],
      position: {
        _: 'Pos',
        PN: '',
        Dsc: `${lineItem.description} - Surcharge`,
        TaxG: lineItem.surcharge_vat_rate,
        Amt: formattedSurchargeAmount,
        ...(hasExactUnitPrice ? { Qty: String(quantity) } : {}),
        ...(isFullVoid ? { Void: '1' } : {}),
        ...(hasExactUnitPrice && unitPrice != null ? { Pri: unitPrice } : {}),
      },
    },
  ];
}

function isHuFullReturn(
  lineItems: readonly FiscalTransactionLineItem[],
  refundedQuantityByLineIndex: ReadonlyMap<number, number> | undefined,
): boolean {
  if (refundedQuantityByLineIndex == null || lineItems.length === 0) {
    return false;
  }
  return (
    refundedQuantityByLineIndex.size === lineItems.length &&
    lineItems.every((lineItem, index) => refundedQuantityByLineIndex.get(index) === lineItem.quantity)
  );
}

function buildRefundPosItems(
  lineItems: FiscalTransactionLineItem[],
  isFullVoid: boolean,
  refundedQuantityByLineIndex: ReadonlyMap<number, number> | undefined,
  currency?: string,
  declaredTotal?: number,
  maxDiscount?: number,
): EsrPosItem[] {
  if (!isFullVoid && refundedQuantityByLineIndex == null) {
    throw new Error('Cannot build refund ESR request: refundedQuantityByLineIndex is required for partial refunds');
  }

  const blocks: HuPositionBlock[] = [];

  for (let i = 0; i < lineItems.length; i++) {
    const lineItem = lineItems[i];
    let amount: number;
    let quantity: number;

    if (isFullVoid) {
      amount = -Math.abs(Number(lineItem.amount));
      quantity = -Math.abs(lineItem.quantity);
    } else {
      const refundedUnits = refundedQuantityByLineIndex!.get(i);
      if (refundedUnits == null) {
        continue;
      }
      if (refundedUnits <= 0 || refundedUnits > lineItem.quantity) {
        throw new Error(`EFR_INVALID_REFUND_QUANTITY: line ${i} got ${refundedUnits}, original ${lineItem.quantity}`);
      }
      // Documented debt — bound: ±1 minor unit per pathological partition.
      // HUF (zero-decimal): up to ±1 HUF when amount % quantity != 0.
      // EUR / 2-decimal: up to ±1 cent when (amount * 100) % quantity != 0.
      const unitTicketPrice = Number(lineItem.amount) / lineItem.quantity;
      amount = -unitTicketPrice * refundedUnits;
      quantity = -refundedUnits;
    }

    blocks.push(...buildRefundLineBlocks(lineItem, amount, quantity, isFullVoid, currency));
  }

  return flattenHuBlocks(replayDeclaredDiscount(blocks, lineItems, declaredTotal, maxDiscount, currency), currency);
}

function replayDeclaredDiscount(
  blocks: HuPositionBlock[],
  lineItems: readonly FiscalTransactionLineItem[],
  declaredTotal: number | undefined,
  maxDiscount: number | undefined,
  currency?: string,
): HuPositionBlock[] {
  if (declaredTotal == null || !Number.isFinite(declaredTotal) || blocks.length === 0) {
    return blocks;
  }

  const derivedDiscount = computeHuDerivedDiscount(lineItems, declaredTotal, maxDiscount);
  if (derivedDiscount <= 0) {
    return blocks;
  }

  const originalGross = computeHuOriginalGross(lineItems);
  const refundedGross = blocks.reduce((sum, block) => sum + Math.abs(Number(block.position.Amt)), 0);
  const proRatedDiscount = derivedDiscount * (refundedGross / originalGross);
  if (!(proRatedDiscount > 0)) {
    return blocks;
  }

  const numbered = blocks.map((block, index) => renumberHuBlock(block, index));
  const positivePositions = numbered.map(block => ({
    ...block.position,
    Amt: formatAmount(Math.abs(Number(block.position.Amt)), currency),
  }));
  const reversalMods = buildAmountDiscountMods(proRatedDiscount, 'DISC', positivePositions, currency).map(mod => ({
    ...mod,
    Amt: formatAmount(-Number(mod.Amt), currency),
  }));
  return attachDiscountMods(numbered, reversalMods);
}

import { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Coupon } from '@fz-original/app/shared/models/cart/coupon.model';
import { Money } from '@fz-original/app/shared/models/money.model';

import {
  distributeDiscountByHeadroom,
  EsrPayClassification,
  FiscalLinesByTicketId,
  formatAmount,
  getLineTotal,
  sortSessionsForFiscalMapping,
} from './efsta-esr-mapper-common.util';
import {
  FiscalTransactionLineItem,
  FiscalTransactionPaymentType,
  FiscalTransactionResponse,
  FiscalTransactionVatRate,
} from './fiscal-transaction-api.service';
import { EsrMod, EsrPay, EsrPos, EsrPosItem, EsrRequest, EsrTax, EsrText } from './models/efsta-esr.model';
import { EfstaFiscalGroupResolver } from './models/efsta-fiscal-group.model';
import { buildPackFiscalBlocks, PackFiscalBlock } from './pack-fiscal-lines.util';

export type PolishTaxGroup = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export const POLISH_TAX_GROUP_TO_RATE: Readonly<Record<PolishTaxGroup, number>> = {
  A: 23,
  B: 8,
  C: 5,
  D: 0,
  E: 0,
  F: 0,
};

const PL_TAX_GROUP_BY_RATE: ReadonlyMap<number, PolishTaxGroup> = new Map<number, PolishTaxGroup>([
  [23, 'A'],
  [8, 'B'],
  [5, 'C'],
  [0, 'D'],
]);

export function resolvePlTaxGroupByRate(rate: number): PolishTaxGroup | undefined {
  return PL_TAX_GROUP_BY_RATE.get(rate);
}

export const MAX_PL_DSC_LENGTH = 46;

export const PL_PAY_GROUP_CASH = 'Cash';
export const PL_PAY_GROUP_CREDIT_CARD = 'creditcard';
export const PL_PAY_GROUP_DEBIT_CARD = 'debitcard';

export const PL_ADYEN_GATEWAY = 'adyen';
export const PL_DELEGATED_GATEWAY = 'delegated';

export interface PlPaymentTender {
  amount: number;
  gateway?: string | null;
  method?: string | null;
}

export const PL_PAYMENT_DESCRIPTION_CASH = 'Gotówka';
export const PL_PAYMENT_DESCRIPTION_CARD = 'Karta płatnicza';
export const PL_DEPOSIT_DESCRIPTION = 'Zaliczka';

const PL_CARD_PAYMENT_DESCRIPTIONS = new Set(['Bankcard', 'Card', 'CreditCard', 'DebitCard', PL_PAYMENT_DESCRIPTION_CARD]);

const PL_PAYMENT_DESCRIPTION_BY_PERSISTED_TYPE: Readonly<Record<string, string>> = {
  Bankcard: PL_PAYMENT_DESCRIPTION_CARD,
  Card: PL_PAYMENT_DESCRIPTION_CARD,
  Cash: PL_PAYMENT_DESCRIPTION_CASH,
  CreditCard: PL_PAYMENT_DESCRIPTION_CARD,
  DebitCard: PL_PAYMENT_DESCRIPTION_CARD,
  [PL_PAYMENT_DESCRIPTION_CARD]: PL_PAYMENT_DESCRIPTION_CARD,
  [PL_PAYMENT_DESCRIPTION_CASH]: PL_PAYMENT_DESCRIPTION_CASH,
};

export function toPlPaymentDescription(persistedType: string): string {
  return Object.prototype.hasOwnProperty.call(PL_PAYMENT_DESCRIPTION_BY_PERSISTED_TYPE, persistedType)
    ? PL_PAYMENT_DESCRIPTION_BY_PERSISTED_TYPE[persistedType]
    : toPlDescription(persistedType);
}

export type PlEsrMapErrorCode =
  | 'EFR_PL_INVALID_REFUND_AMOUNT'
  | 'EFR_PL_INVALID_REFUND_QUANTITY'
  | 'EFR_PL_INVALID_TAX_RATE'
  | 'EFR_PL_MISPLACED_MOD'
  | 'EFR_PL_MISSING_ORIGINAL_FISCAL_NUMBER'
  | 'EFR_PL_MISSING_TAX_GROUP'
  | 'EFR_PL_MIXED_SIGN_POSITIONS'
  | 'EFR_PL_RECONCILIATION_FAILED'
  | 'EFR_PL_UNMAPPED_TAX_GROUP'
  | 'EFR_PL_ZERO_VALUE_TRANSACTION';

export class PlEsrMapError extends Error {
  readonly code: PlEsrMapErrorCode;

  constructor(code: PlEsrMapErrorCode, detail?: string) {
    super(detail != null ? `${code}: ${detail}` : code);
    this.code = code;
    this.name = 'PlEsrMapError';
  }
}

export interface BuildPlEsrRequestOptions {
  fiscalLinesByTicketId?: FiscalLinesByTicketId;
  orderDate?: string;
  paidDepositAmount?: Money | null;
  paymentTenders?: readonly PlPaymentTender[];
  placeId?: string;
  resolveFiscalGroup?: EfstaFiscalGroupResolver;
  surchargeTaxGroupBySessionTypeId?: ReadonlyMap<number, string>;
  taxGroupBySessionTypeId?: ReadonlyMap<number, string>;
  taxGroupToRate?: Readonly<Record<string, number>>;
}

const POLISH_CP852_LETTERS = 'ĄąĆćĘęŁłŃńÓóŚśŹźŻż';

const CP852_TRANSLITERATIONS: Readonly<Record<string, string>> = {
  '\u00a0': ' ',
  '–': '-',
  '—': '-',
  '‘': "'",
  '’': "'",
  '‚': ',',
  '“': '"',
  '”': '"',
  '„': '"',
  '…': '...',
  '€': 'EUR',
  '©': '(c)',
  '®': '(R)',
  '™': 'TM',
};

const UNSUPPORTED_CHARACTER_REPLACEMENT = '?';

const SURCHARGE_DESCRIPTION_SUFFIX = ' - Surcharge';

function isPrintableAscii(character: string): boolean {
  const codePoint = character.codePointAt(0) ?? 0;
  return codePoint >= 0x20 && codePoint <= 0x7e;
}

function toCp852SafeCharacter(character: string): string {
  if (isPrintableAscii(character) || POLISH_CP852_LETTERS.includes(character)) {
    return character;
  }
  return CP852_TRANSLITERATIONS[character] ?? UNSUPPORTED_CHARACTER_REPLACEMENT;
}

export function toPlDescription(value: string, maxLength: number = MAX_PL_DSC_LENGTH): string {
  let description = '';
  for (const character of value.normalize('NFC')) {
    const replacement = toCp852SafeCharacter(character);
    if (description.length + replacement.length > maxLength) {
      break;
    }
    description += replacement;
  }
  return description;
}

export const PL_ORDER_REFERENCE_FOOTER_KEYWORD = 'Nr zamówienia';

export const MAX_PL_FOOTER_TYPE4_PARAMETER_LENGTH = 40;

export function buildPlOrderReferenceFoot(orderId: number | null | undefined): EsrText[] | undefined {
  if (orderId == null || !Number.isFinite(orderId)) {
    return undefined;
  }
  const parameter = toPlDescription(String(orderId), MAX_PL_FOOTER_TYPE4_PARAMETER_LENGTH);
  if (parameter.length === 0) {
    return undefined;
  }
  return [{ _: 'Txt', value: `${PL_ORDER_REFERENCE_FOOTER_KEYWORD} ${parameter}` }];
}

export const PL_THANK_YOU_FOOTER_KEYWORD = 'Dziękujemy za lojalność';

export function buildPlThankYouFoot(): EsrText[] {
  return [{ _: 'Txt', value: PL_THANK_YOU_FOOTER_KEYWORD }];
}

export function buildPlFootLines(orderId: number | null | undefined): EsrText[] {
  return [...(buildPlOrderReferenceFoot(orderId) ?? []), ...buildPlThankYouFoot()];
}

export function isPolishTaxGroup(value: string, taxGroupToRate?: Readonly<Record<string, number>>): boolean {
  return Object.prototype.hasOwnProperty.call(taxGroupToRate ?? POLISH_TAX_GROUP_TO_RATE, value);
}

export function polishTaxGroupToRate(taxGroup: string, taxGroupToRate?: Readonly<Record<string, number>>): number {
  const table: Readonly<Record<string, number>> = taxGroupToRate ?? POLISH_TAX_GROUP_TO_RATE;
  if (!isPolishTaxGroup(taxGroup, taxGroupToRate)) {
    throw new PlEsrMapError('EFR_PL_UNMAPPED_TAX_GROUP', taxGroup);
  }
  const rate = table[taxGroup];
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0) {
    throw new PlEsrMapError('EFR_PL_INVALID_TAX_RATE', `${taxGroup}=${String(rate)}`);
  }
  return rate;
}

export function resolvePlTaxGroup(
  session: CartSession,
  taxGroupBySessionTypeId?: ReadonlyMap<number, string>,
  taxGroupToRate?: Readonly<Record<string, number>>,
): string {
  const sessionTypeId = session.sessionType?.id;
  if (sessionTypeId == null) {
    throw new PlEsrMapError('EFR_PL_MISSING_TAX_GROUP', 'session without sessionType id');
  }
  const taxGroup = taxGroupBySessionTypeId?.get(sessionTypeId);
  if (taxGroup == null) {
    throw new PlEsrMapError('EFR_PL_MISSING_TAX_GROUP', `sessionTypeId:${sessionTypeId}`);
  }
  if (!isPolishTaxGroup(taxGroup, taxGroupToRate)) {
    throw new PlEsrMapError('EFR_PL_UNMAPPED_TAX_GROUP', taxGroup);
  }
  return taxGroup;
}

export function resolvePlSurchargeTaxGroup(
  session: CartSession,
  productTaxGroup: string,
  surchargeTaxGroupBySessionTypeId?: ReadonlyMap<number, string>,
  taxGroupToRate?: Readonly<Record<string, number>>,
): string {
  const sessionTypeId = session.sessionType?.id;
  const surchargeTaxGroup = sessionTypeId != null ? surchargeTaxGroupBySessionTypeId?.get(sessionTypeId) : undefined;
  if (surchargeTaxGroup == null) {
    return productTaxGroup;
  }
  if (!isPolishTaxGroup(surchargeTaxGroup, taxGroupToRate)) {
    throw new PlEsrMapError('EFR_PL_UNMAPPED_TAX_GROUP', surchargeTaxGroup);
  }
  return surchargeTaxGroup;
}

export function assertPlModsFollowTheirPos(items: readonly EsrPosItem[]): void {
  let currentPositionNumber: string | undefined;
  for (const item of items) {
    if (item._ === 'Pos') {
      currentPositionNumber = item.PN;
      continue;
    }
    if (item.PN !== currentPositionNumber) {
      throw new PlEsrMapError('EFR_PL_MISPLACED_MOD', `Mod PN:${item.PN} after Pos PN:${currentPositionNumber ?? 'none'}`);
    }
  }
}

export function assertPlPositionSigns(items: readonly EsrPosItem[]): void {
  const positions = items.filter((item): item is EsrPos => item._ === 'Pos');
  const hasPositive = positions.some(position => Number(position.Amt) > 0);
  const hasNegative = positions.some(position => Number(position.Amt) < 0);
  if (!hasPositive || !hasNegative) {
    return;
  }

  const positivePositionNumbers = new Set(positions.filter(position => Number(position.Amt) > 0).map(position => position.PN));
  const everyNegativeReferencesAPositive = positions
    .filter(position => Number(position.Amt) < 0)
    .every(position => position.RPN != null && position.RPN.length > 0 && positivePositionNumbers.has(position.RPN));

  if (!everyNegativeReferencesAPositive) {
    throw new PlEsrMapError('EFR_PL_MIXED_SIGN_POSITIONS');
  }
}

export function assertPlNonZeroTotal(formattedTotal: string): void {
  if (Number(formattedTotal) === 0) {
    throw new PlEsrMapError('EFR_PL_ZERO_VALUE_TRANSACTION');
  }
}

export function buildPlUnitPrice(lineTotal: number, quantity: number, currency?: string): string | undefined {
  if (!Number.isFinite(quantity) || quantity === 0 || Math.abs(quantity) === 1) {
    return undefined;
  }
  return formatAmount(Math.abs(lineTotal / quantity), currency);
}

function getTicketLineTotal(session: CartSession): number {
  return (session.unitPrice?.amount ?? 0) * session.units;
}

function getSurchargeLineTotal(session: CartSession): number {
  return (session.surchargePerTicket?.amount ?? 0) * session.units;
}

export interface PlPositionBlock {
  mods: EsrMod[];
  position: EsrPos;
}

function buildPlSurchargeDescription(description: string): string {
  return `${toPlDescription(description, MAX_PL_DSC_LENGTH - SURCHARGE_DESCRIPTION_SUFFIX.length)}${SURCHARGE_DESCRIPTION_SUFFIX}`;
}

interface PlSurchargePositionInput {
  amount: number;
  description: string;
  quantity: string | undefined;
  taxGroup: string;
  unitCount: number;
}

function isPlUnitPriceExact(amount: string, unitPrice: string | undefined, unitCount: number, currency?: string): boolean {
  return unitPrice == null || formatAmount(Number(unitPrice) * unitCount, currency) === formatAmount(Math.abs(Number(amount)), currency);
}

function buildPlSurchargeBlock(input: PlSurchargePositionInput, currency?: string): PlPositionBlock {
  const amount = formatAmount(input.amount, currency);
  const unitPrice = buildPlUnitPrice(input.amount, input.unitCount, currency);
  const hasExactUnitPrice = isPlUnitPriceExact(amount, unitPrice, input.unitCount, currency);
  return {
    mods: [],
    position: {
      _: 'Pos',
      PN: '',
      Dsc: buildPlSurchargeDescription(input.description),
      TaxG: input.taxGroup,
      Amt: amount,
      Qty: hasExactUnitPrice ? input.quantity : undefined,
      Pri: hasExactUnitPrice ? unitPrice : undefined,
    },
  };
}

function buildPlLegacyPositionBlocks(
  session: CartSession,
  itemNumber: number,
  currency: string | undefined,
  options?: BuildPlEsrRequestOptions,
): PlPositionBlock[] {
  const description = session.sessionType?.ticketReceiptLabel ?? session.sessionType?.label ?? session.sessionName ?? `Item ${itemNumber}`;
  const surchargeAmount = getSurchargeLineTotal(session);
  const hasSurcharge = surchargeAmount > 0;
  const ticketAmount = hasSurcharge ? getTicketLineTotal(session) : getLineTotal(session);
  const taxGroup = resolvePlTaxGroup(session, options?.taxGroupBySessionTypeId, options?.taxGroupToRate);
  const quantity = session.units > 1 ? String(session.units) : undefined;

  const ticketBlock: PlPositionBlock = {
    mods: [],
    position: {
      _: 'Pos',
      PN: '',
      IN: session.sessionType?.id != null ? String(session.sessionType.id) : undefined,
      Dsc: toPlDescription(description),
      TaxG: taxGroup,
      Amt: formatAmount(ticketAmount, currency),
      Qty: quantity,
      Pri: buildPlUnitPrice(ticketAmount, session.units, currency),
    },
  };

  if (!hasSurcharge) {
    return [ticketBlock];
  }

  const surchargeBlock = buildPlSurchargeBlock(
    {
      amount: surchargeAmount,
      description,
      quantity,
      taxGroup: resolvePlSurchargeTaxGroup(session, taxGroup, options?.surchargeTaxGroupBySessionTypeId, options?.taxGroupToRate),
      unitCount: session.units,
    },
    currency,
  );
  return [ticketBlock, surchargeBlock];
}

export function resolvePlFiscalLineTaxGroup(
  taxRate: number | null,
  detail: string,
  taxGroupToRate?: Readonly<Record<string, number>>,
): string {
  if (taxRate == null) {
    throw new PlEsrMapError('EFR_PL_MISSING_TAX_GROUP', detail);
  }
  const taxGroup = resolvePlTaxGroupByRate(taxRate);
  if (taxGroup == null || !isPolishTaxGroup(taxGroup, taxGroupToRate)) {
    throw new PlEsrMapError('EFR_PL_UNMAPPED_TAX_GROUP', `rate:${taxRate} ${detail}`);
  }
  return taxGroup;
}

function buildPlPackPositionBlocks(
  session: CartSession,
  block: PackFiscalBlock,
  currency: string | undefined,
  options?: BuildPlEsrRequestOptions,
): PlPositionBlock[] {
  const { component, fee } = block;
  const taxGroup = resolvePlFiscalLineTaxGroup(component.taxRate, `sessionTypeId:${component.sessionTypeId}`, options?.taxGroupToRate);
  const quantity = component.quantity > 1 ? String(component.quantity) : undefined;

  const componentBlock: PlPositionBlock = {
    mods: [],
    position: {
      _: 'Pos',
      PN: '',
      IN: component.sessionTypeId != null ? String(component.sessionTypeId) : undefined,
      Dsc: toPlDescription(component.text),
      TaxG: taxGroup,
      Amt: formatAmount(block.amount, currency),
      Qty: quantity,
      Pri: buildPlUnitPrice(block.amount, component.quantity, currency),
    },
  };

  if (fee == null) {
    return [componentBlock];
  }

  const feeTaxGroup =
    fee.taxRate != null
      ? resolvePlFiscalLineTaxGroup(fee.taxRate, `booking fee ticketId:${session.ticketId}`, options?.taxGroupToRate)
      : resolvePlSurchargeTaxGroup(session, taxGroup, options?.surchargeTaxGroupBySessionTypeId, options?.taxGroupToRate);
  const feeBlock = buildPlSurchargeBlock(
    {
      amount: fee.amount,
      description: component.text,
      quantity: fee.quantity > 1 ? String(fee.quantity) : undefined,
      taxGroup: feeTaxGroup,
      unitCount: fee.quantity,
    },
    currency,
  );
  return [componentBlock, feeBlock];
}

function buildPlPositionBlocks(cart: Cart, options?: BuildPlEsrRequestOptions): PlPositionBlock[] {
  const currency = cart.total?.currency;
  const blocks: PlPositionBlock[] = [];
  for (const [index, session] of sortSessionsForFiscalMapping(cart).entries()) {
    const packBlocks = buildPackFiscalBlocks(session, options?.fiscalLinesByTicketId, currency);
    if (packBlocks == null) {
      blocks.push(...buildPlLegacyPositionBlocks(session, index + 1, currency, options));
      continue;
    }
    for (const packBlock of packBlocks) {
      blocks.push(...buildPlPackPositionBlocks(session, packBlock, currency, options));
    }
  }
  return blocks.map(renumberPlBlock);
}

function buildPlHeadroomByKey(blocks: readonly PlPositionBlock[]): Map<string, number> {
  const headroomByKey = new Map<string, number>();
  for (const block of blocks) {
    const positionAmount = Number(block.position.Amt);
    if (positionAmount > 0) {
      headroomByKey.set(block.position.PN, positionAmount);
    }
  }
  return headroomByKey;
}

function applyPlAmountDiscountToBlocks(
  discountAmount: number,
  description: string,
  blocks: readonly PlPositionBlock[],
  currency?: string,
): PlPositionBlock[] {
  const headroomByKey = buildPlHeadroomByKey(blocks);
  const grandTotal = [...headroomByKey.values()].reduce((sum, headroom) => sum + headroom, 0);
  if (grandTotal <= 0 || discountAmount <= 0) {
    return [...blocks];
  }

  const totalDiscount = -Math.min(discountAmount, grandTotal);
  const discountByKey = distributeDiscountByHeadroom(totalDiscount, headroomByKey, currency);

  return blocks.map(block => {
    const positionNumber = block.position.PN;
    const positionDiscount = discountByKey.get(positionNumber) ?? 0;
    const discountMods: EsrMod[] =
      positionDiscount === 0 ? [] : [{ _: 'Mod', PN: positionNumber, Dsc: description, Amt: formatAmount(positionDiscount, currency) }];

    return { mods: [...block.mods, ...discountMods], position: block.position };
  });
}

export function applyPlDiscountToBlocks(coupon: Coupon, blocks: readonly PlPositionBlock[], currency?: string): PlPositionBlock[] {
  const description = toPlDescription(coupon.title || coupon.code || 'DISC');
  return applyPlAmountDiscountToBlocks(Math.abs(coupon.discount.amount), description, blocks, currency);
}

function resolvePlPaidDepositAmount(cart: Cart, paidDepositAmount?: Money | null): number {
  if (paidDepositAmount == null || !Number.isFinite(paidDepositAmount.amount) || paidDepositAmount.amount <= 0) {
    return 0;
  }
  const currency = cart.total?.currency;
  if (currency != null && paidDepositAmount.currency !== currency) {
    return 0;
  }
  return paidDepositAmount.amount;
}

function buildPlCombinedDiscountDescription(coupon: Coupon | null | undefined, couponAmount: number, depositAmount: number): string {
  const parts: string[] = [];
  if (couponAmount > 0) {
    parts.push(coupon?.title || coupon?.code || 'DISC');
  }
  if (depositAmount > 0) {
    parts.push(PL_DEPOSIT_DESCRIPTION);
  }
  return toPlDescription(parts.join(' + '));
}

function isPlZeroValueBlock(block: PlPositionBlock): boolean {
  const netAmount = Number(block.position.Amt) + block.mods.reduce((sum, mod) => sum + Number(mod.Amt), 0);
  return Number(formatAmount(netAmount)) === 0;
}

function renumberPlBlock(block: PlPositionBlock, index: number): PlPositionBlock {
  const positionNumber = String(index + 1);
  return {
    mods: block.mods.map(mod => ({ ...mod, PN: positionNumber })),
    position: { ...block.position, PN: positionNumber },
  };
}

function dropPlZeroValueBlocks(blocks: readonly PlPositionBlock[]): readonly PlPositionBlock[] {
  const valuedBlocks = blocks.filter(block => !isPlZeroValueBlock(block));
  return valuedBlocks.length === 0 ? blocks : valuedBlocks.map(renumberPlBlock);
}

function flattenPlBlocks(blocks: readonly PlPositionBlock[]): EsrPosItem[] {
  return dropPlZeroValueBlocks(blocks).flatMap(block => [block.position, ...block.mods]);
}

export function buildPlPosItems(cart: Cart, options?: BuildPlEsrRequestOptions): EsrPosItem[] {
  const blocks = buildPlPositionBlocks(cart, options);
  const currency = cart.total?.currency;
  const coupon = cart.appliedCoupon;
  const couponAmount = coupon != null ? Math.max(0, coupon.discount?.amount ?? 0) : 0;
  const depositAmount = resolvePlPaidDepositAmount(cart, options?.paidDepositAmount);
  const totalDiscountAmount = couponAmount + depositAmount;

  const discountedBlocks =
    totalDiscountAmount > 0
      ? applyPlAmountDiscountToBlocks(
          totalDiscountAmount,
          buildPlCombinedDiscountDescription(coupon, couponAmount, depositAmount),
          blocks,
          currency,
        )
      : blocks;

  const items = flattenPlBlocks(discountedBlocks);

  assertPlModsFollowTheirPos(items);
  assertPlPositionSigns(items);
  return items;
}

export function buildPlTaxItems(
  items: readonly EsrPosItem[],
  currency?: string,
  taxGroupToRate?: Readonly<Record<string, number>>,
): EsrTax[] {
  const taxGroupByPN = new Map<string, string>();
  const amountByTaxGroup = new Map<string, number>();

  for (const item of items) {
    if (item._ === 'Pos') {
      taxGroupByPN.set(item.PN, item.TaxG);
      amountByTaxGroup.set(item.TaxG, (amountByTaxGroup.get(item.TaxG) ?? 0) + Number(item.Amt));
    }
  }

  for (const item of items) {
    if (item._ === 'Mod') {
      const taxGroup = taxGroupByPN.get(item.PN);
      if (taxGroup == null) {
        throw new PlEsrMapError('EFR_PL_MISSING_TAX_GROUP', `Mod PN:${item.PN}`);
      }
      amountByTaxGroup.set(taxGroup, (amountByTaxGroup.get(taxGroup) ?? 0) + Number(item.Amt));
    }
  }

  return [...amountByTaxGroup.entries()].map(([taxGroup, grossAmount]) => {
    const rate = polishTaxGroupToRate(taxGroup, taxGroupToRate);
    const taxAmount = (grossAmount * rate) / (100 + rate);
    return {
      _: 'Tax' as const,
      Amt: formatAmount(grossAmount, currency),
      Net: formatAmount(grossAmount - taxAmount, currency),
      Prc: String(rate),
      TAmt: formatAmount(taxAmount, currency),
      TaxG: taxGroup,
    };
  });
}

function describePlPayGroup(payGroup: string): string {
  const isCardFiscalGroup = payGroup === PL_PAY_GROUP_CREDIT_CARD || payGroup === PL_PAY_GROUP_DEBIT_CARD;
  return isCardFiscalGroup ? PL_PAYMENT_DESCRIPTION_CARD : PL_PAYMENT_DESCRIPTION_CASH;
}

/** A code with no row, or no resolver (no Polish fiscal profile), gets the default rule: `Cash`. */
export function classifyPlPayment(paymentType: string | undefined, resolveFiscalGroup?: EfstaFiscalGroupResolver): EsrPayClassification {
  const payGroup = resolveFiscalGroup?.(paymentType) ?? PL_PAY_GROUP_CASH;
  return { description: describePlPayGroup(payGroup), payGroup };
}

export function mapPlPaymentDescriptionToPayGroup(description: string): string {
  if (description === 'CreditCard') {
    return PL_PAY_GROUP_CREDIT_CARD;
  }
  return PL_CARD_PAYMENT_DESCRIPTIONS.has(description) ? PL_PAY_GROUP_DEBIT_CARD : PL_PAY_GROUP_CASH;
}

/**
 * The fiscal group of a tender: the row of its method, and `Cash` for a `cash` tender without one; else the rule
 * of its gateway, `adyen` the row of `card` and `delegated` the row of `cash`, each `Cash` without one.
 * `undefined` when neither names it: the tender is unnameable.
 */
function resolvePlTenderFiscalGroup(tender: PlPaymentTender, resolveFiscalGroup?: EfstaFiscalGroupResolver): string | undefined {
  const methodFiscalGroup = resolveFiscalGroup?.(tender.method ?? undefined);
  if (methodFiscalGroup !== undefined) {
    return methodFiscalGroup;
  }
  if (tender.method?.toLowerCase() === PaymentType.CASH) {
    return PL_PAY_GROUP_CASH;
  }
  if (tender.gateway === PL_ADYEN_GATEWAY) {
    return resolveFiscalGroup?.(PaymentType.CARD) ?? PL_PAY_GROUP_CASH;
  }
  if (tender.gateway === PL_DELEGATED_GATEWAY) {
    return resolveFiscalGroup?.(PaymentType.CASH) ?? PL_PAY_GROUP_CASH;
  }
  return undefined;
}

export type PlPaymentBreakdownReason = 'NO_TENDERS' | 'UNNAMEABLE_TENDER' | 'NON_POSITIVE_AMOUNT' | 'TOTAL_MISMATCH';

export type PlPaymentBreakdownPrecheckReason = Exclude<PlPaymentBreakdownReason, 'TOTAL_MISMATCH'> | 'PRECHECK_TOTAL_MISMATCH';

type PlTenderPayItemsResult = { readonly payItems: EsrPay[] } | { readonly reason: PlPaymentBreakdownReason };

function resolvePlTenderPayItems(
  tenders: readonly PlPaymentTender[],
  formattedTotal: string,
  currency?: string,
  resolveFiscalGroup?: EfstaFiscalGroupResolver,
): PlTenderPayItemsResult {
  if (tenders.length === 0) {
    return { reason: 'NO_TENDERS' };
  }

  const payItems: EsrPay[] = [];
  for (const tender of tenders) {
    const payGroup = resolvePlTenderFiscalGroup(tender, resolveFiscalGroup);
    if (payGroup === undefined) {
      return { reason: 'UNNAMEABLE_TENDER' };
    }
    if (!Number.isFinite(tender.amount) || tender.amount <= 0) {
      return { reason: 'NON_POSITIVE_AMOUNT' };
    }
    payItems.push({
      _: 'Pay',
      Dsc: describePlPayGroup(payGroup),
      PayG: payGroup,
      Amt: formatAmount(tender.amount, currency),
    });
  }

  const declaredTotal = formatAmount(
    payItems.reduce((sum, payItem) => sum + Number(payItem.Amt), 0),
    currency,
  );
  return declaredTotal === formattedTotal ? { payItems } : { reason: 'TOTAL_MISMATCH' };
}

export function buildPlTenderPayItems(
  tenders: readonly PlPaymentTender[],
  formattedTotal: string,
  currency?: string,
  resolveFiscalGroup?: EfstaFiscalGroupResolver,
): EsrPay[] | undefined {
  const result = resolvePlTenderPayItems(tenders, formattedTotal, currency, resolveFiscalGroup);
  return 'payItems' in result ? result.payItems : undefined;
}

/**
 * Why signing would discard the tender breakdown, by the same naming rule. Without `resolveFiscalGroup` (the setup
 * carries no map) only the gateway rule names a tender.
 */
export function classifyPlPaymentBreakdown(
  cart: Cart,
  tenders: readonly PlPaymentTender[] | undefined,
  paidDepositAmount?: Money | null,
  resolveFiscalGroup?: EfstaFiscalGroupResolver,
): PlPaymentBreakdownPrecheckReason | undefined {
  if (tenders == null) {
    return undefined;
  }
  const currency = cart.total?.currency;
  const payableTotal = (cart.total?.amount ?? 0) - resolvePlPaidDepositAmount(cart, paidDepositAmount);
  const formattedTotal = formatAmount(payableTotal, currency);
  const result = resolvePlTenderPayItems(tenders, formattedTotal, currency, resolveFiscalGroup);
  if (!('reason' in result)) {
    return undefined;
  }
  return result.reason === 'TOTAL_MISMATCH' ? 'PRECHECK_TOTAL_MISMATCH' : result.reason;
}

export function buildPlPayItems(
  cart: Cart,
  formattedTotal: string,
  tenders?: readonly PlPaymentTender[],
  resolveFiscalGroup?: EfstaFiscalGroupResolver,
): EsrPay[] {
  const tenderPayItems =
    tenders != null ? buildPlTenderPayItems(tenders, formattedTotal, cart.total?.currency, resolveFiscalGroup) : undefined;
  if (tenderPayItems != null) {
    return tenderPayItems;
  }

  const { description, payGroup } = classifyPlPayment(cart.paymentMethod, resolveFiscalGroup);
  return [{ _: 'Pay', Dsc: description, PayG: payGroup, Amt: formattedTotal }];
}

export function buildPlEsrRequest(orderId: number, cart: Cart, options?: BuildPlEsrRequestOptions): EsrRequest {
  const currency = cart.total?.currency;
  const posItems = buildPlPosItems(cart, options);
  const formattedTotal = formatAmount(
    posItems.reduce((sum, item) => sum + Number(item.Amt), 0),
    currency,
  );

  assertPlNonZeroTotal(formattedTotal);

  return {
    Tra: {
      ESR: {
        D: options?.orderDate ?? new Date().toISOString(),
        TL: options?.placeId ?? '',
        T: formattedTotal,
        OrderRef: `order_id:${orderId}`,
        Foot: buildPlFootLines(orderId),
        PosA: posItems,
        PayA: buildPlPayItems(cart, formattedTotal, options?.paymentTenders, options?.resolveFiscalGroup),
        TaxA: buildPlTaxItems(posItems, currency, options?.taxGroupToRate),
      },
    },
  };
}

export const PL_ERROR_CORRECTION_DEFAULT_REASON = 'Korekta błędu';

export const PL_RETURN_NON_FISCAL_TAG = 'RETURN';

export interface BuildPlRefundEsrRequestOptions {
  coupon?: Coupon | null;
  currency?: string;
  errorCorrectionReason?: string | null;
  nonFiscalTag?: string;
  originalDeclaredTotal?: number;
  placeId?: string;
  refundDate?: string;
  refundedQuantityByLineIndex?: ReadonlyMap<number, number>;
  taxGroupToRate?: Readonly<Record<string, number>>;
}

interface PlRefundSurcharge {
  amount: number;
  taxGroup: string;
}

interface PlRefundLine {
  articleNumber?: string;
  description: string;
  quantity: number;
  surcharge?: PlRefundSurcharge;
  taxGroup: string;
  ticketAmount: number;
}

function parsePlRefundAmount(totalAmount: string): number {
  if (typeof totalAmount !== 'string' || totalAmount.trim().length === 0) {
    throw new PlEsrMapError('EFR_PL_INVALID_REFUND_AMOUNT', String(totalAmount));
  }
  const total = Number(totalAmount);
  if (!Number.isFinite(total) || total < 0) {
    throw new PlEsrMapError('EFR_PL_INVALID_REFUND_AMOUNT', totalAmount);
  }
  return total;
}

function parsePlRefundQuantity(originalQuantity: number, refundedUnits: number | undefined, index: number): number {
  if (
    !Number.isFinite(originalQuantity) ||
    originalQuantity <= 0 ||
    refundedUnits == null ||
    !Number.isFinite(refundedUnits) ||
    refundedUnits <= 0 ||
    refundedUnits > originalQuantity
  ) {
    throw new PlEsrMapError('EFR_PL_INVALID_REFUND_QUANTITY', `line ${index}: ${refundedUnits} of ${originalQuantity}`);
  }
  return refundedUnits;
}

function getPlRefundedAmount(totalAmount: string, originalQuantity: number, refundedUnits: number): number {
  const total = parsePlRefundAmount(totalAmount);
  if (refundedUnits === originalQuantity) {
    return total;
  }
  return (total / originalQuantity) * refundedUnits;
}

function buildPlRefundLines(
  lineItems: readonly FiscalTransactionLineItem[],
  refundedQuantityByLineIndex?: ReadonlyMap<number, number>,
  taxGroupToRate?: Readonly<Record<string, number>>,
): PlRefundLine[] {
  const lines: PlRefundLine[] = [];

  for (let index = 0; index < lineItems.length; index++) {
    const lineItem = lineItems[index];
    if (refundedQuantityByLineIndex != null && !refundedQuantityByLineIndex.has(index)) {
      continue;
    }

    const requestedUnits = refundedQuantityByLineIndex != null ? refundedQuantityByLineIndex.get(index) : lineItem.quantity;
    const refundedUnits = parsePlRefundQuantity(lineItem.quantity, requestedUnits, index);

    polishTaxGroupToRate(lineItem.vat_rate, taxGroupToRate);

    const surchargeAmount = lineItem.surcharge_amount;
    const surchargeTaxGroup = lineItem.surcharge_vat_rate;
    const surcharge =
      surchargeAmount != null && surchargeTaxGroup != null
        ? {
            amount: getPlRefundedAmount(surchargeAmount, lineItem.quantity, refundedUnits),
            taxGroup: surchargeTaxGroup,
          }
        : undefined;

    if (surcharge != null) {
      polishTaxGroupToRate(surcharge.taxGroup, taxGroupToRate);
    }

    lines.push({
      articleNumber: lineItem.article_number,
      description: lineItem.description,
      quantity: refundedUnits,
      surcharge,
      taxGroup: lineItem.vat_rate,
      ticketAmount: getPlRefundedAmount(lineItem.amount, lineItem.quantity, refundedUnits),
    });
  }

  return lines;
}

function buildPlRefundLineBlocks(line: PlRefundLine, currency?: string): PlPositionBlock[] {
  const quantity = String(line.quantity);
  const ticketBlock: PlPositionBlock = {
    mods: [],
    position: {
      _: 'Pos',
      PN: '',
      IN: line.articleNumber,
      Dsc: toPlDescription(line.description),
      TaxG: line.taxGroup,
      Amt: formatAmount(line.ticketAmount, currency),
      Qty: quantity,
      Pri: buildPlUnitPrice(line.ticketAmount, line.quantity, currency),
    },
  };

  if (line.surcharge == null) {
    return [ticketBlock];
  }

  const surchargeBlock = buildPlSurchargeBlock(
    {
      amount: line.surcharge.amount,
      description: line.description,
      quantity,
      taxGroup: line.surcharge.taxGroup,
      unitCount: line.quantity,
    },
    currency,
  );
  return [ticketBlock, surchargeBlock];
}

function buildPlRefundPositionBlocks(lines: readonly PlRefundLine[], currency?: string): PlPositionBlock[] {
  return lines.flatMap(line => buildPlRefundLineBlocks(line, currency)).map(renumberPlBlock);
}

function buildPlProRatedRefundCoupon(
  coupon: Coupon,
  lineItems: readonly FiscalTransactionLineItem[],
  lines: readonly PlRefundLine[],
): Coupon | undefined {
  const originalGross = lineItems.reduce(
    (sum, lineItem) => sum + parsePlRefundAmount(lineItem.amount) + parsePlRefundAmount(lineItem.surcharge_amount ?? '0'),
    0,
  );
  if (originalGross <= 0) {
    return undefined;
  }

  const refundedGross = lines.reduce((sum, line) => sum + line.ticketAmount + (line.surcharge?.amount ?? 0), 0);
  const proRatedAmount = Math.abs(coupon.discount.amount) * (refundedGross / originalGross);
  if (proRatedAmount <= 0) {
    return undefined;
  }

  return { ...coupon, discount: { ...coupon.discount, amount: proRatedAmount } };
}

function sumPlBlocksGross(blocks: readonly PlPositionBlock[]): number {
  return blocks.reduce(
    (sum, block) => sum + Number(block.position.Amt) + block.mods.reduce((modSum, mod) => modSum + Number(mod.Amt), 0),
    0,
  );
}

function applyPlDerivedRefundDiscount(
  lineItems: readonly FiscalTransactionLineItem[],
  blocks: readonly PlPositionBlock[],
  originalDeclaredTotal: number,
  options?: BuildPlRefundEsrRequestOptions,
): PlPositionBlock[] {
  const originalGross = lineItems.reduce((sum, lineItem) => sum + Number(lineItem.amount) + Number(lineItem.surcharge_amount ?? 0), 0);
  if (!Number.isFinite(originalGross) || originalGross <= 0) {
    return [...blocks];
  }

  const derivedDiscount = originalGross - originalDeclaredTotal;
  if (!(derivedDiscount > 0)) {
    return [...blocks];
  }

  const proRatedDiscount = derivedDiscount * (sumPlBlocksGross(blocks) / originalGross);
  if (!(proRatedDiscount > 0)) {
    return [...blocks];
  }

  const currency = options?.currency;
  return applyPlDiscountToBlocks(
    {
      code: options?.coupon?.code ?? 'DISC',
      title: options?.coupon?.title,
      discount: new Money(proRatedDiscount, currency ?? options?.coupon?.discount?.currency ?? ''),
    } as Coupon,
    blocks,
    currency,
  );
}

function isPlFullRefund(
  lineItems: readonly FiscalTransactionLineItem[],
  refundedQuantityByLineIndex?: ReadonlyMap<number, number>,
): boolean {
  if (refundedQuantityByLineIndex == null) {
    return true;
  }
  return lineItems.every((lineItem, index) => refundedQuantityByLineIndex.get(index) === lineItem.quantity);
}

function assertPlRefundReconcilesWithDeclaredTotal(items: readonly EsrPosItem[], declaredTotal: number, currency?: string): void {
  const itemsSum = items.reduce((sum, item) => sum + Number(item.Amt), 0);
  const expected = formatAmount(-declaredTotal, currency);
  if (formatAmount(itemsSum, currency) !== expected) {
    throw new PlEsrMapError('EFR_PL_RECONCILIATION_FAILED', `PosA sum:${formatAmount(itemsSum, currency)} != declaredTotal:${expected}`);
  }
}

function negatePlRefundItem(item: EsrPosItem, currency?: string): EsrPosItem {
  const negatedAmount = formatAmount(-Number(item.Amt), currency);
  if (item._ === 'Mod') {
    return { ...item, Amt: negatedAmount };
  }
  return {
    ...item,
    Amt: negatedAmount,
    Qty: item.Qty != null ? String(-Number(item.Qty)) : undefined,
  };
}

export function buildPlRefundPosItems(
  lineItems: readonly FiscalTransactionLineItem[],
  options?: BuildPlRefundEsrRequestOptions,
): EsrPosItem[] {
  const currency = options?.currency;
  const lines = buildPlRefundLines(lineItems, options?.refundedQuantityByLineIndex, options?.taxGroupToRate);
  const blocks = buildPlRefundPositionBlocks(lines, currency);

  const coupon = options?.coupon;
  const proRatedCoupon =
    coupon != null && (coupon.discount?.amount ?? 0) > 0 ? buildPlProRatedRefundCoupon(coupon, lineItems, lines) : undefined;
  const mirroredCouponBlocks = proRatedCoupon != null ? applyPlDiscountToBlocks(proRatedCoupon, blocks, currency) : blocks;
  const mirrorsAPersistedCoupon = sumPlBlocksGross(mirroredCouponBlocks) !== sumPlBlocksGross(blocks);

  const originalDeclaredTotal = options?.originalDeclaredTotal;
  const derivesDiscountFromDeclaredTotal =
    originalDeclaredTotal != null && !mirrorsAPersistedCoupon && isPlFullRefund(lineItems, options?.refundedQuantityByLineIndex);
  const discountedBlocks = derivesDiscountFromDeclaredTotal
    ? applyPlDerivedRefundDiscount(lineItems, blocks, originalDeclaredTotal, options)
    : mirroredCouponBlocks;

  const items = flattenPlBlocks(discountedBlocks).map(item => negatePlRefundItem(item, currency));

  assertPlPositionSigns(items);
  if (derivesDiscountFromDeclaredTotal) {
    assertPlRefundReconcilesWithDeclaredTotal(items, originalDeclaredTotal, currency);
  }
  return items;
}

export function buildPlRefundEsrRequest(
  originalTransaction: FiscalTransactionResponse,
  options?: BuildPlRefundEsrRequestOptions,
): EsrRequest {
  const originalFiscalNumber = originalTransaction.fiscal_number;
  if (originalFiscalNumber == null || originalFiscalNumber.trim().length === 0) {
    throw new PlEsrMapError('EFR_PL_MISSING_ORIGINAL_FISCAL_NUMBER', `orderId:${originalTransaction.order_id}`);
  }

  const currency = options?.currency;
  const declaredTotal = originalTransaction.total != null ? Number(originalTransaction.total) : Number.NaN;
  const posItems = buildPlRefundPosItems(originalTransaction.line_items ?? [], {
    ...options,
    originalDeclaredTotal: options?.originalDeclaredTotal ?? (Number.isFinite(declaredTotal) ? declaredTotal : undefined),
  });
  if (posItems.length === 0) {
    throw new PlEsrMapError('EFR_PL_INVALID_REFUND_QUANTITY', 'no line items to refund');
  }

  const formattedTotal = formatAmount(
    posItems.reduce((sum, item) => sum + Number(item.Amt), 0),
    currency,
  );

  assertPlNonZeroTotal(formattedTotal);

  const payItems = buildPlRestatedPayItems(originalTransaction.amounts_per_payment_type ?? [], formattedTotal, currency, -1);

  return {
    Tra: {
      ESR: {
        D: options?.refundDate ?? new Date().toISOString(),
        TL: options?.placeId ?? '',
        T: formattedTotal,
        OrderRef: `order_id:${originalTransaction.order_id}`,
        Foot: buildPlFootLines(originalTransaction.order_id),
        ...(options?.errorCorrectionReason != null
          ? {
              Void: '1',
              Rsn: toPlDescription(
                options.errorCorrectionReason.trim().length > 0 ? options.errorCorrectionReason : PL_ERROR_CORRECTION_DEFAULT_REASON,
              ),
            }
          : { NF: options?.nonFiscalTag ?? PL_RETURN_NON_FISCAL_TAG }),
        RFN: originalFiscalNumber,
        PosA: posItems,
        PayA: payItems,
        TaxA: buildPlTaxItems(posItems, currency, options?.taxGroupToRate),
      },
    },
  };
}

export interface BuildPlReprintEsrRequestOptions {
  coupon?: Coupon | null;
  currency?: string;
  placeId?: string;
  taxGroupToRate?: Readonly<Record<string, number>>;
}

function resolvePlDeclaredTotal(originalTransaction: FiscalTransactionResponse, grossLineSum: number): number {
  const declaredTotal = originalTransaction.total != null ? Number(originalTransaction.total) : NaN;
  return Number.isFinite(declaredTotal) ? declaredTotal : grossLineSum;
}

function buildPlReprintPosItems(
  lineItems: readonly FiscalTransactionLineItem[],
  declaredTotal: number,
  options?: BuildPlReprintEsrRequestOptions,
): EsrPosItem[] {
  const currency = options?.currency;
  const lines = buildPlRefundLines(lineItems, undefined, options?.taxGroupToRate);
  const blocks = buildPlRefundPositionBlocks(lines, currency);

  const discountAmount = sumPlBlocksGross(blocks) - declaredTotal;

  const discountedBlocks =
    discountAmount > 0
      ? applyPlDiscountToBlocks(
          {
            code: options?.coupon?.code ?? 'DUP',
            title: options?.coupon?.title,
            discount: new Money(discountAmount, currency ?? options?.coupon?.discount?.currency ?? ''),
          } as Coupon,
          blocks,
          currency,
        )
      : blocks;

  const items = flattenPlBlocks(discountedBlocks);

  assertPlPositionSigns(items);
  assertPlReprintReconcilesWithDeclaredTotal(items, declaredTotal, currency);
  return items;
}

function assertPlReprintReconcilesWithDeclaredTotal(items: readonly EsrPosItem[], declaredTotal: number, currency?: string): void {
  const itemsSum = items.reduce((sum, item) => sum + Number(item.Amt), 0);
  if (formatAmount(itemsSum, currency) !== formatAmount(declaredTotal, currency)) {
    throw new PlEsrMapError(
      'EFR_PL_RECONCILIATION_FAILED',
      `PosA sum:${formatAmount(itemsSum, currency)} != declaredTotal:${formatAmount(declaredTotal, currency)}`,
    );
  }
}

function buildPlReprintTaxItems(
  originalTransaction: FiscalTransactionResponse,
  posItems: readonly EsrPosItem[],
  currency?: string,
  taxGroupToRate?: Readonly<Record<string, number>>,
): EsrTax[] {
  const persistedVatRates: readonly FiscalTransactionVatRate[] = originalTransaction.amounts_per_vat_rate ?? [];
  if (persistedVatRates.length === 0) {
    return buildPlTaxItems(posItems, currency, taxGroupToRate);
  }

  return persistedVatRates.map(vatRate => {
    if (vatRate.tax_rate == null || vatRate.tax_rate.trim().length === 0) {
      throw new PlEsrMapError('EFR_PL_INVALID_TAX_RATE', `missing tax_rate for rate:${vatRate.rate}`);
    }
    return {
      _: 'Tax' as const,
      TaxG: vatRate.rate,
      Prc: vatRate.tax_rate,
      Net: vatRate.net,
      TAmt: vatRate.tax,
      Amt: vatRate.gross,
    };
  });
}

function toPlRestatedPayItem(paymentType: FiscalTransactionPaymentType, amount: string): EsrPay {
  return {
    _: 'Pay',
    Dsc: toPlPaymentDescription(paymentType.type),
    PayG: mapPlPaymentDescriptionToPayGroup(paymentType.type),
    Amt: amount,
  };
}

export function buildPlRestatedPayItems(
  paymentTypes: readonly FiscalTransactionPaymentType[],
  formattedTotal: string,
  currency: string | undefined,
  sign: 1 | -1,
): EsrPay[] {
  const payItems: EsrPay[] = [];
  let isDeclarable = paymentTypes.length > 0;
  for (const paymentType of paymentTypes) {
    const amount = Number(paymentType.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      isDeclarable = false;
      break;
    }
    payItems.push(toPlRestatedPayItem(paymentType, formatAmount(sign * amount, currency)));
  }

  if (isDeclarable) {
    const declaredTotal = formatAmount(
      payItems.reduce((sum, payItem) => sum + Number(payItem.Amt), 0),
      currency,
    );
    if (declaredTotal === formattedTotal) {
      return payItems;
    }
  }

  return [toPlRestatedPayItem(paymentTypes[0] ?? { amount: formattedTotal, type: 'Cash' }, formattedTotal)];
}

export function buildPlReprintEsrRequest(
  originalTransaction: FiscalTransactionResponse,
  options?: BuildPlReprintEsrRequestOptions,
): EsrRequest {
  const originalFiscalNumber = originalTransaction.fiscal_number;
  if (originalFiscalNumber == null || originalFiscalNumber.trim().length === 0) {
    throw new PlEsrMapError('EFR_PL_MISSING_ORIGINAL_FISCAL_NUMBER', `orderId:${originalTransaction.order_id}`);
  }

  const currency = options?.currency;
  const lineItems = originalTransaction.line_items ?? [];
  const grossLineSum = lineItems.reduce((sum, item) => sum + Number(item.amount) + Number(item.surcharge_amount ?? 0), 0);
  const declaredTotal = resolvePlDeclaredTotal(originalTransaction, grossLineSum);

  const posItems = buildPlReprintPosItems(lineItems, declaredTotal, options);
  const formattedTotal = formatAmount(declaredTotal, currency);

  assertPlNonZeroTotal(formattedTotal);

  const payItems = buildPlRestatedPayItems(originalTransaction.amounts_per_payment_type ?? [], formattedTotal, currency, 1);

  return {
    Tra: {
      ESR: {
        D: new Date().toISOString(),
        TL: options?.placeId ?? '',
        T: formattedTotal,
        OrderRef: `order_id:${originalTransaction.order_id}`,
        Foot: buildPlFootLines(originalTransaction.order_id),
        NFS: 'DUP',
        RFN: originalFiscalNumber,
        PosA: posItems,
        PayA: payItems,
        TaxA: buildPlReprintTaxItems(originalTransaction, posItems, currency, options?.taxGroupToRate),
      },
    },
  };
}

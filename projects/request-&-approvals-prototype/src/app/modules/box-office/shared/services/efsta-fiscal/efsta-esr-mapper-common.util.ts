import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Coupon } from '@fz-original/app/shared/models/cart/coupon.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { FiscalLine } from '@fz-original/app/shared/models/order/fiscal-line.model';

import { EfstaFiscalGroupResolver } from './models/efsta-fiscal-group.model';

const ZERO_DECIMAL_CURRENCIES = new Set(['HUF']);

function getDecimalPlaces(currency?: string): number {
  return currency && ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2;
}

function roundToCurrency(amount: number, currency?: string): number {
  const factor = 10 ** getDecimalPlaces(currency);
  return Math.round(amount * factor) / factor;
}

export function formatAmount(amount: number, currency?: string): string {
  if (currency && ZERO_DECIMAL_CURRENCIES.has(currency)) {
    return String(Math.round(amount));
  }
  return amount.toFixed(2);
}

export const huPayGroupBankcard = 'Bankcard';
export const huPayGroupCash = 'Cash';
const huPayGroupSzechenyiCard = 'SZÉCHK';
const huPaymentDescriptionCard = 'Card';
const huPaymentDescriptionCash = 'Cash';
const huPaymentDescriptionSzechenyiCard = 'Széchenyi card';

const huPaymentDescriptionByPayGroup: ReadonlyMap<string, string> = new Map([
  [huPayGroupBankcard, huPaymentDescriptionCard],
  [huPayGroupSzechenyiCard, huPaymentDescriptionSzechenyiCard],
]);

const huPayGroupByPaymentDescription: ReadonlyMap<string, string> = new Map([
  ['Bankcard', huPayGroupBankcard],
  ['CreditCard', huPayGroupBankcard],
  ['DebitCard', huPayGroupBankcard],
  [huPaymentDescriptionCard, huPayGroupBankcard],
  [huPaymentDescriptionSzechenyiCard, huPayGroupSzechenyiCard],
]);

export interface EsrPayClassification {
  description: string;
  payGroup: string;
}

/** Without a resolver (no Hungarian fiscal profile) the default rule applies: `Cash`. */
export function classifyHuPayment(paymentMethod: string | undefined, resolveFiscalGroup?: EfstaFiscalGroupResolver): EsrPayClassification {
  const payGroup = resolveFiscalGroup?.(paymentMethod) ?? huPayGroupCash;
  return {
    description: huPaymentDescriptionByPayGroup.get(payGroup) ?? huPaymentDescriptionCash,
    payGroup,
  };
}

export function resolveHuPayGroupFromDescription(description: string): string {
  return huPayGroupByPaymentDescription.get(description) ?? huPayGroupCash;
}

export function getLineTotal(session: CartSession): number {
  const unitPrice = session.unitPrice?.amount ?? 0;
  const surchargePerTicket = session.surchargePerTicket?.amount ?? 0;
  return (unitPrice + surchargePerTicket) * session.units;
}

/**
 * Distributes `totalDiscount` across keyed buckets proportionally to each bucket's `base`, then
 * clamps and cascades the rounding remainder onto the buckets with the most headroom
 * (`base + assignedDiscount`). Both guarantees below require `totalDiscount` to be zero or to
 * carry the sign opposite to `sum(bases)`, and `|totalDiscount| <= |sum(bases)|`. Under those two
 * conditions the allocations sum to exactly `totalDiscount`, and every allocation moves its bucket
 * towards zero without crossing it, so `base + assignedDiscount` stays between `0` and `base` for
 * bases of either sign. Outside them neither guarantee holds: the proportional split is unbounded,
 * so a bucket can grow away from zero or cross it. Insertion order of `basesByKey` is the
 * tie-break.
 */
export function distributeDiscountByHeadroom(
  totalDiscount: number,
  basesByKey: ReadonlyMap<string, number>,
  currency?: string,
): Map<string, number> {
  const keys = [...basesByKey.keys()];
  const totalBase = keys.reduce((sum, key) => sum + (basesByKey.get(key) ?? 0), 0);

  const discountByKey = new Map<string, number>(
    keys.map(key => [key, totalBase !== 0 ? roundToCurrency(totalDiscount * ((basesByKey.get(key) ?? 0) / totalBase), currency) : 0]),
  );

  const allocated = keys.reduce((sum, key) => sum + (discountByKey.get(key) ?? 0), 0);
  let remainder = roundToCurrency(totalDiscount - allocated, currency);

  const headroomOf = (key: string): number => (basesByKey.get(key) ?? 0) + (discountByKey.get(key) ?? 0);
  const keysByDescendingHeadroom = [...keys].sort((a, b) => headroomOf(b) - headroomOf(a));
  for (const key of keysByDescendingHeadroom) {
    if (remainder === 0) {
      break;
    }
    const currentDiscount = discountByKey.get(key) ?? 0;
    const base = basesByKey.get(key) ?? 0;
    const bound = remainder < 0 ? -Math.max(0, base) : Math.max(0, -base);
    const capacity = bound - currentDiscount;
    if (remainder < 0 ? capacity >= 0 : capacity <= 0) {
      continue;
    }
    const applied = remainder < 0 ? Math.max(capacity, remainder) : Math.min(capacity, remainder);
    discountByKey.set(key, roundToCurrency(currentDiscount + applied, currency));
    remainder = roundToCurrency(remainder - applied, currency);
  }

  return discountByKey;
}

export type FiscalLinesByTicketId = ReadonlyMap<number, readonly FiscalLine[]>;

export interface BuildEsrRequestOptions {
  fiscalLinesByTicketId?: FiscalLinesByTicketId;
  taxRateBySessionTypeId?: Map<number, number>;
  productTypeBySessionTypeId?: Map<number, string>;
  surchargeTaxRateBySessionTypeId?: Map<number, number>;
  placeId?: string;
  orderDate?: string;
  paidDepositAmount?: Money | null;
  resolveFiscalGroup?: EfstaFiscalGroupResolver;
}

export interface BuildRefundEsrRequestOptions {
  /** Coupon of the original sale; on a partial HU return it bounds the declared discount that is replayed. */
  coupon?: Coupon | null;
  placeId?: string;
  currency?: string;
  refundedQuantityByLineIndex?: ReadonlyMap<number, number>;
}

export function sortSessionsForFiscalMapping(cart: Cart): CartSession[] {
  const all: CartSession[] = [];
  for (const sessions of cart.sessionItemsByDatetime.values()) {
    for (const session of sessions) {
      all.push(session);
    }
  }
  all.sort((a, b) => {
    const aId = a.ticketId ?? Number.POSITIVE_INFINITY;
    const bId = b.ticketId ?? Number.POSITIVE_INFINITY;
    if (aId !== bId) return aId - bId;
    const aDt = a.sessionStartAt ?? '';
    const bDt = b.sessionStartAt ?? '';
    return aDt < bDt ? -1 : aDt > bDt ? 1 : 0;
  });
  return all;
}

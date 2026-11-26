import type { DecimalAmount } from '../../core/models/money/decimal-amount';
import type { Money } from '../../core/models/money/money.model';
import type {
  CartAdjustmentPriceApi,
  CartAdjustmentRoundingApi,
  CartApi,
  CartSessionAdjustmentPriceApi,
  CartSessionApi,
  CartSessionItemLineApi,
  CartTaxItemApi,
  MoneyApi,
} from '../models/api/cart.model';
import type {
  CartAdjustmentPrice,
  CartAdjustmentPriceCalculation,
  CartAdjustmentPriceOperation,
  CartAdjustmentRounding,
  CartSessionAdjustmentPrice,
} from '../models/cart-adjustment-price.model';
import type { CartSessionItemLine } from '../models/cart-session-item-line.model';
import type { CartSession, CartSessionType } from '../models/cart-session.model';
import type { CartTaxItem } from '../models/cart-tax-item.model';
import { PRODUCTS_GROUP_KEY, type Cart } from '../models/cart.model';

function sessionKey(session: CartSessionApi): string {
  if (session.is_shop_product === true) {
    return PRODUCTS_GROUP_KEY;
  }

  return session.start_date ?? `session:${session.id}`;
}

const CALCULATIONS: readonly string[] = ['fixed', 'percentage', 'final'];
const OPERATIONS: readonly string[] = ['add', 'subtract'];

/**
 * Finiteness is not enough: `String()` renders a finite number in exponential notation once it reaches
 * 1e21 or falls below 1e-6, and `"1e+21"` is not a `DecimalAmount` — every function in
 * `core/models/money/decimal-amount` throws on it. Rejecting here keeps `adaptWireAmount`'s promise true, so a
 * consumer that compares or adds a price cannot be handed a string the money primitives refuse.
 */
function isUsableWireAmount(amount: number): boolean {
  return typeof amount === 'number' && Number.isFinite(amount) && !String(amount).includes('e');
}

function adaptWireAmount(amount: number): DecimalAmount {
  return String(amount);
}

function adaptMoneyApi(money: MoneyApi): Money | null {
  if (!isUsableWireAmount(money.amount)) {
    return null;
  }

  return { amount: adaptWireAmount(money.amount), currency: money.currency };
}

function adaptOptionalMoneyApi(money: MoneyApi | null | undefined): Money | null {
  return money === undefined || money === null ? null : adaptMoneyApi(money);
}

function adaptAdjustmentPriceApi(adjustment: CartSessionAdjustmentPriceApi): CartSessionAdjustmentPrice | null {
  const totalPriceWithoutOverride = adaptMoneyApi(adjustment.total_price_without_override);
  const totalPriceWithOverride = adaptMoneyApi(adjustment.total_price_with_override);
  const totalSurchargeWithoutOverride = adaptMoneyApi(adjustment.total_surcharge_without_override);
  const totalSurchargeWithOverride = adaptMoneyApi(adjustment.total_surcharge_with_override);

  if (
    totalPriceWithoutOverride === null ||
    totalPriceWithOverride === null ||
    totalSurchargeWithoutOverride === null ||
    totalSurchargeWithOverride === null
  ) {
    return null;
  }

  return { totalPriceWithoutOverride, totalPriceWithOverride, totalSurchargeWithoutOverride, totalSurchargeWithOverride };
}

function adaptRoundingApi(rounding: CartAdjustmentRoundingApi | undefined): CartAdjustmentRounding | undefined {
  if (rounding === undefined) {
    return undefined;
  }

  const amount = adaptMoneyApi(rounding.amount);

  return amount === null ? undefined : { amount };
}

function adaptCartAdjustmentApi(adjustment: CartAdjustmentPriceApi): CartAdjustmentPrice {
  return {
    amount: adjustment.amount,
    calculation: (CALCULATIONS.includes(adjustment.calculation) ? adjustment.calculation : 'fixed') as CartAdjustmentPriceCalculation,
    concept: adjustment.concept,
    couponCode: adjustment.coupon_code,
    id: adjustment.id,
    operation: OPERATIONS.includes(adjustment.operation ?? '') ? (adjustment.operation as CartAdjustmentPriceOperation) : undefined,
    rounded: adaptRoundingApi(adjustment.rounded),
    total: adaptOptionalMoneyApi(adjustment.total) ?? undefined,
  };
}

function adaptTaxItemApi(taxItem: CartTaxItemApi): CartTaxItem | null {
  const taxAmount = adaptMoneyApi(taxItem.tax_amount);

  return taxAmount === null ? null : { taxAmount, taxName: taxItem.tax_name };
}

function adaptSessionTypeApi(session: CartSessionApi): CartSessionType | undefined {
  if (session.session_type !== undefined) {
    return {
      id: session.session_type.id,
      isEntryPass: session.session_type.is_entry_pass,
      isShopProduct: session.session_type.is_shop_product,
      label: session.session_type.label,
      ticketReceiptLabel: session.session_type.ticket_receipt_label,
    };
  }

  return session.session_type_id === undefined ? undefined : { id: session.session_type_id };
}

function adaptSessionItemLines(sessionItemLines: CartSessionItemLineApi[] | undefined): CartSessionItemLine[] {
  return (sessionItemLines ?? []).map((line: CartSessionItemLineApi) => ({
    id: line.id,
    mainPlanId: line.main_plan_id,
    parent: line.parent,
    sessionId: line.session_id,
  }));
}

export function adaptCartSessionApi(session: CartSessionApi): CartSession {
  return {
    bundleDiscount: adaptOptionalMoneyApi(session.bundle_discount),
    hasSeating: (session.seats?.length ?? 0) > 0 || (session.seat_references?.length ?? 0) > 0,
    isAddOn: session.is_add_on,
    isPack: session.is_pack,
    isShopProduct: session.is_shop_product,
    mainPlanId: session.main_plan_id,
    overridePrices:
      session.override_prices === undefined || session.override_prices === null
        ? undefined
        : (adaptAdjustmentPriceApi(session.override_prices) ?? undefined),
    placeId: session.place_id,
    price: adaptOptionalMoneyApi(session.price),
    seats: session.seat_references ?? session.seats ?? null,
    sessionId: session.id,
    sessionName: session.title,
    sessionNameWithoutFormat: session.title_without_format,
    sessionStartAt: session.start_date,
    sessionTimezone: session.timezone,
    sessionType: adaptSessionTypeApi(session),
    sourceSessionTypeId: session.source_session_type_id ?? null,
    surchargePerTicket: adaptOptionalMoneyApi(session.surcharge_per_ticket),
    totalStrikethroughPrice: adaptOptionalMoneyApi(session.total_strikethrough_price) ?? undefined,
    totalSurchargePerTicket: adaptOptionalMoneyApi(session.total_surcharge_per_ticket),
    unitPrice: adaptOptionalMoneyApi(session.unit_price),
    units: session.units,
    userConfirmationMessages: session.user_confirmation_messages ?? null,
  };
}

export function adaptCartApi(cart: CartApi): Cart {
  const sessionItemsByDatetime = new Map<string, CartSession[]>();

  for (const session of cart.session_items) {
    const key = sessionKey(session);
    sessionItemsByDatetime.set(key, [...(sessionItemsByDatetime.get(key) ?? []), adaptCartSessionApi(session)]);
  }

  const zoned = cart.session_items.find((session: CartSessionApi) => session.timezone !== undefined);
  const sessions = [...sessionItemsByDatetime.values()].flat();

  return {
    adjustment: cart.adjustment === undefined || cart.adjustment === null ? null : adaptCartAdjustmentApi(cart.adjustment),
    confirmedAt: cart.confirmed_at ?? null,
    createdAt: cart.created_at ?? null,
    hasSeating: sessions.some((session: CartSession) => session.hasSeating === true),
    hasSessionsInFuture: cart.session_items.some(
      (session: CartSessionApi) => session.is_shop_product !== true && session.start_date !== undefined,
    ),
    id: cart.id,
    isFlexibleBundle: cart.is_flexible_bundle === true,
    numberOfTickets: cart.number_of_tickets,
    preparedAt: cart.prepared_at ?? null,
    sessionItemLines: adaptSessionItemLines(cart.session_item_lines),
    sessionItemsByDatetime,
    taxItems: cart.tax_items?.map(adaptTaxItemApi).filter((taxItem: CartTaxItem | null): taxItem is CartTaxItem => taxItem !== null),
    timezone: cart.timezone ?? zoned?.timezone,
    total: adaptOptionalMoneyApi(cart.total),
    totalBundleDiscount:
      (cart.total_bundle_discount?.amount ?? 0) > 0 && (cart.total_bundle_discount?.currency ?? '') !== ''
        ? adaptOptionalMoneyApi(cart.total_bundle_discount)
        : null,
    totalSurcharge: adaptOptionalMoneyApi(cart.total_surcharge),
    totalSurchargePerTicket: adaptOptionalMoneyApi(cart.total_surcharge_per_ticket),
    totalTaxBase: adaptOptionalMoneyApi(cart.total_tax_base) ?? undefined,
    totalTicketsWithoutDiscounts: adaptOptionalMoneyApi(cart.total_tickets_without_discounts),
    totalWithoutDiscount: adaptOptionalMoneyApi(cart.total_without_discount),
    totalWithoutOverride: adaptOptionalMoneyApi(cart.total_without_override),
    userConfirmationMessages: cart.user_confirmation_messages ?? null,
  };
}

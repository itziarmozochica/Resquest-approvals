import { PlanDiscount, PlanDiscountType } from '@fz-original/app/modules/box-office/memberships/models/memberships.model';
import {
  calculateAutoAppliedPlanDiscountsInfo,
  calculateTotalDiscount,
} from '@fz-original/app/modules/box-office/memberships/utils/memberships.utils';
import { StripeKeys } from '@fz-original/environments/environment.model';

import { PaymentType } from '../../../modules/box-office/checkout/models/payment-type.enum';
import { CartAdjustmentPrice, CartAdjustmentPriceData } from '../../cart/models/cart-adjustment-price.model';
import { fixedDecimals, sumMoneys } from '../../utils/number.util';
import { Channel } from '../channel/channel.model';
import { Deposit, DepositData } from '../deposit/deposit.model';
import { Money } from '../money.model';
import {
  isAddOnPricedFromTheRestOfTheCart,
  isAddOnPricedPerIndividualTicket,
  isTransactionFeeSessionType,
} from '../session-type/session-type.util';
import { CartSeatingInfo } from './cart-seating-info';
import { CartSessionItemLine, CartSessionItemLineData } from './cart-session-item-line.model';
import { CartSession, CartSessionData, CartSessionPriceCalculation, GroupRuleViolation, UnmemberedCartSession } from './cart-session.model';
import { Coupon } from './coupon.model';
import { Coupons } from './coupons.model';
import { Promotion } from './promotion.model';

// Key used in `sessionItemsByDatetime` for shop product lines, which have no session datetime
export const PRODUCTS_GROUP_KEY = 'products';

export interface CartData {
  adjustment?: CartAdjustmentPriceData | null;
  channel_id?: string;
  channel_name?: Channel;
  confirmed_at?: string | null;
  coupon?: Coupon | null;
  created_at?: string | null;
  deposit?: DepositData;
  id?: string;
  is_flexible_bundle?: boolean;
  number_of_tickets?: number;
  prepared_at?: string | null;
  product_serving_times?: CartDataProductServingTime[];
  session_item_lines?: CartSessionItemLineData[];
  session_items: CartSessionData[];
  tax_items?: CartDataTaxItem[];
  timezone?: string;
  total?: Money;
  total_bundle_discount?: Money;
  total_surcharge?: Money;
  total_surcharge_per_ticket?: Money;
  total_tax_base?: Money;
  total_tickets_without_discounts?: Money;
  total_without_discount?: Money;
  total_without_override?: Money;
  user_confirmation_messages?: string[] | null;
  user_id?: number;
}

export interface CartDataProductServingTime {
  serving_at: string | null;
  session_id: number;
}

export interface CartDataTaxItem {
  tax_amount: Money;
  tax_name: string;
}

export interface CartTaxItem {
  taxAmount: Money;
  taxName: string;
}

export type UnmemberedCart = Omit<
  Cart,
  | 'numberOfTicketCounts'
  | 'sessionItemsByDatetime'
  | 'clone'
  | 'hasSameContent'
  | 'haveSameTimeSlot'
  | 'haveSameTicketTypes'
  | 'getSeatingInfo'
  | 'getNumberOfTicketCounts'
  | 'getNumberOfTicketAndProductCounts'
  | 'getTimeslotsViolatingGroupRules'
  | 'getBundleDiscountTotal'
  | 'getTotalBeforeCoupon'
  | 'calculateTotal'
  | 'calculateCartSessionPrice'
  | 'getCartSessionPrice'
  | 'getSessionItemsByMainPlanAndDatetime'
>;

/**
 * Even though the IXxx naming convention is bad practice.
 * We will use it here to point to and interface from which
 * we will stripe out the "I" in the near future.
 *
 * ICart will become Cart
 */
export interface ICart extends UnmemberedCart {
  id: string;
  sessionItemsByDatetime: Map<string, CartSession[]> | Map<string, UnmemberedCartSession[]>;
}

/**
 * @todo migrate Cart methods to the cart service
 *
 * Cart should be an interface, not a class.
 */
export interface CartGroupRuleViolation extends GroupRuleViolation {
  datetime: string;
}

/**
 * Cart-wide keys are opt-in per caller. Only the reservations ticket selector asks for them: the
 * box-office surfaces share this gate and must keep behaving as they do today, so a footprint key
 * they carry is never evaluated unless its consumer asked to evaluate it.
 */
export interface CartGroupRuleOptions {
  includesCartWideKeys?: boolean;
}

function isBefore(someDatetime: string, otherDatetime: string): boolean {
  const someMs = Date.parse(someDatetime);
  const otherMs = Date.parse(otherDatetime);
  if (Number.isNaN(someMs) || Number.isNaN(otherMs)) {
    return someDatetime < otherDatetime;
  }
  return someMs < otherMs;
}

export class Cart {
  numberOfTicketCounts?: number;

  constructor(
    public sessionItemsByDatetime: Map<string, CartSession[]> = new Map(),
    public timezone?: string,
    public id?: string,
    public numberOfTickets?: number,
    public total?: Money | null,
    public totalSurcharge?: Money | null,
    public totalSurchargePerTicket?: Money | null,
    public userConfirmationMessages?: string[] | null,
    public createdAt?: string | null,
    public preparedAt?: string | null,
    public confirmedAt?: string | null,
    public userId?: number | null,
    public appliedCoupon?: Coupon | null,
    public channel?: Channel | null,
    public hasSessionsInFuture: boolean = false,
    public hasSeating: boolean = false,
    public paymentMethod?: PaymentType,
    public locale?: string,
    public totalTaxBase?: Money,
    public taxItems?: CartTaxItem[],
    public adjustment?: CartAdjustmentPrice | null,
    public totalWithoutOverride?: Money | null,
    public totalWithoutDiscount?: Money | null,
    public deposit?: Deposit | null,
    public autoAppliedCouponCode?: string | null,
    public appliedPromotion?: Promotion | null,
    public coupons?: Coupons,
    public totalTicketsWithoutDiscounts?: Money | null,
    public sessionItemLines: CartSessionItemLine[] = [],
    public appliedPlanDiscounts?: PlanDiscount[] | null,
    public servingTimesBySessionId?: ReadonlyMap<number, string>,
    public isFlexibleBundle: boolean = false,
    public totalBundleDiscount?: Money | null,
  ) {}

  /**
   * Should be a private method in service.
   */
  calculateCartSessionPrice(cartSession: CartSession, planDiscounts?: PlanDiscount[] | null): CartSessionPriceCalculation {
    if (cartSession.unitPrice == null) {
      throw new Error('Session price cannot be calculated without a unit price.');
    }

    const originalUnitPrice = cartSession.unitPrice;
    let unitPriceToUse = originalUnitPrice;
    const ticketsPricingTheLine = countTicketsPricingTheLine(this.sessionItemsByDatetime, cartSession);
    let planDiscount: PlanDiscount | undefined;

    if (planDiscounts != null) {
      // TODO: Fixme when multiple coupons are available
      planDiscount = planDiscounts.find(discount => discount.ticketTypeId === cartSession.sessionType?.id);
      const autoAppliedPlanDiscountsInfo =
        planDiscount != null
          ? calculateAutoAppliedPlanDiscountsInfo(planDiscount.discount, planDiscount.discountType, originalUnitPrice)
          : undefined;
      if (autoAppliedPlanDiscountsInfo != null) {
        unitPriceToUse = autoAppliedPlanDiscountsInfo.unitPriceWithDiscount;
      }
      // The cart detail multiplies these unit prices by the units only, so they carry the per-ticket scaling below.
      cartSession.autoAppliedPlanDiscountsInfo =
        autoAppliedPlanDiscountsInfo != null && ticketsPricingTheLine !== 1
          ? {
              ...autoAppliedPlanDiscountsInfo,
              unitPriceWithDiscount: this.getCartSessionPrice(ticketsPricingTheLine, autoAppliedPlanDiscountsInfo.unitPriceWithDiscount),
              unitPriceWithoutDiscount: this.getCartSessionPrice(
                ticketsPricingTheLine,
                autoAppliedPlanDiscountsInfo.unitPriceWithoutDiscount,
              ),
            }
          : autoAppliedPlanDiscountsInfo;
    }

    if (ticketsPricingTheLine !== 1) {
      // The backend prices one unit of these add-ons for every ticket of the cart (B2BO-9343).
      unitPriceToUse = this.getCartSessionPrice(ticketsPricingTheLine, unitPriceToUse);
    }

    const bundleDiscount = cartSession.bundleDiscount?.amount ?? 0;
    const price: Money =
      planDiscount != null && bundleDiscount > 0
        ? getBundledLinePriceAfterPlanDiscount(cartSession.units * ticketsPricingTheLine, originalUnitPrice, bundleDiscount, planDiscount)
        : this.getCartSessionPrice(cartSession.units, unitPriceToUse);
    // The backend leaves the add-ons priced from the rest of the cart out of the cart surcharge (B2BO-9343).
    const surchargePerTicket =
      cartSession.surchargePerTicket != null && isAddOnPricedFromTheRestOfTheCart(cartSession.sessionType)
        ? new Money(0, cartSession.surchargePerTicket.currency)
        : cartSession.surchargePerTicket;
    const totalSurchargePerTicket: Money | undefined =
      surchargePerTicket != null ? this.getCartSessionPrice(cartSession.units, surchargePerTicket) : undefined;
    return {
      currency: price.currency as keyof StripeKeys | string,
      price,
      surchargePerTicket,
      total: totalSurchargePerTicket === undefined ? price : sumMoneys(price, totalSurchargePerTicket),
      totalSurchargePerTicket,
    };
  }

  /**
   * Calculates total.
   * We need this method when
   * cart total is undefined.
   */
  calculateTotal(coupon?: Coupon, planDiscounts: PlanDiscount[] | null | undefined = this.appliedPlanDiscounts): Money {
    let totalPrice = 0;
    let priceCurrency: keyof StripeKeys | string = '';
    this.sessionItemsByDatetime.forEach((cartSessions: CartSession[]) =>
      cartSessions.forEach((cartSession: CartSession) => {
        const { currency, price, surchargePerTicket, total, totalSurchargePerTicket } = this.calculateCartSessionPrice(
          cartSession,
          planDiscounts,
        );
        /**
         * Since sessions have their own object instance,
         * mutability there is needed.
         */
        cartSession.price = price;
        cartSession.total = total;
        // The cart panels show the booking fee row from the per-ticket surcharge, so it follows the total.
        cartSession.surchargePerTicket = surchargePerTicket;
        cartSession.totalSurchargePerTicket = totalSurchargePerTicket;
        totalPrice += total?.amount ?? 0;
        if (priceCurrency.length === 0) {
          priceCurrency = currency;
        }
      }),
    );
    const taxTotal = this.taxItems?.reduce((sum, taxItem) => sum + (taxItem.taxAmount?.amount || 0), 0) || 0;
    totalPrice += taxTotal;

    this.totalWithoutDiscount = new Money(fixedDecimals(totalPrice, 3), priceCurrency);
    // A bundled line keeps its undiscounted unit price, so its discount comes off here, before the coupon.
    totalPrice -= this.getBundleDiscountTotal();
    /**
     * Coupon can be also null or undefined.
     */
    if (coupon != null) {
      totalPrice -= coupon.discount.amount;
    }
    this.total = new Money(fixedDecimals(totalPrice, 3), priceCurrency);
    return this.total;
  }

  getBundleDiscountTotal(): number {
    return [...(this.sessionItemsByDatetime?.values() ?? [])]
      .flat()
      .reduce((sum: number, cartSession: CartSession) => sum + (cartSession.bundleDiscount?.amount ?? 0), 0);
  }

  /**
   * The most a coupon can cover. `totalWithoutDiscount` is the gross the cart strikes through, which a bundle
   * leaves above what is actually owed, so capping a gift card against it would overpay the difference.
   * Call it after `calculateTotal`, which is what fills the gross.
   */
  getTotalBeforeCoupon(): number {
    return fixedDecimals((this.totalWithoutDiscount?.amount ?? 0) - this.getBundleDiscountTotal(), 3);
  }

  clone(): Cart {
    const clonedSessionItemsByDatetime = new Map<string, CartSession[]>();
    this.sessionItemsByDatetime?.forEach((sessions, datetime) => {
      clonedSessionItemsByDatetime.set(
        datetime,
        sessions.map(session => session.clone()),
      );
    });

    return new Cart(
      clonedSessionItemsByDatetime,
      this.timezone,
      this.id,
      this.numberOfTickets,
      this.total,
      this.totalSurcharge,
      this.totalSurchargePerTicket,
      this.userConfirmationMessages,
      this.createdAt,
      this.preparedAt,
      this.confirmedAt,
      this.userId,
      this.appliedCoupon,
      this.channel,
      this.hasSessionsInFuture,
      this.hasSeating,
      this.paymentMethod,
      this.locale,
      this.totalTaxBase,
      this.taxItems,
      this.adjustment,
      this.totalWithoutOverride,
      this.totalWithoutDiscount,
      this.deposit,
      this.autoAppliedCouponCode,
      this.appliedPromotion,
      this.coupons,
      this.totalTicketsWithoutDiscounts,
      [...this.sessionItemLines],
      this.appliedPlanDiscounts,
      this.servingTimesBySessionId ? new Map(this.servingTimesBySessionId) : undefined,
      this.isFlexibleBundle,
      this.totalBundleDiscount,
    );
  }

  /**
   * Should be a private method in service.
   */
  getCartSessionPrice(units: number, price: Money): Money {
    const amountWithFixedDecimals: number = fixedDecimals(units * price.amount, 3);
    return new Money(amountWithFixedDecimals, price.currency);
  }

  getNumberOfTicketAndProductCounts(includeWithIgnoreCapacity: boolean = true): number {
    let numberOfTicketAndProductCounts = 0;
    this.sessionItemsByDatetime.forEach(cartSession => {
      cartSession.forEach(cartSession => {
        if (includeWithIgnoreCapacity || !cartSession.sessionType?.ignoreTimeSlotCapacity) {
          numberOfTicketAndProductCounts += cartSession.units;
        }
      });
    });
    this.numberOfTicketCounts = numberOfTicketAndProductCounts;
    return numberOfTicketAndProductCounts;
  }

  getNumberOfTicketCounts(includeWithIgnoreCapacity: boolean = true): number {
    let numberOfTicketCounts = 0;
    this.sessionItemsByDatetime.forEach(cartSession => {
      cartSession.forEach(cartSession => {
        if (cartSession.sessionType?.isShopProduct) {
          return;
        }
        if (includeWithIgnoreCapacity || !cartSession.sessionType?.ignoreTimeSlotCapacity) {
          numberOfTicketCounts += cartSession.units;
        }
      });
    });
    this.numberOfTicketCounts = numberOfTicketCounts;
    return numberOfTicketCounts;
  }

  getTimeslotsViolatingGroupRules({ includesCartWideKeys = false }: CartGroupRuleOptions = {}): CartGroupRuleViolation[] {
    const violations: CartGroupRuleViolation[] = [];
    const allCartSessions: CartSession[] = [];
    const earliestDatetimeByGroupKey = new Map<string, string>();

    this.sessionItemsByDatetime.forEach((cartSessions, datetime) => {
      CartSession.getGroupRuleViolations(cartSessions as CartSession[], 'bucketed').forEach(violation => {
        violations.push({ datetime, ...violation });
      });
      if (!includesCartWideKeys) {
        return;
      }
      (cartSessions as CartSession[]).forEach(cartSession => {
        allCartSessions.push(cartSession);
        cartSession.sharedAvailabilityRule?.itemTypesSharingAvailabilityAllOf.forEach(itemType => {
          if (itemType.isCartWide !== true) {
            return;
          }
          const earliestDatetime = earliestDatetimeByGroupKey.get(itemType.type);
          if (earliestDatetime === undefined || isBefore(datetime, earliestDatetime)) {
            earliestDatetimeByGroupKey.set(itemType.type, datetime);
          }
        });
      });
    });

    CartSession.getGroupRuleViolations(allCartSessions, 'cartWide').forEach(violation => {
      violations.push({ datetime: earliestDatetimeByGroupKey.get(violation.type) ?? '', ...violation });
    });

    return violations;
  }

  getSeatingInfo(): CartSeatingInfo {
    let numberOfSeats = 0;
    const sessionIds: number[] = [];
    this.sessionItemsByDatetime.forEach(cartSessions => {
      cartSessions.forEach(cartSession => {
        const isSeatedSession = cartSession.hasSeating ?? (cartSession.seatingProvider != null || (cartSession.seats?.length ?? 0) > 0);
        if (isSeatedSession) {
          sessionIds.push(cartSession.sessionId);
          numberOfSeats += cartSession.units;
        }
      });
    });
    return { sessionIds: [...new Set(sessionIds)], numberOfSeats };
  }

  getSessionItemsByMainPlanAndDatetime(): Map<number, Map<string, CartSession[]>> {
    const sessionItemsByMainPlanAndDatetime = new Map<number, Map<string, CartSession[]>>();

    this.sessionItemsByDatetime.forEach((sessionItems, datetime) => {
      sessionItems.forEach(sessionItem => {
        if (!sessionItem.mainPlanId) {
          return;
        }

        if (!sessionItemsByMainPlanAndDatetime.has(sessionItem.mainPlanId)) {
          sessionItemsByMainPlanAndDatetime.set(sessionItem.mainPlanId, new Map<string, CartSession[]>());
        }
        const mainPlanSessionsByDatetime: Map<string, CartSession[]> = sessionItemsByMainPlanAndDatetime.get(sessionItem.mainPlanId)!;

        if (!mainPlanSessionsByDatetime.has(datetime)) {
          mainPlanSessionsByDatetime.set(datetime, []);
        }
        const mainPlanDatetimeSessions: CartSession[] = mainPlanSessionsByDatetime.get(datetime)!;

        mainPlanDatetimeSessions.push(sessionItem);
      });
    });

    return sessionItemsByMainPlanAndDatetime;
  }

  hasSameContent(cartB: Cart | null): boolean {
    let sameCarts = true;
    if (cartB === null) {
      return false;
    }
    if (this.sessionItemsByDatetime.size !== cartB.sessionItemsByDatetime.size) {
      return false;
    }
    this.sessionItemsByDatetime.forEach((cartSessions: CartSession[], datetime: string) => {
      const sessionItemsByDatetimeB: CartSession[] = this.sessionItemsByDatetime.get(datetime) ?? [];
      const nonConfirmedCartSessionsByDatetime: CartSession[] = cartB.sessionItemsByDatetime.get(datetime) ?? [];

      if (nonConfirmedCartSessionsByDatetime.length === 0 || sessionItemsByDatetimeB.length === 0) {
        sameCarts = false;
        return;
      }

      const cartSessionIds: number[] = sessionItemsByDatetimeB.map((cartSession: CartSession) => cartSession.sessionId);
      const nonCartSessionIds: number[] = nonConfirmedCartSessionsByDatetime.map(cartSession => cartSession.sessionId);
      if (nonCartSessionIds.length !== cartSessionIds.length) {
        sameCarts = false;
        return;
      }
      cartSessionIds.forEach((cartSessionId: number, index: number) => {
        if (!nonCartSessionIds.includes(cartSessionId)) {
          sameCarts = false;
          return;
        }
        const cartAUnits: number | undefined = this.sessionItemsByDatetime.get(datetime)?.[index].units;
        const cartBIndex: number = nonCartSessionIds.indexOf(cartSessionId);
        const cartBUnits: number | undefined = cartB.sessionItemsByDatetime.get(datetime)?.[cartBIndex].units;
        if (![cartAUnits, cartBUnits].includes(undefined) && cartAUnits !== cartBUnits) {
          sameCarts = false;
          return;
        }
        const cartASeats: string[] = this.sessionItemsByDatetime.get(datetime)?.[index].seats ?? [];
        const cartBSeats: string[] = cartB.sessionItemsByDatetime.get(datetime)?.[cartBIndex].seats ?? [];
        if (!areSeatsEqual(cartASeats, cartBSeats)) {
          sameCarts = false;
          return;
        }
        const cartASession: CartSession | undefined = this.sessionItemsByDatetime.get(datetime)?.[index];
        const cartBSession: CartSession | undefined = cartB.sessionItemsByDatetime.get(datetime)?.[cartBIndex];
        if (!isSameManualPrice(cartASession, cartBSession)) {
          sameCarts = false;
          return;
        }
      });
    });
    return sameCarts;
  }

  haveSameTicketTypes(cartToCompare: Cart): boolean {
    const ownTicketTypes = new Set(
      Array.from(this.sessionItemsByDatetime.values())
        .reduce((acc, val) => acc.concat(val), [] as CartSession[])
        .map((session: CartSession) => session.sessionType?.id),
    );

    const ticketTypesToCompare = new Set(
      Array.from(cartToCompare.sessionItemsByDatetime.values())
        .reduce((acc, val) => acc.concat(val), [] as CartSession[])
        .map((session: CartSession) => session.sessionType?.id),
    );

    if (ownTicketTypes.size !== ticketTypesToCompare.size) {
      return false;
    }

    for (const ticketType of ownTicketTypes) {
      if (!ticketTypesToCompare.has(ticketType)) {
        return false;
      }
    }

    return true;
  }

  haveSameTimeSlot(cartToCompare: Cart): boolean {
    const ownTimeSlot = Array.from(this.sessionItemsByDatetime.keys())[0];
    const timeSlotToCompare = Array.from(cartToCompare.sessionItemsByDatetime.keys())[0];
    return ownTimeSlot === timeSlotToCompare;
  }
}

function isSameManualPrice(sessionA: CartSession | undefined, sessionB: CartSession | undefined): boolean {
  const manualPriceA = sessionA?.manualPrice ?? null;
  const manualPriceB = sessionB?.manualPrice ?? null;
  if ((sessionA?.isManualPriceClearPending === true) !== (sessionB?.isManualPriceClearPending === true)) {
    return false;
  }
  if (manualPriceA === null || manualPriceB === null) {
    return manualPriceA === manualPriceB;
  }
  return manualPriceA.unitPrice.amount === manualPriceB.unitPrice.amount && manualPriceA.concept === manualPriceB.concept;
}

function areSeatsEqual(seatsA: string[], seatsB: string[]): boolean {
  if (seatsA.length !== seatsB.length) {
    return false;
  }
  const sortedA = [...seatsA].sort();
  const sortedB = [...seatsB].sort();
  return sortedA.every((seat, index) => seat === sortedB[index]);
}

/**
 * How many times one unit of the line is charged: the tickets of the cart for an add-on priced per individual
 * ticket (fever2 prices it for the whole order on one line), 1 for any other line (B2BO-9343).
 */
export function countTicketsPricingTheLine(sessionItemsByDatetime: Map<string, CartSession[]>, cartSession: CartSession): number {
  return isAddOnPricedPerIndividualTicket(cartSession.sessionType) ? countTicketsPricingAddOns(sessionItemsByDatetime) : 1;
}

function countTicketsPricingAddOns(sessionItemsByDatetime: Map<string, CartSession[]>): number {
  let numberOfTickets = 0;
  sessionItemsByDatetime.forEach(cartSessions => {
    for (const cartSession of cartSessions) {
      if (!isAddOnPricedFromTheRestOfTheCart(cartSession.sessionType) && !isTransactionFeeSessionType(cartSession.sessionType)) {
        numberOfTickets += cartSession.units;
      }
    }
  });
  return numberOfTickets;
}

/**
 * The backend runs a member perk on the line net of its bundle discount, so the perk is computed off that net.
 * The returned price keeps the bundle discount inside it, because `calculateTotal` takes it off the total.
 */
function getBundledLinePriceAfterPlanDiscount(units: number, unitPrice: Money, bundleDiscount: number, planDiscount: PlanDiscount): Money {
  const netLineAmount = Math.max(0, fixedDecimals(units * unitPrice.amount - bundleDiscount, 3));
  const discountAmount = planDiscount.discountType === PlanDiscountType.PERCENTAGE ? planDiscount.discount : units * planDiscount.discount;
  const netLineAfterPlanDiscount = calculateTotalDiscount(netLineAmount, unitPrice.currency, {
    amount: discountAmount,
    type: planDiscount.discountType,
  });
  return new Money(fixedDecimals(netLineAfterPlanDiscount.amount + bundleDiscount, 3), unitPrice.currency);
}

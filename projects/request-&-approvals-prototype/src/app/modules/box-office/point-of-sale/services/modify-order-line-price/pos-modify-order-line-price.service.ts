import { computed, inject, Injectable, Injector, type Signal } from '@angular/core';

import { type CartLinePriceControl } from '@fz-original/app/modules/box-office/one-stop-shop/components/oss-cart-detail/cart-line-price-control.token';
import { RescheduleService } from '@fz-original/app/modules/reschedule/services/reschedule.service';
import { manualPriceCleared } from '@fz-original/app/modules/reservation/tracking/events/manual-price-cleared.event';
import { manualPriceSet } from '@fz-original/app/modules/reservation/tracking/events/manual-price-set.event';
import { ManualPriceScreen } from '@fz-original/app/modules/reservation/tracking/models/manual-price-tracking.model';
import {
  CartAdjustmentPriceCalculation,
  CartAdjustmentPriceOperation,
} from '@fz-original/app/shared/cart/models/cart-adjustment-price.model';
import {
  manualPriceDecimalPlaces,
  type CartSessionManualPrice,
  type CartSessionManualPriceChange,
  type CartSessionManualPriceEntry,
} from '@fz-original/app/shared/models/cart/cart-session-manual-price.model';
import { type CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { type Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { type Money } from '@fz-original/app/shared/models/money.model';
import { type SessionAvailability } from '@fz-original/app/shared/models/session-availability/session-availability.model';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import {
  applyManualPrice,
  canSetLinePrices,
  canSetManualPrice,
  clearManualPrice,
  computeManualUnitPrice,
  toActingEmployee,
} from '@fz-original/app/shared/utils/cart-manual-price.util';
import { canUseCartSessionItemLines } from '@fz-original/app/shared/utils/cart-session-item-line.util';
import { sessionTypeDiscountFor } from '@fz-original/app/shared/utils/session-type-discount.util';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { Decimal } from 'decimal.js';

import { PosTicketingState } from '../../state/pos-ticketing.state';
import { PosCartService } from '../cart/pos-cart.service';
import { PosViewUpdateService } from '../pos-view-update/pos-view-update.service';
import { PosPurchaseService } from '../purchase/pos-purchase.service';

const disabledByAdjustmentKey = 'boxOffice.cart.linePrice.disabledByModifyOrderAdjustment';
const disabledByCartKey = 'boxOffice.cart.linePrice.disabledByModifyOrderCart';
const disabledByPayByCustomerKey = 'boxOffice.cart.linePrice.disabledByModifyOrderPayByCustomer';

/**
 * The manual price per line of a Box Office order modification (GAME-2287), the Reservations line editor (GAME-1996) on the
 * modification cart. The cart stays local until the operator confirms: `RescheduleService` then sends the prices on the
 * reschedule cart, so the order is still cancelled and rebooked and the difference is still paid here.
 *
 * A line offers the editor when the operator may set line prices as in Reservations (`canSetLinePrices`) with a complete
 * acting employee, the line is neither seated, a pack nor an add-on, its session type keeps no line price of the order
 * (fever2 re-applies that one over any manual price) and its catalogue price is known.
 *
 * A product line seeded from the order keeps the price the order paid, so the operator prices it from that price: the line holds
 * the entry as typed over the order price, and `catalogueManualPriceOf` turns it into the fixed change over the catalogue price
 * that fever2 applies.
 */
@Injectable()
export class PosModifyOrderLinePriceService implements CartLinePriceControl {
  readonly #injector = inject(Injector);
  readonly #rescheduleService = inject(RescheduleService);
  readonly #state = inject(PosTicketingState);
  readonly #tracking = inject(FzTrackingService);
  readonly #userService = inject(UserService);
  readonly #viewUpdate = inject(PosViewUpdateService);
  /** The catalogue price of each seeded line the operator priced, taken when the price is applied, by session id. */
  readonly #seededCatalogUnitPrices = new Map<number, Money>();

  /** The price the editor starts from: the catalogue price, or the price the order paid for a product line seeded from it. */
  readonly catalogUnitPriceBySessionId: Signal<ReadonlyMap<number, Money>> = computed(() => {
    // The cart is a plain field on the legacy state; `viewVersion` is the bridge every cart writer ends on.
    this.#viewUpdate.viewVersion();
    return new Map(Array.from(this.#linePrices(), ([sessionId, { baseUnitPrice }]) => [sessionId, baseUnitPrice]));
  });

  readonly disabledHint: Signal<string | null> = computed(() => {
    this.#viewUpdate.viewVersion();
    return this.#disabledHint();
  });

  /** Needs no rebuild, unlike `clear()`: a later rebuild carries the manual price over through `carryManualPrices`. */
  apply(datetime: string, sessionId: number, change: CartSessionManualPriceChange): void {
    const cart = this.#state.nonConfirmedCart;
    const linePrices = this.#linePrices().get(sessionId);
    if (cart == null || linePrices === undefined || this.#disabledHint() !== null) {
      return;
    }
    const { baseUnitPrice, catalogUnitPrice } = linePrices;
    if (this.#seededOrderUnitPrice(sessionId) !== null) {
      this.#seededCatalogUnitPrices.set(sessionId, catalogUnitPrice);
    }
    const user = this.#userService.getUser();
    this.#purchase.exitModifyOrderPaymentIfActive();
    this.#state.nonConfirmedCart = applyManualPrice(
      withCatalogUnitPrice(cart, datetime, sessionId, baseUnitPrice),
      datetime,
      sessionId,
      change,
      user === null ? null : { id: user.id, name: user.name ?? null },
    );
    this.#cart.updateCartTotalImmediate();
    this.#tracking.track(
      manualPriceSet({
        cataloguePrice: catalogUnitPrice.amount,
        channel: this.#state.channelId,
        currency: catalogUnitPrice.currency,
        hasReason: change.concept.trim().length > 0,
        manualPrice: computeManualUnitPrice(baseUnitPrice, change.entry).amount,
        screen: ManualPriceScreen.ModifyOrder,
        sessionTypeId: this.#sessionTypeIdOf(sessionId),
      }),
    );
  }

  /**
   * The manual price of a target line as fever2 takes it: catalogue price ± the entry. A seeded line holds its entry over the order
   * price, so it travels as the fixed change from the catalogue price to the same price per ticket.
   */
  catalogueManualPriceOf(session: CartSession): CartSessionManualPrice | null {
    const manualPrice = session.manualPrice ?? null;
    const catalogUnitPrice = this.#seededCatalogUnitPrices.get(session.sessionId);
    if (manualPrice === null || catalogUnitPrice === undefined || this.#seededOrderUnitPrice(session.sessionId) === null) {
      return manualPrice;
    }
    return { ...manualPrice, entry: fixedEntryBetween(catalogUnitPrice, manualPrice.unitPrice) };
  }

  /** Puts the line back to the price a rebuild gives it: the cart is local, so there is no clear left for a server to confirm. */
  clear(datetime: string, sessionId: number): void {
    const cart = this.#state.nonConfirmedCart;
    if (cart == null || !this.#canEditLinePrices()) {
      return;
    }
    const clearedCart = clearManualPrice(cart, datetime, sessionId);
    if (clearedCart === cart) {
      return;
    }
    clearedCart.sessionItemsByDatetime.get(datetime)?.forEach((session: CartSession) => {
      if (session.sessionId === sessionId) {
        session.isManualPriceClearPending = false;
      }
    });
    this.#purchase.exitModifyOrderPaymentIfActive();
    this.#state.nonConfirmedCart = clearedCart;
    this.#cart.updateNonConfirmedCart();
    this.#cart.updateCartTotalImmediate();
    this.#tracking.track(
      manualPriceCleared({
        channel: this.#state.channelId,
        screen: ManualPriceScreen.ModifyOrder,
        sessionTypeId: this.#sessionTypeIdOf(sessionId),
      }),
    );
  }

  #canEditLinePrices(): boolean {
    return (
      this.#purchase.isModifyOrderMode() &&
      !this.#state.paymentInProgress &&
      canSetLinePrices(this.#userService) &&
      toActingEmployee(this.#userService.getUser()) !== null
    );
  }

  #disabledHint(): string | null {
    const order = this.#state.modifiedOrder();
    if (order?.cart?.adjustment != null) {
      return disabledByAdjustmentKey;
    }
    if (
      order?.planId != null &&
      !this.#rescheduleService.isPayByCustomerEnabled(this.#purchase.resolveModifyOrderTargetPlanId(order.planId))
    ) {
      return disabledByPayByCustomerKey;
    }
    const cart = this.#state.nonConfirmedCart;
    return cart != null && !canUseCartSessionItemLines(cart.sessionItemsByDatetime) ? disabledByCartKey : null;
  }

  /** The base price of the editor and the catalogue price fever2 applies the entry to, of every line that offers the editor. */
  #linePrices(): ReadonlyMap<number, { baseUnitPrice: Money; catalogUnitPrice: Money }> {
    const cart = this.#state.nonConfirmedCart;
    if (cart == null || !this.#canEditLinePrices()) {
      return new Map();
    }
    const availabilityBySessionId = new Map(this.#sessionAvailabilities().map(availability => [availability.id, availability]));
    const sessionTypeDiscounts = this.#state.modifyOrderSessionTypeDiscounts();
    const orderPlanId = this.#state.modifiedOrder()?.effectivePlanId;

    return new Map(
      allSessions(cart).flatMap((session: CartSession): Array<[number, { baseUnitPrice: Money; catalogUnitPrice: Money }]> => {
        const availability = availabilityBySessionId.get(session.sessionId);
        const sessionTypeId = session.sessionType?.id ?? availability?.sessionType?.id;
        const keepsOrderLinePrice = [session.mainPlanId, orderPlanId].some(
          (planId: number | undefined) => sessionTypeDiscountFor(sessionTypeDiscounts, planId, sessionTypeId) !== null,
        );
        if (!canSetManualPrice(session) || keepsOrderLinePrice) {
          return [];
        }
        const seededOrderUnitPrice = this.#seededOrderUnitPrice(session.sessionId);
        // A priced seeded line holds the order price as its catalogue price, so the catalogue comes from elsewhere.
        const catalogUnitPrice =
          seededOrderUnitPrice === null
            ? (session.catalogUnitPrice ?? availability?.ticketPrice ?? null)
            : (availability?.ticketPrice ?? this.#seededCatalogUnitPrices.get(session.sessionId) ?? null);
        return catalogUnitPrice === null
          ? []
          : [[session.sessionId, { baseUnitPrice: seededOrderUnitPrice ?? catalogUnitPrice, catalogUnitPrice }]];
      }),
    );
  }

  /** A manual price is charged to the customer, so it needs a plan whose modifications may charge them (`reschedule_pay_higher_price`). */
  #seededOrderUnitPrice(sessionId: number): Money | null {
    return this.#state.isModifyOrderCartSeeded ? (this.#state.modifyOrderSeededProductLines.get(sessionId)?.line.unitPrice ?? null) : null;
  }

  #sessionAvailabilities(): SessionAvailability[] {
    return [
      ...(this.#state.sessionAvailabilitySummary?.productSessions ?? []),
      ...this.#state.productSessions,
      ...(this.#state.selectedSession?.sessionAvailabilityByDatetimeList?.flatMap(datetime => datetime.sessionAvailabilityList) ?? []),
      ...this.#state.regularSessionAvailabilitySummaryByDateList.flatMap(summary =>
        summary.sessionAvailabilityByDatetimeList.flatMap(datetime => datetime.sessionAvailabilityList),
      ),
    ];
  }

  get #cart(): PosCartService {
    return this.#injector.get(PosCartService);
  }

  get #purchase(): PosPurchaseService {
    return this.#injector.get(PosPurchaseService);
  }

  #sessionTypeIdOf(sessionId: number): number | null {
    const cart = this.#state.nonConfirmedCart;
    const session = cart == null ? undefined : allSessions(cart).find((cartSession: CartSession) => cartSession.sessionId === sessionId);
    return (
      session?.sessionType?.id ?? this.#sessionAvailabilities().find(availability => availability.id === sessionId)?.sessionType?.id ?? null
    );
  }
}

function allSessions(cart: Cart): CartSession[] {
  return Array.from(cart.sessionItemsByDatetime.values()).flat();
}

/** The line prices its entry from `catalogUnitPrice`: the catalogue price, or the order price of a seeded line. */
function withCatalogUnitPrice(cart: Cart, datetime: string, sessionId: number, catalogUnitPrice: Money): Cart {
  const newCart = cart.clone();
  newCart.sessionItemsByDatetime.get(datetime)?.forEach((session: CartSession) => {
    if (session.sessionId === sessionId) {
      session.catalogUnitPrice = catalogUnitPrice;
    }
  });
  return newCart;
}

function fixedEntryBetween(catalogUnitPrice: Money, unitPrice: Money): CartSessionManualPriceEntry {
  const change = new Decimal(unitPrice.amount).minus(catalogUnitPrice.amount).toDecimalPlaces(manualPriceDecimalPlaces);
  return {
    amount: change.abs().toNumber(),
    calculation: CartAdjustmentPriceCalculation.FIXED,
    operation: change.isNegative() ? CartAdjustmentPriceOperation.SUBTRACT : CartAdjustmentPriceOperation.ADD,
  };
}

import { Component, computed, inject, Input, input, linkedSignal, Signal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import { calculateAutoAppliedPlanDiscountsInfo } from '@fz-original/app/modules/box-office/memberships/utils/memberships.utils';
import {
  ServiceTimeChange,
  ServiceTimeProduct,
} from '@fz-original/app/shared/cart/components/service-time-modal/service-time-modal.component';
import { ServingTimeEditService, ServingTimeWriter } from '@fz-original/app/shared/cart/services/serving-time-edit.service';
import {
  isServingTimeProductLine,
  servingTimeAnchorDate as resolveServingTimeAnchorDate,
  servingTimeVenueTimezone,
} from '@fz-original/app/shared/cart/utils/serving-time.util';
import {
  getOrderDepositRefundedAmount,
  getOrderRefundedAmountFromCancellationRecords,
} from '@fz-original/app/shared/components/order/utils/order-cancellation-refund.util';
import { withPackConstituents } from '@fz-original/app/shared/components/order/utils/pack-constituents.util';
import { catchError, Observable, of, startWith, switchMap } from 'rxjs';

import { CartSession } from '../../../../models/cart/cart-session.model';
import { Cart } from '../../../../models/cart/cart.model';
import { CouponDiscount } from '../../../../models/cart/coupons.model';
import { Money } from '../../../../models/money.model';
import { CancellationInsurancePartnerShare } from '../../../../models/order/cancellation-insurance-partner-share.model';
import { OrderPaymentLeg, OrderPaymentLegsRequest } from '../../../../models/order/order-payment-leg.model';
import { OrderTransaction } from '../../../../models/order/order-transaction.model';
import { Order } from '../../../../models/order/order.model';
import { ReferencePrice } from '../../../../models/order/reference-price.model';
import { isTransactionFeeSessionType } from '../../../../models/session-type/session-type.util';
import { FeatureFlags } from '../../../../optimizely/feature-flags';
import { OptimizelyService } from '../../../../optimizely/optimizely.service';
import { DistributorRouteService } from '../../../../services/distributor/distributor-route.service';
import { OrderPaymentMethodsService } from '../../../../services/order-payment-methods/order-payment-methods.service';
import { OrderServingTimeService } from '../../../../services/order/order-serving-time/order-serving-time.service';
import { PartnerService } from '../../../../services/partner/partner.service';
import { Permissions } from '../../../../services/user/permissions';
import { UserService } from '../../../../services/user/user.service';
import { fixedDecimals, sumMoneys } from '../../../../utils/number.util';
import { shouldShowReferencePrice } from '../../../../utils/reference-price.util';
import { FAKE_IDS } from '../order.constants';

@Component({
  host: { '[class.order-detail--purchase-information]': 'purchaseInformationLayout()' },
  providers: [ServingTimeEditService],
  selector: 'app-order-detail',
  standalone: false,
  styleUrl: './order-detail.component.scss',
  templateUrl: './order-detail.component.html',
})
export class OrderDetailComponent {
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #distributorRoute = inject(DistributorRouteService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #orderPaymentMethodsService = inject(OrderPaymentMethodsService);
  readonly #orderServingTimeService = inject(OrderServingTimeService);
  readonly #partnerService = inject(PartnerService);
  readonly #servingTimeEditService = inject(ServingTimeEditService);
  readonly #userService = inject(UserService);

  readonly depositCart = input<Cart | null>(null);
  readonly order = input<Order | undefined>(undefined);
  readonly paymentCardNumberLast4Digits = input<string | undefined>(undefined);

  @Input() orderId?: number;
  @Input() hasReschedule = false;
  readonly cartMergesSeveralOrders = input(false);
  readonly orderPartnerId = input<number | null>(null);
  readonly planNamesByPlanId = input<ReadonlyMap<number, string> | null>(null);
  @Input() paymentNotes?: string;
  readonly purchaseInformationLayout = input(false);
  readonly showPlanNames = input(false);
  @Input() set cart(value: Cart) {
    this.fusedSessionsCart = this.#fuseSessions(value);
    this.#servingTimeAnchorDate.set(resolveServingTimeAnchorDate(this.fusedSessionsCart.sessionItemsByDatetime));
  }

  fusedSessionsCart!: Cart;

  readonly servingTimeEnabled =
    this.#optimizelyService.isFeatureEnabled({
      optimizelyFeatureKey: FeatureFlags.GAME_CENTERS_RESERVATIONS,
      team: 'game-centers',
    }) ?? false;

  readonly servingTimesBySessionId = linkedSignal<ReadonlyMap<number, string>>(() => new Map(this.order()?.servingTimesBySessionId ?? []));

  readonly servingTimeSaving: Signal<boolean> = this.#servingTimeEditService.saving;

  readonly #servingTimeAnchorDate = signal<string | null>(null);
  readonly servingTimeAnchorDate = this.#servingTimeAnchorDate.asReadonly();

  readonly #paymentRequest$ = toObservable(
    computed(() => this.#paymentLegsRequest(), {
      equal: (previous, next) => previous?.orderId === next?.orderId && previous?.partnerId === next?.partnerId,
    }),
  );

  readonly paymentLegs: Signal<readonly OrderPaymentLeg[]> = toSignal(
    this.#paymentRequest$.pipe(
      switchMap(request =>
        this.#loadForSplitOrder(request, 'payments', ({ partnerId, orderId }) =>
          this.#orderPaymentMethodsService.getOrderPayments(partnerId, orderId),
        ),
      ),
    ),
    { initialValue: [] },
  );

  readonly paymentTransactions: Signal<readonly OrderTransaction[]> = toSignal(
    this.#paymentRequest$.pipe(
      switchMap(request =>
        this.#loadForSplitOrder(request, 'transactions', ({ partnerId, orderId }) =>
          this.#orderPaymentMethodsService.getOrderTransactions(partnerId, orderId),
        ),
      ),
    ),
    { initialValue: [] },
  );

  canEditServingTime(): boolean {
    return (
      this.servingTimeEnabled &&
      this.#resolvedPartnerId() !== null &&
      this.#resolvedOrderId() !== null &&
      !this.cartMergesSeveralOrders() &&
      this.#userService.hasPermission(this.#servingTimePermission())
    );
  }

  onServiceTimeRequested(): void {
    this.#servingTimeEditService
      .edit({
        anchorDate: this.servingTimeAnchorDate(),
        current: this.servingTimesBySessionId(),
        products: this.#serviceTimeProducts(),
        write: this.#servingTimeWriter(),
      })
      .subscribe(servingTimes => this.servingTimesBySessionId.set(servingTimes));
  }

  #mergeUnitsBySessionId(sessions: CartSession[]): CartSession[] {
    return sessions.reduce((merged: CartSession[], session: CartSession) => {
      const firstOccurrence = merged.find(candidate => candidate.sessionId === session.sessionId);
      if (!firstOccurrence) {
        return [...merged, session.clone()];
      }
      firstOccurrence.units += session.units;
      return merged;
    }, []);
  }

  #isPaidWithSeveralPayments(): boolean {
    const order = this.order();
    return (
      order?.paymentGateway === PaymentType.GROUPED ||
      order?.paymentMethod === PaymentType.GROUPED ||
      order?.paymentMethod === PaymentType.CARD_SPLIT
    );
  }

  #loadForSplitOrder<T>(
    request: OrderPaymentLegsRequest | null,
    resource: 'payments' | 'transactions',
    load: (request: OrderPaymentLegsRequest) => Observable<readonly T[]>,
  ): Observable<readonly T[]> {
    if (request === null) {
      return of([]);
    }
    return load(request).pipe(
      catchError((error: unknown) => {
        this.#datadogLogService.logError(`Order detail: could not read the order ${resource}, falling back to the single payment method`, {
          error,
          orderId: request.orderId,
          partnerId: request.partnerId,
        });
        return of<readonly T[]>([]);
      }),
      startWith<readonly T[]>([]),
    );
  }

  #paymentLegsRequest(): OrderPaymentLegsRequest | null {
    if (!this.#isPaidWithSeveralPayments()) {
      return null;
    }
    const orderId = this.#resolvedOrderId();
    const partnerId = this.#resolvedPartnerId();
    return orderId === null || partnerId == null ? null : { orderId, partnerId };
  }

  #resolvedOrderId(): number | null {
    const orderId = this.order()?.id ?? this.orderId;
    return orderId != null && orderId !== FAKE_IDS.FAKE_ORDER_ID ? orderId : null;
  }

  #resolvedPartnerId(): number | null {
    return (
      this.orderPartnerId() ?? this.#distributorRoute.pairTarget()?.targetOrganizationId ?? this.#partnerService.getActingOrganizationId()
    );
  }

  #servingTimePermission(): Permissions {
    return this.#userService.isBusiness() ? Permissions.CAN_MODIFY_MY_RESERVATION : Permissions.CAN_MODIFY_RESERVATION;
  }

  #servingTimeWriter(): ServingTimeWriter | null {
    const partnerId = this.#resolvedPartnerId();
    const orderId = this.#resolvedOrderId();
    if (partnerId == null || orderId === null) {
      return null;
    }

    const userId = this.#userService.isBusiness() ? (this.#userService.getUserId() ?? null) : null;
    return (change: ServiceTimeChange) =>
      this.#orderServingTimeService.setProductServingTime({
        orderId,
        partnerId,
        servingAt: change.servingAt,
        sessionId: change.sessionId,
        userId,
      });
  }

  #serviceTimeProducts(): ServiceTimeProduct[] {
    const cart = this.fusedSessionsCart;
    if (!cart) {
      return [];
    }
    const recorded = this.servingTimesBySessionId();
    const productLines = Array.from(cart.sessionItemsByDatetime.values())
      .reduce((all: CartSession[], sessions: CartSession[]) => [...all, ...sessions], [])
      .filter(isServingTimeProductLine);

    return this.#mergeUnitsBySessionId(productLines)
      .map(session => ({
        sessionId: session.sessionId,
        name: session.sessionName ?? '',
        units: session.units,
        servingAt: recorded.get(session.sessionId) ?? null,
        timezone: servingTimeVenueTimezone(session, cart.timezone),
      }))
      .filter((product): product is ServiceTimeProduct => product.timezone !== null);
  }

  readonly orderRefundedAmount = computed<Money | null>(() => {
    const refundedAmount = getOrderRefundedAmountFromCancellationRecords(this.order()?.userCancellationRecords);
    return refundedAmount != null && refundedAmount.amount !== 0 ? this.#toRefundMoney(refundedAmount) : null;
  });

  readonly depositRefundedAmount = computed<Money | null>(() => {
    const deposit = this.order()?.cart?.deposit ?? this.depositCart()?.deposit;
    const depositRefundedAmount = getOrderDepositRefundedAmount(this.order()?.userCancellationRecords, deposit);
    return depositRefundedAmount ? this.#toRefundMoney(depositRefundedAmount) : null;
  });

  shouldShowInvoiceButton(): boolean {
    return this.orderId !== FAKE_IDS.FAKE_ORDER_ID;
  }

  #applyDiscountsToCartSessions(cartSessions: CartSession[], discounts: CouponDiscount[]): void {
    const allDiscountItems = discounts.flatMap(discount => discount.discounts);

    cartSessions.forEach(cartSession => {
      if (!cartSession.unitPrice || !cartSession.sessionType?.id) {
        return;
      }

      const applicableDiscount = allDiscountItems.find(discountItem => discountItem.ticketTypeId === cartSession.sessionType?.id);
      if (applicableDiscount) {
        cartSession.autoAppliedPlanDiscountsInfo = calculateAutoAppliedPlanDiscountsInfo(
          applicableDiscount.discount,
          applicableDiscount.discountType,
          cartSession.unitPrice,
        );
      }
    });
  }

  #getAllSessions(sessionsMap: Map<string, CartSession[]>): CartSession[] {
    return Array.from(sessionsMap.entries()).reduce((previous, [, sessions]) => [...previous, ...sessions], [] as CartSession[]);
  }

  #toRefundMoney(amount: Money): Money {
    return new Money(-Math.abs(amount.amount), amount.currency);
  }

  #fuseDateTimeSessions(sessions: Array<CartSession>): Array<CartSession> {
    return sessions.reduce((prev, curr) => {
      const firstOccurrence = prev.find(
        session => session.sessionId === curr.sessionId && session.isPackConstituent === curr.isPackConstituent,
      );
      if (!firstOccurrence) {
        return [...prev, curr.clone()];
      }
      const mergedSeats = [...(firstOccurrence.seats ?? []), ...(curr.seats ?? [])];
      if (mergedSeats.length) {
        firstOccurrence.seats = mergedSeats;
      }
      firstOccurrence.units += curr.units;
      if (firstOccurrence.price && curr.price) {
        firstOccurrence.price = new Money(firstOccurrence.price.amount + curr.price.amount, firstOccurrence.price.currency);
      }
      if (firstOccurrence.totalSurchargePerTicket && curr.totalSurchargePerTicket) {
        firstOccurrence.totalSurchargePerTicket = new Money(
          firstOccurrence.totalSurchargePerTicket.amount + curr.totalSurchargePerTicket.amount,
          firstOccurrence.totalSurchargePerTicket.currency,
        );
      }
      if (firstOccurrence.total && curr.total) {
        firstOccurrence.total = new Money(firstOccurrence.total.amount + curr.total.amount, firstOccurrence.total.currency);
      }
      if (firstOccurrence.loyaltyTotalPrice != null && curr.loyaltyTotalPrice != null) {
        firstOccurrence.loyaltyTotalPrice = firstOccurrence.loyaltyTotalPrice + curr.loyaltyTotalPrice;
      }
      firstOccurrence.referencePrice = this.#fuseReferencePrices(firstOccurrence.referencePrice, curr.referencePrice);
      firstOccurrence.cancellationInsurancePartnerShare = this.#fusePartnerShares(
        firstOccurrence.cancellationInsurancePartnerShare,
        curr.cancellationInsurancePartnerShare,
      );
      return prev;
    }, [] as Array<CartSession>);
  }

  /** A fused line only keeps a reference price when every fused row has one with the same provenance and currency. */
  #fuseReferencePrices(first: ReferencePrice | null | undefined, other: ReferencePrice | null | undefined): ReferencePrice | null {
    if (!first || !other || first.provenance !== other.provenance || first.price.currency !== other.price.currency) {
      return null;
    }
    return {
      ...first,
      price: new Money(first.price.amount + other.price.amount, first.price.currency),
      total: new Money(first.total.amount + other.total.amount, first.total.currency),
    };
  }

  #fusePartnerShares(
    first: CancellationInsurancePartnerShare | null | undefined,
    other: CancellationInsurancePartnerShare | null | undefined,
  ): CancellationInsurancePartnerShare | null {
    if (!first || !other || first.price.currency !== other.price.currency) {
      return null;
    }
    return { ...first, price: new Money(fixedDecimals(first.price.amount + other.price.amount, 2), first.price.currency) };
  }

  #promotionDiscountOnPartnerShare(session: CartSession): number {
    const referencePrice = session.referencePrice;
    if (!session.cancellationInsurancePartnerShare || !referencePrice || !session.price) {
      return 0;
    }
    if (!shouldShowReferencePrice(referencePrice.price, session.price, referencePrice.provenance)) {
      return 0;
    }
    return referencePrice.price.amount - session.price.amount;
  }

  #showPartnerShares(cart: Cart): void {
    const sessions = this.#getAllSessions(cart.sessionItemsByDatetime);
    const promotionDiscountOnShares = sessions.reduce((discount, session) => discount + this.#promotionDiscountOnPartnerShare(session), 0);
    const totalChange = sessions.reduce((change, session) => change + this.#showPartnerShare(session), 0);
    if (cart.total && totalChange !== 0) {
      cart.total = new Money(fixedDecimals(cart.total.amount + totalChange, 2), cart.total.currency);
    }
    const promotion = cart.appliedPromotion;
    if (promotion && promotionDiscountOnShares !== 0) {
      const discount = fixedDecimals(Math.max(0, promotion.discount.amount - promotionDiscountOnShares), 2);
      cart.appliedPromotion = { ...promotion, discount: new Money(discount, promotion.discount.currency) };
    }
  }

  #showPartnerShare(session: CartSession): number {
    const partnerShare = session.cancellationInsurancePartnerShare;
    if (!partnerShare) {
      return 0;
    }
    const discountedPrice = session.autoAppliedPlanDiscountsInfo?.unitPriceWithDiscount;
    const chargedAmount = discountedPrice ? discountedPrice.amount * session.units : (session.price?.amount ?? 0);
    const change = partnerShare.price.amount - chargedAmount;
    session.price = partnerShare.price;
    session.unitPrice = partnerShare.unitPrice;
    session.total = session.totalSurchargePerTicket ? sumMoneys(partnerShare.price, session.totalSurchargePerTicket) : partnerShare.price;
    session.referencePrice = null;
    session.autoAppliedPlanDiscountsInfo = undefined;
    return change;
  }

  #listableSessions(sessions: CartSession[]): CartSession[] {
    return this.servingTimeEnabled ? withPackConstituents(sessions) : sessions;
  }

  #fuseSessions(cart: Cart): Cart {
    const clone = cart.clone();
    const sessionsArray: Array<[string, Array<CartSession>]> = Array.from(cart.sessionItemsByDatetime).map(([key, sessions]) => [
      key,
      this.#sortTransactionFeesLast(this.#fuseDateTimeSessions(this.#listableSessions(sessions))),
    ]);

    clone.sessionItemsByDatetime = new Map(sessionsArray);
    const discounts = cart.coupons?.discounts ?? [];

    if (discounts.length) {
      // FIXME: Remove this when multiple coupons are supported
      clone.appliedCoupon = null;
      const allSessions = this.#getAllSessions(clone.sessionItemsByDatetime);
      if (allSessions.length) {
        this.#applyDiscountsToCartSessions(allSessions, discounts);
      }
    }
    if (this.#userService.getUser()?.isStaff() !== true) {
      this.#showPartnerShares(clone);
    }

    return clone;
  }

  #sortTransactionFeesLast(cartSessions: CartSession[]): CartSession[] {
    return [...cartSessions].sort(
      (a, b) => Number(isTransactionFeeSessionType(a.sessionType)) - Number(isTransactionFeeSessionType(b.sessionType)),
    );
  }
}

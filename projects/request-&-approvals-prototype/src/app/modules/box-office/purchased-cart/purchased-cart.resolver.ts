import { Location } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Navigation, Resolve, Router } from '@angular/router';

import { SpinnerService } from '@fz-original/app/shared/layout/spinner/spinner.service';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Order } from '@fz-original/app/shared/models/order/order.model';
import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import { CartService } from '@fz-original/app/shared/services/cart/cart.service';
import { CheckoutLoggerService } from '@fz-original/app/shared/services/checkout-logger/checkout-logger.service';
import { CheckoutStageEnum } from '@fz-original/app/shared/services/checkout-logger/models/checkout-stage.enum';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { PlanService } from '@fz-original/app/shared/services/plan/plan.service';
import { PurchaseService } from '@fz-original/app/shared/services/purchase/purchase.service';
import { catchError, forkJoin, map, mergeMap, Observable, of } from 'rxjs';

import { FlexibleBundlePurchase } from './models/flexible-bundle-purchase.model';
import {
  getPrintableOrdersFromCart,
  hasGroupedOrderIds,
  selectOrdersInGroupFromCart,
  toPrintableOrders,
} from './prepare-orders-for-print.util';
import { PurchasedCartHandoffService } from './services/purchased-cart-handoff.service';
import { buildFlexibleBundlePurchase } from './utils/flexible-bundle-purchase.util';

export interface PurchasedCartData {
  autoPrint: boolean;
  cart: Cart;
  flexibleBundle: FlexibleBundlePurchase | null;
  isOrderModificationLanding: boolean;
  mainPlans: Plan[] | null;
  orders: Order[] | null;
  ordersForPrint: Order[] | null;
  paymentTransactionId?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class PurchasedCartResolver implements Resolve<Observable<BaseResponse<PurchasedCartData>>> {
  readonly #cartService = inject(CartService);
  readonly #checkoutLogger = inject(CheckoutLoggerService);
  readonly #location = inject(Location);
  readonly #partnerService = inject(PartnerService);
  readonly #planService = inject(PlanService);
  readonly #purchasedCartHandoff = inject(PurchasedCartHandoffService);
  readonly #purchaseService = inject(PurchaseService);
  readonly #router = inject(Router);
  readonly #spinnerService = inject(SpinnerService);

  get #navigation(): Navigation | null {
    return this.#router.getCurrentNavigation();
  }

  resolve(route: ActivatedRouteSnapshot): Observable<BaseResponse<PurchasedCartData>> {
    this.#spinnerService.show();

    const autoPrint = this.#getAutoPrint();
    const isOrderModificationLanding = this.#getIsOrderModificationLanding();
    const paymentTransactionId = this.#getPaymentTransactionId();

    const cartId = route.paramMap.get('cartId');
    const partner: Partner | null = this.#partnerService.getPartner();
    if (!cartId || !partner) {
      return of(new BaseResponse<PurchasedCartData>(null, { code: 404, message: 'missing cartId or partnerId' }));
    }

    const partnerId = partner.id;

    const cart = this.#readPaidCartOrRequest(partnerId, cartId);
    const orders = this.#purchaseService.searchOrders({
      partnerId,
      cartId,
      includeOrderItems: true,
      includePerItemTax: true,
      includeReschedules: true,
    });

    return forkJoin([cart, orders]).pipe(
      map(([cart, orders]) => {
        const error = cart.error || orders.error || null;
        if (error !== null) {
          return {
            allCartOrders: [] as Order[],
            purchasedCartData: new BaseResponse<PurchasedCartData>(null, error),
          };
        }
        this.#copyAppliedCouponToOrders(cart.data!, orders.data!);
        this.#enrichCartSessionsWithVenueInfo(cart.data!, orders.data!);

        const allCartOrders = orders.data!;
        const filteredOrders = this.#filterMainOrder(allCartOrders);

        return {
          allCartOrders,
          purchasedCartData: new BaseResponse<PurchasedCartData>(
            {
              autoPrint,
              cart: cart.data!,
              flexibleBundle: buildFlexibleBundlePurchase(allCartOrders, cart.data?.appliedCoupon ?? null),
              isOrderModificationLanding,
              mainPlans: null,
              orders: filteredOrders,
              ordersForPrint: null,
              paymentTransactionId,
            },
            null,
          ),
        };
      }),
      mergeMap(({ allCartOrders, purchasedCartData }) => {
        if (purchasedCartData.error || !purchasedCartData.data) {
          return of(purchasedCartData);
        }

        return this.#resolveOrdersForPrint(partnerId, allCartOrders, purchasedCartData.data).pipe(
          mergeMap(dataWithPrintOrders => {
            const mainPlanIds = [
              ...new Set(
                dataWithPrintOrders.orders?.map(order => order.planId).filter((planId): planId is number => planId !== undefined) ?? [],
              ),
            ];
            const mainPlansObservable = this.#planService.getPlans(partnerId, mainPlanIds);
            return this.#insertMainPlansIntoPurchasedCartData(dataWithPrintOrders, mainPlansObservable);
          }),
        );
      }),
    );
  }

  /**
   * The cart the Point of Sale just paid is handed off in memory (B2BO-9521; its flag was removed in B2BO-9690), so the
   * happy path sends the order search alone. Without a handoff (a reload, a direct link, the One Stop Shop, a
   * settlement, a modification) the cart is requested as before.
   */
  #readPaidCartOrRequest(partnerId: number, cartId: string): Observable<BaseResponse<Cart | null>> {
    const paidCart = this.#purchasedCartHandoff.take(partnerId, cartId);
    if (paidCart !== null) {
      return of(new BaseResponse<Cart | null>(paidCart, null));
    }
    return this.#cartService.getCart(partnerId, cartId);
  }

  #resolveOrdersForPrint(partnerId: number, allCartOrders: Order[], purchasedCartData: PurchasedCartData): Observable<PurchasedCartData> {
    const uiOrders = purchasedCartData.orders ?? [];
    const mainOrder = uiOrders.find(hasGroupedOrderIds);

    if (!mainOrder?.groupedOrders?.length) {
      return of({
        ...purchasedCartData,
        ordersForPrint: null,
      });
    }

    const missingGroupedOrderIds = mainOrder.groupedOrders.filter(orderId => !allCartOrders.some(order => order.id === orderId));

    if (missingGroupedOrderIds.length === 0) {
      return of({
        ...purchasedCartData,
        ordersForPrint: getPrintableOrdersFromCart(allCartOrders, uiOrders),
      });
    }

    return forkJoin(
      missingGroupedOrderIds.map(orderId =>
        this.#purchaseService.searchOrders({
          partnerId,
          orderId,
          includeOrderItems: true,
          includePerItemTax: true,
          includeReschedules: true,
        }),
      ),
    ).pipe(
      map(orderResponses => {
        const fetchedOrders = orderResponses.flatMap((response, index) => {
          if (response.error) {
            this.#checkoutLogger.info(
              'Skipping grouped order fetch for print — searchOrders failed',
              { stage: CheckoutStageEnum.VIEW_ORDER, cartId: purchasedCartData.cart.id },
              { orderId: missingGroupedOrderIds[index], error: response.error },
            );
            return [];
          }

          return response.data ?? [];
        });
        const ordersWithFetched = [...allCartOrders, ...fetchedOrders];

        return {
          ...purchasedCartData,
          ordersForPrint: toPrintableOrders(selectOrdersInGroupFromCart(ordersWithFetched, mainOrder)),
        };
      }),
      catchError(error => {
        this.#checkoutLogger.info(
          'Grouped order fetch for print failed — using cart orders only',
          { stage: CheckoutStageEnum.VIEW_ORDER, cartId: purchasedCartData.cart.id },
          { error },
        );

        return of({
          ...purchasedCartData,
          ordersForPrint: getPrintableOrdersFromCart(allCartOrders, uiOrders),
        });
      }),
    );
  }

  #copyAppliedCouponToOrders(cart: Cart, orders: Order[]): void {
    if (!cart.appliedCoupon || !orders?.length) {
      return;
    }

    orders.forEach(order => {
      if (cart.appliedCoupon && order.cart && !order.cart.appliedCoupon) {
        order.cart.appliedCoupon = cart.appliedCoupon;
      }
    });
  }

  #enrichCartSessionsWithVenueInfo(cart: Cart, orders: Order[]): void {
    if (!orders?.length) {
      return;
    }

    const venueInfoBySessionId = new Map<number, { sessionVenueName?: string; sessionAddressId?: number }>();

    orders.forEach(order => {
      order.cart?.sessionItemsByDatetime?.forEach(sessions => {
        sessions.forEach(session => {
          if (session.sessionVenueName || session.sessionAddressId) {
            venueInfoBySessionId.set(session.sessionId, {
              sessionVenueName: session.sessionVenueName,
              sessionAddressId: session.sessionAddressId,
            });
          }
        });
      });
    });

    cart.sessionItemsByDatetime?.forEach(sessions => {
      sessions.forEach(session => {
        const placeInfo = venueInfoBySessionId.get(session.sessionId);
        if (placeInfo) {
          session.sessionVenueName = placeInfo.sessionVenueName;
          session.sessionAddressId = placeInfo.sessionAddressId;
        }
      });
    });
  }

  #getAutoPrint(): boolean {
    let autoPrint = !!this.#navigation?.extras?.state?.autoPrint;
    if (autoPrint && this.#navigation?.extras?.state) {
      this.#navigation.extras.state.autoPrint = false;
    } else {
      const locationValue = this.#location.getState() as unknown as Record<string, unknown>;
      autoPrint = locationValue ? !!locationValue['autoPrint'] : false;
    }
    return autoPrint;
  }

  #filterMainOrder(orders: Order[]): Order[] {
    if (!orders?.length) {
      return orders;
    }

    const mainOrder = orders.find(hasGroupedOrderIds);

    return mainOrder ? [mainOrder] : orders;
  }

  #getIsOrderModificationLanding(): boolean {
    if (this.#navigation?.extras?.state?.isOrderModificationLanding === true) {
      this.#navigation.extras.state.isOrderModificationLanding = false;
      return true;
    }
    const locationValue = (this.#location.getState() as unknown as Record<string, unknown> | null)?.['isOrderModificationLanding'];
    return locationValue === true;
  }

  #getPaymentTransactionId(): string | null {
    const navigationValue = this.#navigation?.extras?.state?.paymentTransactionId;
    if (typeof navigationValue === 'string' && navigationValue.length > 0) {
      return navigationValue;
    }
    const locationValue = (this.#location.getState() as unknown as Record<string, unknown> | null)?.['paymentTransactionId'];
    return typeof locationValue === 'string' && locationValue.length > 0 ? locationValue : null;
  }

  #insertMainPlansIntoPurchasedCartData(
    purchasedCartData: PurchasedCartData,
    plansObservable: Observable<BaseResponse<Plan[] | null>>,
  ): Observable<BaseResponse<PurchasedCartData>> {
    return plansObservable.pipe(
      map(plansResponse => {
        if (plansResponse.error) {
          return new BaseResponse<PurchasedCartData>(null, plansResponse.error);
        }

        return new BaseResponse<PurchasedCartData>(
          {
            ...purchasedCartData,
            mainPlans: plansResponse.data,
          },
          null,
        );
      }),
    );
  }
}

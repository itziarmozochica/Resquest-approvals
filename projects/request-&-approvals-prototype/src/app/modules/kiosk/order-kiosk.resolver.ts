import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';

import { catchError, forkJoin, map, mergeMap, Observable, of, throwError } from 'rxjs';

import { Customer } from '../../shared/models/customer/customer.model';
import { Order } from '../../shared/models/order/order.model';
import { OrderData, OrderResolver, SourceOrderResolver } from '../../shared/resolvers/order.resolver';
import { CheckoutLoggerService } from '../../shared/services/checkout-logger/checkout-logger.service';
import { CheckoutStageEnum } from '../../shared/services/checkout-logger/models/checkout-stage.enum';
import { PartnerService } from '../../shared/services/partner/partner.service';
import { PurchaseService } from '../../shared/services/purchase/purchase.service';
import {
  hasGroupedOrderIds,
  selectOrdersInGroupFromCart,
  toPrintableOrders,
} from '../box-office/purchased-cart/prepare-orders-for-print.util';

interface OrdersForPrintResolution {
  ordersForPrint: Order[] | null;
  ordersInGroup: Order[] | null;
}

@Injectable({
  providedIn: 'root',
})
export class OrderKioskResolver extends OrderResolver {
  readonly #checkoutLogger = inject(CheckoutLoggerService);
  readonly #partnerService = inject(PartnerService);
  readonly #purchaseService = inject(PurchaseService);
  #customer: Customer | undefined;
  override navigateToUrl = '/kiosk';
  override source = SourceOrderResolver.Kiosk;

  override resolve(route: ActivatedRouteSnapshot): Observable<OrderData | null> {
    if (this.navigation?.extras?.state?.customer) {
      this.#customer = { ...this.navigation.extras.state.customer };
    }
    return super.resolve(route).pipe(
      mergeMap(orderData => {
        if (orderData === null) {
          return of(null);
        }

        const partner = this.#partnerService.getPartner();
        if (partner === null) {
          return of({
            ...orderData,
            customer: this.#customer ?? orderData.customer,
            ordersForPrint: null,
            ordersInGroup: null,
          });
        }

        return this.#resolveOrdersForPrint(partner.id, orderData.order).pipe(
          map(({ ordersForPrint, ordersInGroup }) => ({
            ...orderData,
            customer: this.#customer ?? orderData.customer,
            ordersForPrint,
            ordersInGroup,
          })),
        );
      }),
      catchError(err => throwError(() => err)),
    );
  }

  #resolveOrdersForPrint(partnerId: number, order: Order): Observable<OrdersForPrintResolution> {
    const cartId = order.cart?.id;
    if (cartId === undefined) {
      return of({ ordersForPrint: null, ordersInGroup: null });
    }

    return this.#purchaseService.searchOrders({ partnerId, cartId, includeOrderItems: true, includePerItemTax: true }).pipe(
      mergeMap(cartOrdersResponse => {
        if (cartOrdersResponse.error || cartOrdersResponse.data === null) {
          return of({ ordersForPrint: null, ordersInGroup: null });
        }

        const allCartOrders = cartOrdersResponse.data;
        const mainOrder = allCartOrders.find(hasGroupedOrderIds);
        if (mainOrder === undefined) {
          return of({ ordersForPrint: null, ordersInGroup: null });
        }

        const missingGroupedOrderIds = (mainOrder.groupedOrders ?? []).filter(
          groupedOrderId => !allCartOrders.some(cartOrder => cartOrder.id === groupedOrderId),
        );

        if (missingGroupedOrderIds.length === 0) {
          const ordersInGroup = selectOrdersInGroupFromCart(allCartOrders, mainOrder);
          return of({ ordersForPrint: toPrintableOrders(ordersInGroup), ordersInGroup });
        }

        return forkJoin(
          missingGroupedOrderIds.map(orderId =>
            this.#purchaseService.searchOrders({
              partnerId,
              orderId,
              includeOrderItems: true,
              includePerItemTax: true,
            }),
          ),
        ).pipe(
          map(orderResponses => {
            const fetchedOrders = orderResponses.flatMap((response, index) => {
              if (response.error) {
                this.#checkoutLogger.info(
                  'Skipping grouped order fetch for print — searchOrders failed',
                  { stage: CheckoutStageEnum.VIEW_ORDER, cartId },
                  { orderId: missingGroupedOrderIds[index], error: response.error },
                );
                return [];
              }

              return response.data ?? [];
            });
            const ordersWithFetched = [...allCartOrders, ...fetchedOrders];
            const ordersInGroup = selectOrdersInGroupFromCart(ordersWithFetched, mainOrder);

            return { ordersForPrint: toPrintableOrders(ordersInGroup), ordersInGroup };
          }),
          catchError(error => {
            this.#checkoutLogger.info(
              'Grouped order fetch for print failed — using cart orders only',
              { stage: CheckoutStageEnum.VIEW_ORDER, cartId },
              { error },
            );

            const ordersInGroup = selectOrdersInGroupFromCart(allCartOrders, mainOrder);
            return of({ ordersForPrint: toPrintableOrders(ordersInGroup), ordersInGroup });
          }),
        );
      }),
    );
  }
}

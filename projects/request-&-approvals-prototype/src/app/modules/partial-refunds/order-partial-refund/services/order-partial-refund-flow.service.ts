import { inject, Injectable } from '@angular/core';

import type { TicketSummary } from '@fz-original/app/modules/cancellation/models/ticket-summary.model';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import type { Order } from '@fz-original/app/shared/models/order/order.model';
import type { MultiStepModalResult } from '@fz-original/app/shared/multi-step-modal/models/multi-step-modal.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { PurchaseService, type GetOrderFlags } from '@fz-original/app/shared/services/purchase/purchase.service';
import type { SearchOrderQuery } from '@fz-original/app/shared/services/purchase/search-order-query';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { map, switchMap, take, throwError, type Observable } from 'rxjs';

import { OrderPartialRefundModalService } from './order-partial-refund-modal.service';

export interface OrderPartialRefundFlowParams {
  orderId: number;
  partnerId: number;
}

/**
 * The same gate as the bulk tool, because this is the same tool in single-order mode: the flag
 * decides whether partial refunds exist for the partner, the permission whether this user may issue
 * them. The order view holds the order without its cancellable items, so the flow reads them itself
 * before opening, the way the cancellation page does.
 */
@Injectable({
  providedIn: 'root',
})
export class OrderPartialRefundFlowService {
  readonly #modalService = inject(OrderPartialRefundModalService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #purchaseService = inject(PurchaseService);
  readonly #userService = inject(UserService);

  isEnabledForOrder(order: Order | null | undefined): boolean {
    return (
      order?.status === 'active' &&
      (this.#optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.PARTIAL_REFUNDS_VIEW,
        team: 'user-operations-excellence',
      }) ??
        false) &&
      this.#userService.hasPermission(Permissions.CAN_ISSUE_PARTIAL_REFUNDS)
    );
  }

  start(params: OrderPartialRefundFlowParams): Observable<MultiStepModalResult> {
    return this.#loadTicketsSummaries(params).pipe(
      switchMap(ticketsSummaries =>
        this.#modalService.open({ orderId: params.orderId, partnerId: params.partnerId, ticketsSummaries }).closed$.pipe(
          take(1),
          // The dialog closes without a result only when the chrome dismisses it, which is not the operator giving up.
          map(result => result ?? { abandoned: false, completed: false }),
        ),
      ),
    );
  }

  // Business (OBO) operators can only read the order through their own user, as on the cancellation page.
  #getOrder({ orderId, partnerId }: OrderPartialRefundFlowParams): Observable<BaseResponse<Order | null>> {
    const flags: GetOrderFlags = { hideFeverDiscount: true, includeCancellableItems: true };
    const userId = this.#userService.getUserId();
    if (this.#userService.isBusiness() && userId !== undefined) {
      return this.#purchaseService.getUserOrder(partnerId, userId, orderId, flags);
    }

    const query: SearchOrderQuery = { ...flags, orderId, partnerId };
    return this.#purchaseService.searchOrders(query).pipe(map(response => new BaseResponse(response.data?.[0] ?? null, response.error)));
  }

  #loadTicketsSummaries(params: OrderPartialRefundFlowParams): Observable<TicketSummary[]> {
    return this.#getOrder(params).pipe(
      switchMap(response => {
        // Both reads fold a failed request into the body, so a failure must not read as a missing order.
        if (response.error != null) {
          return throwError(() => response.error);
        }
        const order = response.data;
        return order === null ? throwError(() => new Error('Order not found')) : [order.ticketsSummaries ?? []];
      }),
    );
  }
}

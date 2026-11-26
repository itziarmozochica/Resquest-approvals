import { Location } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Navigation, Resolve, Router } from '@angular/router';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { Observable, of, throwError } from 'rxjs';
import { catchError, mergeMap, switchMap } from 'rxjs/operators';

import { AutoPrintStatusEvent } from '../../core/tracking/core/events/auto-print-status';
import { TrackingService } from '../../core/tracking/tracking.service';
import { SpinnerService } from '../layout/spinner/spinner.service';
import { CartSession } from '../models/cart/cart-session.model';
import { Cart } from '../models/cart/cart.model';
import { Customer } from '../models/customer/customer.model';
import { Order } from '../models/order/order.model';
import { Partner } from '../models/partner/partner.model';
import { Plan } from '../models/plan/plan.model';
import { PartnerService } from '../services/partner/partner.service';
import { PlanService } from '../services/plan/plan.service';
import { PurchaseService } from '../services/purchase/purchase.service';

export enum SourceOrderResolver {
  BoxOffice = 'box-office',
  Kiosk = 'kiosk',
  Reschedule = 'reschedule',
}

export interface OrderData {
  autoPrint: boolean;
  customer?: Customer;
  isOssFlow: boolean;
  order: Order;
  ordersForPrint?: Order[] | null;
  ordersInGroup?: Order[] | null;
  plan: Plan | null;
}

@Injectable({
  providedIn: 'root',
})
export class OrderResolver implements Resolve<OrderData | null> {
  #location = inject(Location);
  #partnerService = inject(PartnerService);
  #plan: Plan | null = null;
  #planService = inject(PlanService);
  #purchaseService = inject(PurchaseService);
  #router = inject(Router);
  #spinnerService = inject(SpinnerService);
  #trackingService = inject(TrackingService);
  get navigation(): Navigation | null {
    return this.#router.getCurrentNavigation();
  }
  /**
   *  Only these need to be overridable by child classes
   */
  navigateToUrl = '/box-office';
  source: SourceOrderResolver = SourceOrderResolver.BoxOffice;

  resolve(route: ActivatedRouteSnapshot): Observable<OrderData | null> {
    const orderId = Number(route.paramMap.get('orderId') as string | null);
    if (isNaN(orderId)) {
      return throwError(() => new Error('Order ID is not a number'));
    }
    const isOssFlow = !!this.navigation?.extras?.state?.isOssFlow;
    let autoPrint = !!this.navigation?.extras?.state?.autoPrint;
    if (autoPrint && this.navigation?.extras?.state) {
      this.navigation.extras.state.autoPrint = false;
    } else {
      const locationValue = this.#location.getState() as unknown as Record<string, unknown>;
      autoPrint = locationValue ? !!locationValue['autoPrint'] : autoPrint;
    }
    if (this.navigation?.extras?.state) {
      const passedOrder: Order = this.#generatePassedOrder(this.navigation.extras.state.order);
      const isOrderValid: boolean = passedOrder?.id === orderId;
      if (isOrderValid && !!this.navigation.extras.state.plan) {
        this.#plan = Object.assign(new Plan(), this.navigation.extras.state.plan);
        this.#logAutoPrintEvent(passedOrder.id!, autoPrint);
        return of({ order: passedOrder, plan: this.#plan, autoPrint, isOssFlow });
      }
    }
    const partner: Partner | null = this.#partnerService.getPartner();
    if (this.navigation?.extras?.state?.plan) {
      this.#plan = Object.assign(new Plan(), this.navigation.extras.state.plan);
      this.#spinnerService.show();
      return this.#getOrderData(partner!.id, orderId, autoPrint, isOssFlow);
    } else {
      const planId = route.queryParamMap.get('planId');
      return this.#planService.getPlan(partner!.id, parseInt(planId!)).pipe(
        mergeMap(response => {
          if (response.data) {
            this.#plan = response.data;
            if (this.navigation?.extras?.state?.order) {
              const passedOrder: Order = this.#generatePassedOrder(this.navigation.extras.state.order);
              const isOrderValid: boolean = passedOrder?.id === orderId;
              if (isOrderValid && !!this.#plan && passedOrder.planId === this.#plan.id) {
                this.#logAutoPrintEvent(passedOrder.id!, autoPrint);
                return of({ order: passedOrder, plan: this.#plan, autoPrint, isOssFlow });
              } else {
                this.#router.navigate([this.navigateToUrl], { queryParamsHandling: 'merge' });
                return of(null);
              }
            }
            return this.#getOrderData(partner!.id, orderId, autoPrint, isOssFlow);
          }
          this.#router.navigate([], {});
          return throwError(() => response);
        }),
        catchError(err => throwError(() => err)),
      );
    }
  }

  #generatePassedOrder(orderJson: any): Order {
    if (!orderJson) {
      return new Order();
    }
    const passedOrder: Order = Object.assign(new Order(), orderJson);
    const passedSessionItemsByDatetime = new Map<string, CartSession[]>();
    Array.from(passedOrder.cart?.sessionItemsByDatetime.keys() ?? []).forEach((key: string) => {
      let passedCartSessions: CartSession[] = [];
      passedOrder.cart?.sessionItemsByDatetime.get(key)?.forEach((cartSession: CartSession) => {
        passedCartSessions = [...passedCartSessions, Object.assign(new CartSession(cartSession.sessionId), cartSession)];
      });
      passedSessionItemsByDatetime.set(key, passedCartSessions);
    });
    passedOrder.cart = Object.assign(new Cart(), orderJson.cart);
    if (passedOrder.cart) {
      passedOrder.cart.sessionItemsByDatetime = passedSessionItemsByDatetime;
    }
    return passedOrder;
  }

  #getOrderData(partnerId: number, orderId: number, autoPrint: boolean, isOssFlow: boolean): Observable<OrderData | null> {
    return this.#purchaseService.getOrder(partnerId, orderId).pipe(
      switchMap((response: BaseResponse<Order | null>) => {
        this.#spinnerService.hide();
        if (response.data !== null && response.data.planId !== undefined && response.data.planId === this.#plan?.id) {
          this.#logAutoPrintEvent(response.data!.id!, autoPrint);
          return of({ order: response.data, plan: this.#plan, autoPrint, isOssFlow }) as Observable<OrderData>;
        } else {
          this.#router.navigate([this.navigateToUrl], { queryParamsHandling: 'merge' });
          return of(null);
        }
      }),
    );
  }

  #logAutoPrintEvent(orderId: number, autoPrint: boolean): void {
    const previousUrl: string | undefined = this.navigation?.previousNavigation?.finalUrl?.toString();
    if (previousUrl !== undefined && this.#plan?.id !== undefined && this.#plan?.name !== undefined) {
      this.#trackingService.track(
        new AutoPrintStatusEvent({
          order_id: orderId,
          auto_print: autoPrint,
          previous_url: previousUrl,
          source: this.source,
          plan_id: this.#plan?.id,
          plan_name: this.#plan?.name,
        }),
      );
    }
  }
}

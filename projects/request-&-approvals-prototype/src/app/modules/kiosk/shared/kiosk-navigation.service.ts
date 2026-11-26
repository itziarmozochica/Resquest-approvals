import { Location } from '@angular/common';
import { inject, Injectable, NgZone } from '@angular/core';
import { NavigationExtras, Params, Router } from '@angular/router';

import { hasGroupedOrderIds } from '@fz-original/app/modules/box-office/purchased-cart/prepare-orders-for-print.util';
import { KioskPlanDetail, KioskPlanItem } from '@fz-original/app/modules/kiosk/models/kiosk-plan.model';
import { catchError, map, of, Subscription, take } from 'rxjs';

import { Cart } from '../../../shared/models/cart/cart.model';
import { Order } from '../../../shared/models/order/order.model';
import { Place } from '../../../shared/models/plan/place.model';
import { NavigationService } from '../../../shared/services/navigation/navigation.service';
import { PartnerService } from '../../../shared/services/partner/partner.service';
import { PurchaseService } from '../../../shared/services/purchase/purchase.service';
import { KioskRealTimeTimeslot, kioskRealTimeTimeslotStateKey } from '../models/kiosk-real-time-seating.model';
import { BookingOtokenStore } from '../services/booking/booking-otoken.store';
import { isKioskRealTimeTimeslot } from '../utils/kiosk-real-time-seating.util';
import { Customer } from './../../../shared/models/customer/customer.model';

@Injectable({
  providedIn: 'root',
})
export class KioskNavigationService {
  readonly #partnerService = inject(PartnerService);
  readonly #purchaseService = inject(PurchaseService);
  readonly #bookingOtokenStore = inject(BookingOtokenStore);
  readonly #router = inject(Router);
  #navigateOrderSubscription?: Subscription;

  constructor(
    private navigationService: NavigationService,
    private ngZone: NgZone,
    private location: Location,
  ) {}

  /** The timeslot the navigation in progress asks ticketing to reopen, read while that navigation creates ticketing. */
  getRealTimeSeatMapTimeslot(): KioskRealTimeTimeslot | null {
    const timeslot: unknown = this.#router.currentNavigation()?.extras.state?.[kioskRealTimeTimeslotStateKey];
    return isKioskRealTimeTimeslot(timeslot) ? timeslot : null;
  }

  private navigate(commands: any[], extras?: NavigationExtras): void {
    this.navigationService.navigate(commands, extras);
  }

  navigateTicketing(kioskPlan: KioskPlanDetail): void {
    let queryParams = {};
    if (kioskPlan) {
      const place: Place = kioskPlan.place;
      queryParams = {
        planId: kioskPlan.id,
        venueId: place.id,
        cityId: place.city?.standard_id ?? place.city?.id,
        timeless: kioskPlan.extra?.timeless ?? false,
      };
    }
    this.navigate(['/kiosk/ticketing'], { queryParams, queryParamsHandling: 'merge' });
  }

  navigatePlanDetail(kioskPlan: KioskPlanItem): void {
    const queryParams = { planId: kioskPlan.id };
    const navigationExtras: NavigationExtras = {
      queryParams,
      state: { plan: kioskPlan },
    };
    this.navigate(['/kiosk/detail'], navigationExtras);
  }

  navigateCheckout(cart: Cart, customer?: Customer, planDetailOverride?: KioskPlanDetail): void {
    const overrideQueryParams = planDetailOverride
      ? {
          planId: planDetailOverride.id,
          venueId: planDetailOverride.place.id,
          cityId: planDetailOverride.place.city?.standard_id ?? planDetailOverride.place.city?.id,
          timeless: planDetailOverride.extra?.timeless ?? false,
        }
      : undefined;
    const navigationExtras: NavigationExtras = {
      // Pass planDetailOverride as plan so KioskConfirmationResolver short-circuits and
      // skips the planService.getPlan HTTP call — the component reads plan from storage anyway.
      state: { cart, customer, ...(planDetailOverride !== undefined ? { plan: planDetailOverride } : {}) },
      queryParamsHandling: 'merge',
      ...(overrideQueryParams !== undefined ? { queryParams: overrideQueryParams } : {}),
    };
    this.navigate(['/kiosk/checkout/', cart.id], navigationExtras);
  }

  navigatePayment(cart: Cart, customer: Customer): void {
    const navigationExtras: NavigationExtras = {
      state: { cart, customer },
      queryParamsHandling: 'merge',
    };
    this.navigate(['/kiosk/payment/', cart.id], navigationExtras);
  }

  /** Ticketing reopens the seat map of `timeslot` empty; on a reload the state is gone and it starts from the datetime step. */
  navigateRealTimeSeatMap(kioskPlan: KioskPlanDetail, timeslot: KioskRealTimeTimeslot): void {
    this.#router.navigate(['/kiosk/ticketing'], {
      queryParams: this.#getRealTimeSeatMapQueryParams(kioskPlan),
      queryParamsHandling: 'merge',
      state: { [kioskRealTimeTimeslotStateKey]: timeslot },
    });
  }

  navigateBookingQuestions(cart: Cart, customer: Customer): void {
    const navigationExtras: NavigationExtras = {
      state: { cart, customer },
      queryParamsHandling: 'merge',
    };
    this.navigate(['/kiosk/booking-questions'], navigationExtras);
  }

  navigateOrder(order: Order, customer: Customer, cart?: Cart): void {
    const partner = this.#partnerService.getPartner();
    const cartId = cart?.id ?? order.cart?.id;

    if (partner === null || cartId === undefined) {
      this.#navigateToOrderConfirmation(order.id!, customer);
      return;
    }

    this.#navigateOrderSubscription?.unsubscribe();
    this.#navigateOrderSubscription = this.#purchaseService
      .searchOrders({ partnerId: partner.id, cartId })
      .pipe(
        map(response => response.data?.find(hasGroupedOrderIds)?.id ?? order.id),
        catchError(() => of(order.id)),
        take(1),
      )
      .subscribe(orderId => this.#navigateToOrderConfirmation(orderId!, customer));
  }

  #navigateToOrderConfirmation(orderId: number, customer: Customer): void {
    const navigationExtras: NavigationExtras = {
      state: { customer, autoPrint: true },
      queryParamsHandling: 'merge',
    };
    this.navigate(['/kiosk/order-confirmation/', orderId], navigationExtras);
  }

  navigateCategoryAllPlans(categoryId: string): void {
    this.navigate(['/kiosk/category', categoryId]);
  }

  navigateHome(): void {
    this.#bookingOtokenStore.clear();
    this.ngZone.run(() => {
      this.navigate(['/kiosk/home']);
    });
  }

  navigateManageBooking(): void {
    this.#bookingOtokenStore.clear();
    this.ngZone.run(() => {
      this.navigate(['/kiosk/booking/claim']);
    });
  }

  navigateBookingList(): void {
    this.navigate(['/kiosk/booking']);
  }

  navigateBack(): void {
    this.ngZone.run(() => {
      this.location.back();
    });
  }

  #getRealTimeSeatMapQueryParams(kioskPlan: KioskPlanDetail): Params {
    const place: Place = kioskPlan.place;
    return {
      cityId: place.city?.standard_id ?? place.city?.id,
      planId: kioskPlan.id,
      timeless: kioskPlan.extra?.timeless ?? false,
      venueId: place.id,
    };
  }
}

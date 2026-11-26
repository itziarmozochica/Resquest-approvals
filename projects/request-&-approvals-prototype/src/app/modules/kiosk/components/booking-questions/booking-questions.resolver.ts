import { inject } from '@angular/core';
import { Navigation, Router } from '@angular/router';

import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { DatadogLogLevel } from '../../../../core/error/datadog/logger/datadog-log.service';
import { ClickKioskBookingQuestionsEvent } from '../../../../core/tracking/core/events/click-kiosk-booking-questions';
import { ClickKioskPaymentEvent } from '../../../../core/tracking/core/events/click-kiosk-payment';
import { TrackingService } from '../../../../core/tracking/tracking.service';
import { BookingQuestionsService } from '../../../../shared/booking-questions/booking-questions.service';
import { BookingQuestion } from '../../../../shared/booking-questions/models';
import { Cart } from '../../../../shared/models/cart/cart.model';
import { Customer } from '../../../../shared/models/customer/customer.model';
import { KioskService } from '../../services/kiosk.service';
import { KioskNavigationService } from '../../shared/kiosk-navigation.service';

export interface BookingQuestionsData {
  cart: Cart;
  customer: Customer;
  bookingQuestions: Array<BookingQuestion>;
}

export function bookingQuestionsResolver(): Observable<BookingQuestionsData> {
  const bookingQuestionsService = inject(BookingQuestionsService);
  const kioskNavigationService = inject(KioskNavigationService);
  const kioskService = inject(KioskService);
  const router = inject(Router);
  const navigation: Navigation = router.getCurrentNavigation();
  const cart: Cart = navigation.extras.state.cart;
  const customer: Customer = navigation.extras.state.customer;
  const trackingService = inject(TrackingService);

  if ([cart, customer].includes(undefined)) {
    kioskService.logTrace('Missing navigation state data', DatadogLogLevel.Warn);
    return throwError(() => new Error('Missing navigation state data'));
  }

  return bookingQuestionsService.getQuestions(cart.id).pipe(
    map((bookingQuestions: BookingQuestion[]) =>
      bookingQuestions.filter((bookingQuestion: BookingQuestion) => bookingQuestion.when === 'pre_booking'),
    ),
    tap((filteredBookingQuestions: BookingQuestion[]) => {
      if (filteredBookingQuestions.length === 0) {
        trackingService.track(
          new ClickKioskPaymentEvent({
            cartId: cart.id,
            customerId: customer?.id,
          }),
        );
        kioskNavigationService.navigatePayment(cart, customer);
      } else {
        trackingService.track(
          new ClickKioskBookingQuestionsEvent({
            cartId: cart.id,
            customerId: customer?.id,
          }),
        );
      }
    }),
    map((bookingQuestions: BookingQuestion[]) => ({
      cart,
      customer,
      bookingQuestions,
    })),
    catchError((err: unknown) => throwError(() => err)),
  );
}

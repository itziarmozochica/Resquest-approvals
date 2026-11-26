import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { BookingOtokenStore } from './booking-otoken.store';

const CLAIM_ROUTE = '/kiosk/booking/claim';

/**
 * Protects the native booking screens: allows activation only when a booking
 * `otoken` is present, otherwise redirects to the claim entry so the customer
 * can identify their booking.
 */
export const bookingOtokenGuard: CanActivateFn = (): boolean | UrlTree => {
  const store = inject(BookingOtokenStore);
  const router = inject(Router);

  return store.get() ? true : router.createUrlTree([CLAIM_ROUTE]);
};

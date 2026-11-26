import { inject, Injectable } from '@angular/core';

import { KioskNavigationService } from '../../shared/kiosk-navigation.service';
import { BookingOtokenStore } from './booking-otoken.store';

/**
 * Owns the lifecycle of a native kiosk booking session: storing the otoken on
 * entry and tearing it down (clearing the token + returning home) on idle
 * timeout, the Finish action, or when a new customer starts.
 */
@Injectable({ providedIn: 'root' })
export class BookingSessionService {
  readonly #store = inject(BookingOtokenStore);
  readonly #navigation = inject(KioskNavigationService);

  endSession(): void {
    // Delegate to the single teardown path so cleanup + zone-safe navigation
    // never drift from `navigateHome()` (which already clears the token).
    this.#navigation.navigateHome();
  }

  startSession(otoken: string): void {
    this.#store.clear();
    this.#store.set(otoken);
  }
}

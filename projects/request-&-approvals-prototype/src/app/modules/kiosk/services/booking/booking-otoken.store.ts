import { inject, Injectable } from '@angular/core';

import { STORAGE_SERVICE } from '@fz/storage';

const BOOKING_OTOKEN_STORAGE_KEY = 'bookingOtoken';

/**
 * A booking session is considered stale after this window. On a shared kiosk this
 * bounds how long an orphaned token (e.g. one that survived a crash/restart) can be
 * treated as a live session, independent of the exit-path cleanup.
 */
const BOOKING_SESSION_TTL_MS = 15 * 60 * 1000;

interface BookingSession {
  issuedAt: number;
  otoken: string;
}

/**
 * Holds the order-group access token (`otoken`) for a kiosk booking session.
 *
 * Persists `{ otoken, issuedAt }` so reads can enforce a TTL: a token past
 * `BOOKING_SESSION_TTL_MS` (or in an unexpected shape) is treated as absent and
 * evicted. Cleared explicitly on every session boundary (bootstrap, session
 * start, and every exit path).
 */
@Injectable({ providedIn: 'root' })
export class BookingOtokenStore {
  readonly #storage = inject(STORAGE_SERVICE);

  clear(): void {
    this.#storage.remove(BOOKING_OTOKEN_STORAGE_KEY);
  }

  get(): string | null {
    const session = this.#storage.get<BookingSession>(BOOKING_OTOKEN_STORAGE_KEY);
    if (!session || typeof session.otoken !== 'string' || typeof session.issuedAt !== 'number') {
      return null;
    }

    if (Date.now() - session.issuedAt > BOOKING_SESSION_TTL_MS) {
      this.clear();
      return null;
    }

    return session.otoken;
  }

  set(otoken: string): void {
    this.#storage.set<BookingSession>(BOOKING_OTOKEN_STORAGE_KEY, { issuedAt: Date.now(), otoken });
  }
}

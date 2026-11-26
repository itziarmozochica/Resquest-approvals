import { Injectable, signal, WritableSignal } from '@angular/core';

/** One-shot bypass for `hasUnsavedChangesGuard` when OSS navigates to checkout / order / purchased-cart. Provided on `TicketingWrapperComponent`. */
@Injectable()
export class TicketingUnsavedChangesBypassService {
  readonly #pendingBypass: WritableSignal<boolean> = signal(false);

  consumePendingBypass(): boolean {
    if (!this.#pendingBypass()) {
      return false;
    }
    this.#pendingBypass.set(false);
    return true;
  }

  clearPendingBypass(): void {
    this.#pendingBypass.set(false);
  }

  hasPendingBypass(): boolean {
    return this.#pendingBypass();
  }

  markPendingBypass(): void {
    this.#pendingBypass.set(true);
  }
}

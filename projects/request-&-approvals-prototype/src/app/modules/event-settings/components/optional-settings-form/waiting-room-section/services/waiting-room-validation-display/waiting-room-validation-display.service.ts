import { Injectable, signal } from '@angular/core';

@Injectable()
export class WaitingRoomValidationDisplayService {
  readonly #showValidationErrors = signal(false);

  readonly showValidationErrors = this.#showValidationErrors.asReadonly();

  disableValidationErrors(): void {
    this.#showValidationErrors.set(false);
  }

  enableValidationErrors(): void {
    this.#showValidationErrors.set(true);
  }
}

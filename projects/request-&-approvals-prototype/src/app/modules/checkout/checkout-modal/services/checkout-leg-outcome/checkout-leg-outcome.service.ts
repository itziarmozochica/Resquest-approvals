import { inject, Injectable } from '@angular/core';

import { timer, type Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

import { CHECKOUT_PAYMENT_PORT, type CheckoutPaymentResult } from '../../models/checkout-payment-port.model';

type SucceededPaymentResult = Extract<CheckoutPaymentResult, { kind: 'succeeded' }>;

const SIMULATED_RESULT: SucceededPaymentResult = { kind: 'succeeded' };

@Injectable()
export class CheckoutLegOutcomeService {
  static readonly simulatedResultDelayMs = 2000;

  readonly #port = inject(CHECKOUT_PAYMENT_PORT, { optional: true });

  isDriven(): boolean {
    return this.#port?.isDriven() ?? false;
  }

  observeLeg(): Observable<CheckoutPaymentResult> {
    const port = this.#port;
    if (port === null || !port.isDriven()) {
      return timer(CheckoutLegOutcomeService.simulatedResultDelayMs).pipe(map(() => SIMULATED_RESULT));
    }
    return port.result$.pipe(take(1));
  }
}

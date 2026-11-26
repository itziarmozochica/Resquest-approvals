import { Injectable } from '@angular/core';

import { PaymentType } from '../../../checkout/models/payment-type.enum';

const PAYMENT_TYPES: ReadonlySet<string> = new Set<string>(Object.values(PaymentType));

@Injectable({ providedIn: 'root' })
export class PaymentMethodCodeResolver {
  resolve(code: string): PaymentType | null {
    return PAYMENT_TYPES.has(code) ? (code as PaymentType) : null;
  }
}

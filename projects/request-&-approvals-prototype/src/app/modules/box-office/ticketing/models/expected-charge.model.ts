import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Money } from '@fz-original/app/shared/models/money.model';

/** The charge the till shows the operator: the server must charge exactly this, or nothing. */
export interface ExpectedCharge {
  couponCode: string | null;
  total: Money;
}

export class ChargeMismatchError extends Error {
  constructor(
    readonly expected: ExpectedCharge,
    readonly charged: ExpectedCharge,
    readonly cart: Cart,
  ) {
    super('The server charge differs from the charge shown at the till');
    this.name = 'ChargeMismatchError';
  }
}

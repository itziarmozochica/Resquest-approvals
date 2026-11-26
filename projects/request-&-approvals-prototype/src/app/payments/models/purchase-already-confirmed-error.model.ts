import { CartPaymentCheckoutError } from './cart-payment-checkout-error.model';

export class PurchaseAlreadyConfirmedError extends CartPaymentCheckoutError {
  constructor(checkoutError: unknown) {
    super(checkoutError);
    this.name = 'PurchaseAlreadyConfirmedError';
  }
}

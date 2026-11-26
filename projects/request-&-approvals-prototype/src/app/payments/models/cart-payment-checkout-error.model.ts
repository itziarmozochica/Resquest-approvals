export class CartPaymentCheckoutError extends Error {
  constructor(readonly checkoutError: unknown) {
    super('checkout.payment.checkoutFailed');
    this.name = 'CartPaymentCheckoutError';
  }
}

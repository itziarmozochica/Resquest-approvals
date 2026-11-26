export const CHECKOUT_PAYMENT_ALREADY_TAKEN_REASON = 'checkout.payment.alreadyTaken';

export const CHECKOUT_BOOKING_SOLD_OUT_REASON = 'checkout.booking.soldOut';

export const CHECKOUT_SHIFT_REQUIRED_REASON = 'errors.SHIFT_REQUIRED';

export const CHECKOUT_TAP_TO_PAY_NOT_READY_REASON = 'checkout.tapToPay.deviceNotReady';

export const CHECKOUT_TAP_TO_PAY_APP_UPDATE_REQUIRED_REASON = 'checkout.tapToPay.appUpdateRequired';

export class PaymentAlreadyTakenError extends Error {
  constructor(readonly sessionPaidAmount: number) {
    super(CHECKOUT_PAYMENT_ALREADY_TAKEN_REASON);
    this.name = 'PaymentAlreadyTakenError';
  }
}

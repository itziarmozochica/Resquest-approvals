/** Front-side mirror of the fever2 split-payment event taxonomy; values must stay byte-identical. */
export enum SplitPaymentEvent {
  CartPaymentOutcomeUnknown = 'cart_payment_outcome_unknown',
  SessionCancelRequested = 'session_cancel_requested',
  SessionCancelUnresolved = 'session_cancel_unresolved',
}

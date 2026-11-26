/** Mirrors fever2 `SplitCancelState`. `Quick` (no leg paid) never reaches the backend; `AfterPayment` is the money-risk case. */
export enum SplitCancelState {
  AfterPayment = 'after_payment',
  Quick = 'quick',
}

export enum PaymentCheckout {
  adyen,
  adyen_local,
  delegated,
  free,
  square,
  payhere,
  razorpay,
  stripe,
  fever,
  globalpayments,
}

export type PaymentCheckoutET = keyof typeof PaymentCheckout;

export enum PaymentCheckoutDeposit {
  fever,
  stripe,
  delegated,
}

export type PaymentCheckoutDepositET = keyof typeof PaymentCheckoutDeposit;

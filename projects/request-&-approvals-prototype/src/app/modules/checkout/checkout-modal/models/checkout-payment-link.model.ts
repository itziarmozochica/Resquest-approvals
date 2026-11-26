/**
 * Offered by the opener when the checkout can end with a payment link instead of a charge at the
 * desk. It is never a payment method: nothing is charged, so it must not reach the purchase
 * pipeline as a `PaymentType`.
 */
export interface CheckoutPaymentLinkOption {
  defaultDurationMinutes: number;
  /** Latest instant the link may expire at (ISO 8601 with offset). */
  latestExpiresAt: string;
  /** Timezone the expiry is shown in (the venue's). */
  timezone: string;
}

export interface CheckoutPaymentLinkRequest {
  /** ISO 8601 with offset. */
  expiresAt: string;
}

/**
 * `messageKey` is a translation key resolved by the opener. `endsCheckout` closes the modal: the
 * opener can no longer take a payment for this checkout (e.g. the cart hold lapsed).
 */
export type CheckoutPaymentLinkResult = { kind: 'created' } | { endsCheckout: boolean; kind: 'failed'; messageKey: string };

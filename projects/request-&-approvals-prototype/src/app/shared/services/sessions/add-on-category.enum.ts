export enum AddOnCategory {
  regular = 'regular',
  premiumRefundPolicy = 'premium_refund_policy',
  transactionFee = 'transaction_fee',
  cancellationInsurance = 'cancellation_insurance',
}

export function isAddOnCategory(value: unknown): value is AddOnCategory {
  return Object.values<unknown>(AddOnCategory).includes(value);
}

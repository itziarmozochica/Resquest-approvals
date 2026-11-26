export const partialRefundModes = {
  FIXED_AMOUNT: 'fixed_amount',
  PERCENTAGE: 'percentage',
} as const;

export type PartialRefundMode = (typeof partialRefundModes)[keyof typeof partialRefundModes];

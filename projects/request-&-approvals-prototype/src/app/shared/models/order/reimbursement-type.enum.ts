/** The `reimbursement_type` of an order cancellation, as fever2 records it and the cancel endpoint takes it. */
export enum ReimbursementType {
  ManualRefund = 'manual_refund',
  NoRefund = 'no_refund',
  OnsitePosRefund = 'onsite_pos_refund',
  OriginalMethod = 'refund',
  Voucher = 'promotion_code',
}

export function isReimbursementType(value: unknown): value is ReimbursementType {
  return Object.values<unknown>(ReimbursementType).includes(value);
}

export const DEPOSIT_REFUND_VOUCHER_CANCELLATION_CODE = 25160160;

export function resolveDepositRefundErrorSuffix(errorCode?: number | string): string {
  if (errorCode != null && Number(errorCode) === DEPOSIT_REFUND_VOUCHER_CANCELLATION_CODE) {
    return 'voucherCancellationError';
  }
  return 'error';
}

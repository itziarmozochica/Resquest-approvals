const mismatchedTransactionMessage = 'Applying a mismatched transaction';

export function isMismatchedTransactionError(error: unknown): boolean {
  return error instanceof RangeError && error.message === mismatchedTransactionMessage;
}

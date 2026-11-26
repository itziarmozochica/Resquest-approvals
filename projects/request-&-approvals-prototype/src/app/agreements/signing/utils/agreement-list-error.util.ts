const genericErrorKey = 'agreements.signing.modal.list.error';

const errorKeyByStatus: Record<number, string> = {
  403: 'agreements.signing.modal.list.errorNotAllowed',
  404: 'agreements.signing.modal.list.errorNotFound',
};

/**
 * The message an operator reads when the listing fails. "Please try again" is the wrong advice for
 * an order that is not this partner's or no longer exists, so those two get their own copy and
 * everything else falls back to the retryable message.
 */
export function resolveAgreementListErrorKey(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return genericErrorKey;
  }
  const { status } = error;
  if (typeof status !== 'number') {
    return genericErrorKey;
  }
  return errorKeyByStatus[status] ?? genericErrorKey;
}

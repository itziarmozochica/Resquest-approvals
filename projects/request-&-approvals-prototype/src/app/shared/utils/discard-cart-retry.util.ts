import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';

export const PARTNERS_DISCARD_RETRY_DELAY_MS = 500;
export const CART_DISCARDED_FISCAL_ABORT_PENDING_ERROR_CODE = 'CART_DISCARDED_FISCAL_ABORT_PENDING' as const;

export function isRetriableDiscardError(error: unknown): boolean {
  return error instanceof HttpErrorResponse && (error.status === 0 || error.status >= HttpStatusCode.InternalServerError);
}

export function pickDiscardError(firstError: unknown, lastError: unknown): unknown {
  return isCartDiscardedWithFiscalAbortPendingError(firstError) ? firstError : lastError;
}

function isCartDiscardedWithFiscalAbortPendingError(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.error?.error?.code === CART_DISCARDED_FISCAL_ABORT_PENDING_ERROR_CODE;
}

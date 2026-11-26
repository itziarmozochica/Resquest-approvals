import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';

import type { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { CART_DISCARDED_FISCAL_ABORT_PENDING_ERROR_CODE } from '@fz-original/app/shared/utils/discard-cart-retry.util';

export const CART_NOT_FOUND_ERROR_CODE = '801' as const;
export const DISCARD_CART_INVALID_ERROR_CODE = '911' as const;

export interface DiscardFailureContext {
  code: number | string | null;
  reason: string | null;
  status: number | null;
}

export function isDiscardedWithFiscalAbortPending(response: BaseResponse<boolean | null>): boolean {
  return response.error?.code === CART_DISCARDED_FISCAL_ABORT_PENDING_ERROR_CODE;
}

export function getDiscardFailureContext(response: BaseResponse<boolean | null>): DiscardFailureContext {
  const httpError: unknown = response.error?.error;
  if (!(httpError instanceof HttpErrorResponse)) {
    return { code: response.error?.code ?? null, reason: null, status: null };
  }
  return { code: response.error?.code ?? null, reason: readReason(httpError.error), status: httpError.status };
}

export function isBenignDiscardFailure(failure: DiscardFailureContext): boolean {
  const code = String(failure.code);
  return code === CART_NOT_FOUND_ERROR_CODE || (code === DISCARD_CART_INVALID_ERROR_CODE && failure.status === HttpStatusCode.BadRequest);
}

function readReason(body: unknown): string | null {
  if (!isRecord(body) || !isRecord(body['data'])) {
    return null;
  }
  const reason = body['data']['reason'];
  return typeof reason === 'string' ? reason : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

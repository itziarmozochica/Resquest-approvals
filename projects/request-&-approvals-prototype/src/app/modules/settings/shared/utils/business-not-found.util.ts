import { HttpErrorResponse } from '@angular/common/http';

const BUSINESS_NOT_FOUND_CODE = 'BUSINESS_NOT_FOUND';

export function isBusinessNotFound(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.error?.error?.code === BUSINESS_NOT_FOUND_CODE;
}

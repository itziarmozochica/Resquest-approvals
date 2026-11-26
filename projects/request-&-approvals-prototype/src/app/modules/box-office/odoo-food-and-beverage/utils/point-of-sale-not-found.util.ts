import { HttpErrorResponse } from '@angular/common/http';

import { readErrorCode } from './read-error-code.util';

const POINT_OF_SALE_NOT_FOUND_CODE = 'POINT_OF_SALE_NOT_FOUND';
const NOT_FOUND_STATUS = 404;

export function isPointOfSaleNotFoundError(error: unknown): boolean {
  if (error instanceof HttpErrorResponse && error.status === NOT_FOUND_STATUS) {
    return true;
  }

  return readErrorCode(error) === POINT_OF_SALE_NOT_FOUND_CODE;
}

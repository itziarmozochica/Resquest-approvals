import { HttpErrorResponse } from '@angular/common/http';

const ONSITE_SETUP_NOT_FOUND_CODE = 'ONSITE_SETUP_DOES_EXIST';
const NOT_FOUND_STATUS = 404;
const MAX_ENVELOPE_DEPTH = 3;

export function isOnsiteSetupNotFoundError(error: unknown): boolean {
  if (error instanceof HttpErrorResponse) {
    return error.status === NOT_FOUND_STATUS || readErrorCode(error.error) === ONSITE_SETUP_NOT_FOUND_CODE;
  }

  return readErrorCode(error) === ONSITE_SETUP_NOT_FOUND_CODE;
}

function readErrorCode(error: unknown): string | null {
  let current = error;

  for (let depth = 0; depth < MAX_ENVELOPE_DEPTH; depth += 1) {
    if (!isRecord(current)) {
      return null;
    }

    if (typeof current.code === 'string') {
      return current.code;
    }

    current = current.error;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

import { HttpErrorResponse } from '@angular/common/http';

const MAX_ENVELOPE_DEPTH = 3;

export function readErrorCode(error: unknown): string | null {
  let current = error instanceof HttpErrorResponse ? error.error : error;

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

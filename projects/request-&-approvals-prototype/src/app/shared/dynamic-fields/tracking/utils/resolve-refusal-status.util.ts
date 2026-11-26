import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';

export function resolveRefusalStatus(error: unknown): number | null {
  const status = error instanceof HttpErrorResponse ? error.status : 0;
  return status === HttpStatusCode.Unauthorized ? null : status;
}

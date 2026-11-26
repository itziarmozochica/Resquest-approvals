import { MonoTypeOperatorFunction, Observable, retry, throwError, timer } from 'rxjs';

export interface RetryWithBackoffConfig {
  readonly initialDelayMs: number;
  readonly maxTotalDelayMs: number;
  readonly shouldRetry: (error: unknown) => boolean;
}

export function retryWithBackoff<T>({ initialDelayMs, maxTotalDelayMs, shouldRetry }: RetryWithBackoffConfig): MonoTypeOperatorFunction<T> {
  return retry({
    delay: (error: unknown, retryCount: number): Observable<unknown> => {
      const totalDelayMs = initialDelayMs * (2 ** retryCount - 1);

      if (!shouldRetry(error) || totalDelayMs > maxTotalDelayMs) {
        return throwError(() => error);
      }

      return timer(initialDelayMs * 2 ** (retryCount - 1));
    },
  });
}

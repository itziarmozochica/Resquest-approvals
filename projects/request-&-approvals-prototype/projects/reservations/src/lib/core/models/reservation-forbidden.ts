export const RESERVATION_FORBIDDEN_CODE = 403;

/**
 * A distributor may not act for this partner. It arrives as a thrown `HttpErrorResponse` like any other
 * failure - the clients let those through, as `@fz/ticketing` does - so consumers branch on it inside
 * their `catchError` instead of hardcoding the status.
 */
export function isReservationNotAllowed(error: unknown): boolean {
  return (error as { status?: number } | null)?.status === RESERVATION_FORBIDDEN_CODE;
}

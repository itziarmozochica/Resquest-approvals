/**
 * Order status as the partners orders list endpoint sends it, and as its `status` filter accepts it
 * (`CancelledByCoverGenius`, `CancelledCoveredByFever` and `unknown` are response-only).
 */
export enum OrderSummaryStatus {
  active = 'active',
  cancelled = 'cancelled',
  CancelledByCoverGenius = 'cancelled_by_cover_genius',
  CancelledCoveredByFever = 'cancelled_covered_by_fever',
  unknown = 'unknown',
}

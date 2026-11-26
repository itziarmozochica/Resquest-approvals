/**
 * Payload the Insights Portal reads. It travels serialized in two places: JSON inside the
 * `real_time_reports_selection` cookie and the `payload` of the `postMessage` sent to the iframe.
 * The property names are a wire contract (PRD-4266, C11): renaming any of them compiles cleanly
 * and the portal silently stops understanding the selection.
 */
export interface RealTimeFiltersEmbeddedSelection {
  currency: string;
  partnerId: number;
  planIds: number[];
}

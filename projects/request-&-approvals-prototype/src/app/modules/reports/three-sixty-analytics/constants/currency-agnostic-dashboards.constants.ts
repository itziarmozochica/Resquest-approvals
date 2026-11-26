/**
 * Dashboards whose cards never map the `currency` parameter, so the picker cannot change what they
 * render: the figures come out in the event's own currency whatever is selected. Leaving the picker
 * free lets a partner label local figures as USD and believe it.
 *
 * While one of these is open the picker is pinned to the selected event's currency. That is only
 * unambiguous because every id here is also in `SINGLE_PLAN_DASHBOARD_EXTERNAL_IDS`: one event means
 * one city, so there is exactly one currency to pin to. Do not extend this list to dashboards that
 * accept several events without solving what "local" means for a mixed-currency selection first.
 *
 * Verifiable the same way as the single-plan list: in Snowflake, no card target in
 * `DWH_FEVER.METABASE_METADATA.MTB_DIM_DASHBOARD_CARD.JSON_PARAMETER_MAPPINGS` (with
 * `DS_INSTANCE = 'feverzone'`) carries the `currency` template tag.
 *
 * 45 dashboards across the whole 360 catalog share this shape; only the single-plan ones are pinned
 * here. Names are the tab labels from the graph catalog — match on the id, never on the name.
 */
export const CURRENCY_AGNOSTIC_DASHBOARD_EXTERNAL_IDS: ReadonlySet<number> = new Set([
  133, // Booking Questions
  334, // Invoicing
  464, // Sales per purchase ticket price
  465, // Interest after Sold out
  562, // Sales by Employee
  595, // Net Revenue
  596, // Merch
  1158, // Data Comparison
  1260, // Orders with phone log in
  2740, // Marketing Performance
  2773, // Last click attribution
  4357, // UTMs
  4753, // Installments
  4918, // Sales Summary Real Time
  6437, // Landing page traffic
  8681, // Ambassadors points
  9340, // Prize Draw
  9342, // Redeem Now
]);

/**
 * Dashboards whose plan filter is a plain Metabase template variable compared with `=`
 * (`where id_plan = {{id_plan}}`): the embed substitutes a multi-plan selection into the tag as a
 * comma-joined list, which `=` cannot take, so several plan ids render misleading data or error.
 *
 * Client-side stopgap: no backend rule applies this today. An equivalent `GraphRestrictionFilter`
 * change was proposed in (internal repository)#4939 and closed, so this list is the only thing that keeps
 * these tabs honest. If that rule ever ships, the graphs stop being returned and this list can go.
 *
 * Add an id here on the evidence that its plan filter is a `variable`, not on whether the graph is
 * currently served with several plans: listing one that never arrives is a no-op, while leaving one
 * out shows wrong numbers. `LAKE.B2B_PARTNERS_LAKE_GRAPH` lags real registrations by days, so it
 * cannot rule out that a dashboard reaches a multi-plan view.
 *
 * The binding is verifiable without opening Metabase: in Snowflake, each card's target in
 * `DWH_FEVER.METABASE_METADATA.MTB_DIM_DASHBOARD_CARD.JSON_PARAMETER_MAPPINGS` (with
 * `DS_INSTANCE = 'feverzone'`) reads either `["dimension", ["template-tag", "id_plan"], …]` for a
 * field filter or `["variable", ["template-tag", "id_plan"]]` for the single-plan case below.
 *
 * A `variable` binding alone is not disqualifying: the embed delivers the whole selection into the
 * tag, so a dashboard whose every card wraps it in `IN ({{id_plan}})` renders a multi-plan
 * selection correctly and must not be listed — that is why Real-Time Attendance (5380) is not
 * here. The card SQL is the deciding evidence, not the binding. Sales Summary Real Time (4918)
 * stays listed because its cards still compare with `=`; it leaves once they are converted to IN().
 *
 * Names are the tab labels from the graph catalog (`LAKE.B2B_PARTNERS_LAKE_GRAPH.NAME`), which often
 * differ from the Metabase dashboard title — match on the id, never on the name.
 */
export const SINGLE_PLAN_DASHBOARD_EXTERNAL_IDS: ReadonlySet<number> = new Set([
  7, // Marketing
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
  3763, // Magnati - Merch
  4357, // UTMs
  4753, // Installments
  4918, // Sales Summary Real Time — until its cards are converted to IN()
  5611, // Marketing
  5644, // Marketing
  6437, // Landing page traffic
  6438, // Marketing
  6865, // Marketing
  7030, // Bundle reporting — mixed: only some cards bind the variable, converting them frees the tab
  8020, // promo_code_invitation_dashboard — mixed, same as above
  8681, // Ambassadors points
  9340, // Prize Draw
  9342, // Redeem Now
]);

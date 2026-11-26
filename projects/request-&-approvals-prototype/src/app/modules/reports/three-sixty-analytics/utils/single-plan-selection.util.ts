/**
 * The single-plan rule of the Real Time tab, in one place (PRD-4516 §3.3).
 *
 * Two surfaces have to agree on **which** plan survives: the filter bar, which renders it, and the
 * embed selection the host writes to the portal's cookie. They collapse at different moments — the bar
 * when its mode turns on, the cookie when the tab is entered — so a second copy of `slice(0, 1)` would
 * be an invariant held by coincidence, and the portal would server-render one plan while the bar shows
 * another.
 */
export function capToSinglePlan(planIds: Array<number>): Array<number> {
  return planIds.slice(0, 1);
}

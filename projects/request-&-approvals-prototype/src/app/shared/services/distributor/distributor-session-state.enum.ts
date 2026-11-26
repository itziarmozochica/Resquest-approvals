/**
 * Whether this session acts as a distributor — and, crucially, whether that is **known yet**
 * (B2BR-5591 · WI-15).
 *
 * The third state is the point. Resolving it takes two round trips (`getMe()` → `getDistributor()`),
 * and the router's initial navigation starts at bootstrap, so a guard can easily run before either
 * has answered. A plain boolean makes that window indistinguishable from a settled *no*, which is
 * how a gate keyed on it opens for everyone on a typed URL or a bookmark.
 */
export enum DistributorSessionState {
  /** Resolved: `partnerConfigs` hold the partners this distributor may act for. */
  Distributor = 'distributor',
  /** Resolved: an ordinary business, or a distributor session that degraded to the user-scoped path. */
  NotADistributor = 'notADistributor',
  /** Not resolved: bootstrap has not answered. Never read this as a *no* — wait for it. */
  Unknown = 'unknown',
}

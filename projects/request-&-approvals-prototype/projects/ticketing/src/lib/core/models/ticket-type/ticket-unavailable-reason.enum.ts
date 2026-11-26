/**
 * Why a ticket row cannot be selected — the **single source of truth** for sold-out/disabled
 * (spec §6.9), replacing legacy's two disagreeing decision points.
 *
 * Intrinsic to one ticket type only. Reasons that depend on the rest of the selection
 * (single-session lock, cart-level minimums) are the orchestrator's concern and are layered on
 * top of this by the caller.
 */
export enum TicketUnavailableReason {
  /** The configured ceiling field is absent or non-finite — legacy's `hasDefinedMax` gate. */
  NoDefinedCeiling = 'noDefinedCeiling',
  /** The backend marks the type as not purchasable. */
  NotPurchasable = 'notPurchasable',
  /** No quantity satisfies the bounds: the step-aligned ceiling is below the floor, or is 0. */
  SoldOut = 'soldOut',
}

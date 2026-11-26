/**
 * The agreement gate's answer to *may this distributor reserve for the partner it has chosen?*
 * (B2BR-5591 · B2BR-5377 §4.6–§4.7).
 *
 * **No two members may be collapsed.** Two of the distinctions are load-bearing rather than cosmetic:
 *
 * - {@link NotAllowed} vs {@link Unavailable} — a clean refusal explains itself with silence (nothing
 *   failed); a missing answer is a failure that happens to be *treated* as a refusal. Merging them
 *   either invents an error where there is none, or hides a real one.
 * - {@link NotAsked} vs {@link Checking} — the question does not apply, versus it does and the answer
 *   is on its way. `Checking` also covers *we do not know whether this is even a distributor session
 *   yet*, which must never collapse into `NotAsked`: a route guard opens on `NotAsked`.
 *
 * Only {@link Allowed} permits the action. Everything else is a refusal — see
 * `AgreementGateService.canReserveForSelectedPartner`, which is the safe way to ask.
 */
export enum AgreementGateStatus {
  /** The resolved permission set contains the reserve permission. The one permissive value. */
  Allowed = 'allowed',
  /** The answer is on its way, or the session is not yet known to be a distributor one. Do not guess. */
  Checking = 'checking',
  /** The set came back without the reserve permission. A decision, not a failure: show nothing. */
  NotAllowed = 'notAllowed',
  /**
   * The question does not apply, so no request was made: the flag is off, this is not a distributor
   * session, or no partner is chosen. Nothing is being authorized — **a route guard opens on this**,
   * which is why *we could not ask* belongs in {@link Unavailable} instead.
   */
  NotAsked = 'notAsked',
  /**
   * No answer at all. The request failed, carried no data, timed out, or could not be addressed for
   * want of a distributor organization. Fail closed (§4.7, R5).
   */
  Unavailable = 'unavailable',
}

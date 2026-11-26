/**
 * How the decrease floor is derived — ported from feverzone `MinLimitTicketFieldEnum` (§6.7).
 * `None` → floor is 0 (decrement disabled only at 0); `Minimum` → floor is the effective minimum.
 *
 * As with {@link MaxLimitTicketField}, the string values are historical — `decreaseFloor()` switches
 * on the member rather than indexing the model with them.
 */
export enum MinLimitTicketField {
  Minimum = 'minimum',
  None = 'none',
}

export interface ReservationExternalLocatorBody {
  external_locator_id: string | null;
}

/**
 * The one mapper here that sends its key unconditionally, against the package's "absent means absent" rule:
 * `PartnerSetReservationExternalLocatorIdRequest` declares `external_locator_id` with no default, so an absent
 * key is a **400**, and `null` is how the reference is cleared. Omitting it would make clearing impossible.
 *
 * Nothing is trimmed or length-checked on the way out. The backend normalizes and answers the result, and a
 * library that pre-validated would own a rule it cannot keep in step.
 */
export function toExternalLocatorBody(externalReservationId: string | null): ReservationExternalLocatorBody {
  return { external_locator_id: externalReservationId };
}

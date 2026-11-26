export interface ReservationExternalLocatorApi {
  external_locator_id?: string | null;
}

/**
 * The reseller's own reference on a reservation — its id in whatever system booked it.
 *
 * The field is `externalReservationId` rather than `externalLocatorId` because that is what
 * [`Reservation`](./reservation.model.ts) already calls it, and the domain is FeverZone's field for field. The
 * endpoint, the route segment and the wire key all say `external_locator` instead; the mapper is the only place
 * that has to know both names.
 *
 * It is a wrapper around one nullable string on purpose. `null` inside it means _the reference was cleared_,
 * which is a value; a `null` answer from the call means _the envelope carried no data_, which is not. Returning
 * the bare string would collapse the two.
 */
export interface ReservationExternalLocator {
  readonly externalReservationId: string | null;
}

/**
 * Shared payload for the `ModifyReservation|*` tracking events.
 *
 * Most modify-reservation events carry the same reservation context; event-specific
 * factories alias this type directly or extend it with their extra fields.
 */
export interface ModifyReservationEventData {
  cartId: string;
  channel: string;
  placeId: number;
  placeName: string;
  planId: number;
  planName: string;
  reservationId: string;
  businessType?: string;
}

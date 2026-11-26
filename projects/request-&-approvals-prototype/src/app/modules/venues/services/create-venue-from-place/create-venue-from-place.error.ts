export type CreateVenueFailureReason = 'duplicate' | 'unknown';

export class CreateVenueFromPlaceError extends Error {
  readonly placeId: number | undefined;
  readonly reason: CreateVenueFailureReason;

  constructor(reason: CreateVenueFailureReason, placeId?: number) {
    super();
    this.name = 'CreateVenueFromPlaceError';
    this.reason = reason;
    this.placeId = placeId;
  }
}

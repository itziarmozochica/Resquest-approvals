import { GooglePlace } from '@fz-original/app/modules/content-plan/models/google-places.model';

export interface CreateVenueFromPlaceData {
  cityId: number;
  cityName: string;
  place: GooglePlace;
}

export type CreateVenueFormVariant = 'advanced' | 'quick';

import { defineEvent } from '@fz/fz-tracking/src/public-api';

import type { CreateEventFlow } from '../models/plan-tracking.model';

export interface CreateVenuePlaceSelectedData {
  creationFlow: CreateEventFlow;
  mapping: boolean;
  placeAddress: string;
  placeCity: string | null;
  placeCountry: string | null;
  placeGooglePlaceId: string;
  placeLatitude: number;
  placeLongitude: number;
  placeName: string;
  placeRegion: string | null;
  placeZipCode: string | null;
}

export const createVenuePlaceSelected = defineEvent<CreateVenuePlaceSelectedData>('createVenue.placeSelected');

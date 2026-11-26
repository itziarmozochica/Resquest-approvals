import { defineEvent } from '@fz/fz-tracking/src/public-api';

import type { CreateEventFlow } from '../models/plan-tracking.model';

export interface CreateVenueVenueCreatedData {
  creationFlow: CreateEventFlow;
  venueAddress?: string;
  venueCityName?: string;
  venueGooglePlaceId?: string;
  venueId: number;
  venueLatitude?: number;
  venueLongitude?: number;
  venueName: string;
  venueZipCode?: string;
}

export const createVenueVenueCreated = defineEvent<CreateVenueVenueCreatedData>('createVenue.venueCreated');

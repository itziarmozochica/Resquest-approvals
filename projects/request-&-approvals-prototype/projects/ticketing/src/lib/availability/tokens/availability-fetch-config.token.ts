import { InjectionToken } from '@angular/core';

import type { AvailabilityFetchConfig } from '../models/availability-fetch.model';

export const TICKETING_AVAILABILITY_FETCH = new InjectionToken<AvailabilityFetchConfig>('TICKETING_AVAILABILITY_FETCH');

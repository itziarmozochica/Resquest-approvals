import type { TicketingFeature } from '../ticketing.config';
import type { AvailabilityFetchConfig } from './models/availability-fetch.model';
import { TICKETING_AVAILABILITY_FETCH } from './tokens/availability-fetch-config.token';

export function withAvailabilityFetch(configFactory: () => AvailabilityFetchConfig): TicketingFeature {
  return { providers: [{ provide: TICKETING_AVAILABILITY_FETCH, useFactory: configFactory }] };
}

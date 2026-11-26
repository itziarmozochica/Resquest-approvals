import type { TicketingFeature } from '../ticketing.config';
import { TicketingAvailabilityService } from './services/availability.service';

// DI feature for provideTicketing — registers TicketingAvailabilityService only.
export function withAvailability(): TicketingFeature {
  return { providers: [TicketingAvailabilityService] };
}

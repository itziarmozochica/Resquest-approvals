import type { TicketingFeature } from '../ticketing.config';
import { AvailabilityCacheService } from './services/availability-cache.service';

// Opt-in DI feature for provideTicketing — registers the availability front cache only.
export function withAvailabilityCache(): TicketingFeature {
  return { providers: [AvailabilityCacheService] };
}

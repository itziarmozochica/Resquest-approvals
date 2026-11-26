import type { TicketingFeature } from '../ticketing.config';
import { TicketingCustomTabsService } from './services/custom-tabs/custom-tabs.service';

// DI feature for provideTicketing — registers the custom-tabs HTTP service only. It is separate
// from withOnsiteSetup() so a host that renders custom tabs without owning the setup-selection
// flow (POS) instantiates neither the storage nor the selection services.
export function withCustomTabs(): TicketingFeature {
  return { providers: [TicketingCustomTabsService] };
}

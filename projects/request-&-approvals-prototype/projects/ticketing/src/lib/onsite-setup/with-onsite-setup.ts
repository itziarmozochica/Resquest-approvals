import type { TicketingFeature } from '../ticketing.config';
import { TicketingOnsiteSetupSelectionService } from './services/onsite-setup-selection.service';
import { TicketingOnsiteSetupStorageService } from './services/onsite-setup-storage.service';
import { TicketingOnsiteSetupService } from './services/onsite-setup.service';
import { TicketingRecentOnsiteSetupsService } from './services/recent-onsite-setups.service';

// DI feature for provideTicketing — registers the onsite-setup HTTP, storage, recents and
// selection-orchestration services. It registers no SignalStore feature: consumers compose
// withOnsiteSetupStoreFeature() themselves, or provide the shared OnsiteSetupStore.
export function withOnsiteSetup(): TicketingFeature {
  return {
    providers: [
      TicketingOnsiteSetupSelectionService,
      TicketingOnsiteSetupService,
      TicketingOnsiteSetupStorageService,
      TicketingRecentOnsiteSetupsService,
    ],
  };
}

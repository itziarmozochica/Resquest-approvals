import type { EnvironmentProviders, Provider } from '@angular/core';

import { ANNOUNCEMENTS_API, ANNOUNCEMENTS_CONTEXT, provideOneTimeAnnouncements } from 'product-marketing';

import { DepositsAnnouncementComponent } from '../../modules/reservation/components/deposits-announcement/deposits-announcement.component';
import { AnnouncementsApiService } from './announcements-api.service';
import { AnnouncementsContextService } from './announcements-context.service';

/**
 * Integrates the `product-marketing` one-time announcements library into FeverZone:
 * the announcement registry plus FeverZone's backend gateway and partner-admin
 * context implementations. Spread into the root `AppModule` providers.
 *
 * The legacy `reservations-splash` still runs inline in `AppComponent` and is left
 * untouched here; migrating it onto this library is deferred to a future work item.
 * New announcements are registered in the array below.
 */
export const provideAnnouncements = (): (Provider | EnvironmentProviders)[] => [
  ...provideOneTimeAnnouncements([{ component: DepositsAnnouncementComponent, key: 'reservations-deposits' }]),
  { provide: ANNOUNCEMENTS_API, useExisting: AnnouncementsApiService },
  { provide: ANNOUNCEMENTS_CONTEXT, useExisting: AnnouncementsContextService },
];

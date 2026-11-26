import { inject, InjectionToken, provideEnvironmentInitializer, type EnvironmentProviders, type Provider } from '@angular/core';

import type { AnnouncementRegistration } from '../models/announcement.model';
import { AnnouncementService } from '../services/announcement.service';
import { ANNOUNCEMENT_REGISTRATIONS } from '../tokens/announcement-registrations.token';

/**
 * Root-scoped latch so only the first environment initializer starts a flow: wiring these
 * providers in two injectors would otherwise give two services, both opening the same
 * announcement.
 */
const ANNOUNCEMENTS_FLOW_STARTED = new InjectionToken<{ value: boolean }>('ANNOUNCEMENTS_FLOW_STARTED', {
  providedIn: 'root',
  factory: () => ({ value: false }),
});

/**
 * Registers one-time announcements for the application.
 *
 * Returns providers the host spreads into its **root** providers (NgModule providers
 * array or standalone application config); the announcement flow then starts
 * automatically via an environment initializer.
 *
 * The host must additionally bind the two required ports in the same injector:
 * {@link ANNOUNCEMENTS_API} (backend gateway) and `ANNOUNCEMENTS_CONTEXT`
 * (partner-admin context). The dialog port defaults to Ignite's `IgntDialogService`
 * at modal size `lg`; override `ANNOUNCEMENTS_DIALOG` to change it.
 *
 * @example
 * ```ts
 * providers: [
 *   provideOneTimeAnnouncements([{ key: 'reservations-splash', component: AnnouncementModalComponent }]),
 *   { provide: ANNOUNCEMENTS_API, useClass: MyAnnouncementsApi },
 *   { provide: ANNOUNCEMENTS_CONTEXT, useExisting: MyAnnouncementsContext },
 * ]
 * ```
 */
export const provideOneTimeAnnouncements = (registrations: readonly AnnouncementRegistration[]): (Provider | EnvironmentProviders)[] => [
  AnnouncementService,
  ...registrations.map(registration => ({
    multi: true as const,
    provide: ANNOUNCEMENT_REGISTRATIONS,
    useValue: registration,
  })),
  provideEnvironmentInitializer((): void => {
    const started = inject(ANNOUNCEMENTS_FLOW_STARTED);
    if (started.value) {
      return;
    }
    started.value = true;
    inject(AnnouncementService).start();
  }),
];

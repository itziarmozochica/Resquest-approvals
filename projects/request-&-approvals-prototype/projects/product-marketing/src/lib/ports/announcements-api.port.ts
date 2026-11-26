import { InjectionToken } from '@angular/core';

import type { Observable } from 'rxjs';

import type { AnnouncementDescriptor, AnnouncementKey } from '../models/announcement.model';

/**
 * Host-supplied gateway to the announcements backend.
 *
 * Modelled as a port rather than a concrete `HttpClient` service so the library
 * stays host-agnostic: each host wires its own base URL and auth interceptors,
 * tests provide a stub, and a concrete implementation is registered via
 * {@link ANNOUNCEMENTS_API}.
 */
export interface AnnouncementsApiPort {
  /**
   * Returns the announcements the authenticated partner-admin is targeted for
   * and has not yet seen. Targeting and seen-filtering are applied server-side,
   * so the client holds no audience list.
   */
  getEligibleAnnouncements: () => Observable<readonly AnnouncementDescriptor[]>;

  /**
   * Records that the current partner-admin has seen/dismissed the announcement.
   * Idempotent: a no-op server-side when a view already exists.
   */
  markSeen: (key: AnnouncementKey) => Observable<void>;
}

/** DI token the host binds to its concrete {@link AnnouncementsApiPort}. */
export const ANNOUNCEMENTS_API = new InjectionToken<AnnouncementsApiPort>('ANNOUNCEMENTS_API');

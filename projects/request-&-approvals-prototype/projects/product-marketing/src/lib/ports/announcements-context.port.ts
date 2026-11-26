import { InjectionToken } from '@angular/core';

import type { Observable } from 'rxjs';

import type { AnnouncementContext } from '../models/announcement.model';

/**
 * Host-supplied source of partner-admin context. Keeps the library decoupled
 * from each host's auth/user services.
 *
 * `context$` emits:
 * - an {@link AnnouncementContext} once a partner-admin is ready **and** eligible
 *   to receive announcements, or
 * - `null` when there is no partner-admin yet or the context is excluded (the
 *   host owns which contexts are excluded).
 *
 * Announcements load once per admin, not once per app instance, so emit `null` on logout
 * rather than simply stopping: it cancels any in-flight show and closes its dialog. Emit a
 * fresh context on an in-session partner switch too: eligibility is decided server-side for
 * the session's current partner, so the new one has to be re-asked about.
 */
export interface AnnouncementsContextPort {
  readonly context$: Observable<AnnouncementContext | null>;
}

/** DI token the host binds to its concrete {@link AnnouncementsContextPort}. */
export const ANNOUNCEMENTS_CONTEXT = new InjectionToken<AnnouncementsContextPort>('ANNOUNCEMENTS_CONTEXT');

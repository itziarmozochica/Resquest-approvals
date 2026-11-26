import { InjectionToken } from '@angular/core';

import type { AnnouncementRegistration } from '../models/announcement.model';

/**
 * Key → component registrations declared by the host via
 * `provideOneTimeAnnouncements`. A `multi` token: the provider contributes one
 * entry per registration, flattened into a single array.
 *
 * `multi` providers merge only **within one injector**, never down the hierarchy: a child
 * injector providing this token shadows the root's entries rather than adding to them.
 * Declare every announcement in one root-level `provideOneTimeAnnouncements` call.
 */
export const ANNOUNCEMENT_REGISTRATIONS = new InjectionToken<readonly AnnouncementRegistration[]>('ANNOUNCEMENT_REGISTRATIONS');

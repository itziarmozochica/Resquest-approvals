import { defineEvent } from '@fz/fz-tracking/src/public-api';

import type { AnnouncementKey } from '../models/announcement.model';

interface AnnouncementEventData {
  readonly key: AnnouncementKey;
}

/**
 * Emitted by the library (not the host) when an announcement dialog is shown, so
 * every consumer is measured uniformly per key.
 */
export const announcementImpressionEvent = defineEvent<AnnouncementEventData>('product-marketing.announcement.impression');

/** Emitted by the library when an announcement is dismissed. */
export const announcementDismissedEvent = defineEvent<AnnouncementEventData>('product-marketing.announcement.dismissed');

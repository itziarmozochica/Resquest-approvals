import { defineEvent } from '@fz/fz-tracking/src/public-api';

import type { NotificationFamily } from '../../models/inbox-notification.model';

/**
 * Fired when the proactive notifications panel opens.
 *
 * `shownCount` / `shownTypes` capture the list composition at open time (the categories rendered),
 * so the funnel denominator (what the user was presented with) lives on this single event instead of
 * one impression event per item. `shownTypes` preserves render order; its length equals `shownCount`.
 * `shownFamilies` is the deduplicated union of the effective business families visible in the panel,
 * in `FAMILY_ORDER` (the composition of chips shown, not one entry per notification). Unlike `shownTypes`
 * it is NOT index-aligned with the item list and does NOT preserve duplicates or render order: its length
 * is `≤ shownCount` and `shownFamilies[i]` does not correspond to `shownTypes[i]`. The per-item
 * family↔notification pairing lives on `open_notification_assistant` (`notificationFamilies`), not here.
 */
export interface NotificationsPanelOpenData {
  shownCount: number;
  shownFamilies: readonly NotificationFamily[];
  shownTypes: readonly string[];
  unreadCount: number;
}

export const notificationsPanelOpen = defineEvent<NotificationsPanelOpenData>('notifications.panel.open');

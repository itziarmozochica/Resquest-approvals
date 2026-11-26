import { defineEvent } from '@fz/fz-tracking/src/public-api';

import type { NotificationFamily } from '../../models/inbox-notification.model';

/** Where the share was triggered. Only the assistant dialog for now; the list item is a fast-follow. */
export type NotificationShareSource = 'assistant_dialog';

/**
 * Fired when a user copies the share link for a notification.
 *
 * Carries the same per-notification axes as `open_notification_assistant` (`notificationType`,
 * `notificationFamilies` already resolved to its effective set) plus `source`, the place the share was
 * triggered from — kept separate from the open event's `source` (which records how the dialog was opened).
 */
export interface NotificationShareData {
  notificationFamilies: readonly NotificationFamily[];
  notificationId: string;
  notificationType: string;
  source: NotificationShareSource;
}

export const notificationShare = defineEvent<NotificationShareData>('notifications.item.share');

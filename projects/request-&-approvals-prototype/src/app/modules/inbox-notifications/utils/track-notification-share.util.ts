import { FzTrackingService } from '@fz/fz-tracking/src/public-api';

import { InboxNotification } from '../models/inbox-notification.model';
import { resolveNotificationFamilies } from '../models/notification-tag.config';
import { notificationShare } from '../tracking/events/notification-share.event';

/**
 * Fires the "share notification" event with the per-notification axes resolved from the inbox notification.
 * Shared by the bell panel, the reports "all notifications" page and the shared-link listener so the three
 * entry points emit an identical event; `source` is fixed to `assistant_dialog` (the only share origin today).
 */
export function trackNotificationShare(fzTracking: FzTrackingService, notification: InboxNotification): void {
  fzTracking.track(
    notificationShare({
      notificationFamilies: resolveNotificationFamilies(notification.tags),
      notificationId: notification.id,
      notificationType: notification.type,
      source: 'assistant_dialog',
    }),
  );
}

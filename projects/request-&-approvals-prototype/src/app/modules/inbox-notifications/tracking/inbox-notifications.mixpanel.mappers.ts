import { mixpanelMapper } from '@fz/fz-tracking/src/public-api';

import { notificationAssistantOpen } from './events/notification-assistant-open.event';
import { notificationShare } from './events/notification-share.event';
import { notificationsLoadMore } from './events/notifications-load-more.event';
import { notificationsPanelClose } from './events/notifications-panel-close.event';
import { notificationsPanelOpen } from './events/notifications-panel-open.event';
import { notificationsRetry } from './events/notifications-retry.event';
import { notificationsViewAllClick } from './events/notifications-view-all-click.event';

/**
 * Mixpanel mappers for the inbox `notifications.*` event family (global-header bell + proactive panel).
 *
 * Registered via `inboxNotificationsTrackingProvider` (withMixpanel) on `NotificationsButtonComponent`,
 * the feature root that owns the store and the overlay lifecycle. The overlay injector is channeled from
 * that component so the panel and its items resolve this same adapter — a single adapter, no duplicates.
 */
export const inboxNotificationsMixpanelMappers = mixpanelMapper([
  {
    event: notificationsPanelOpen,
    name: 'open_notifications_panel',
    properties: ({ shownCount, shownFamilies, shownTypes, unreadCount }) => ({
      shown_count: shownCount,
      shown_families: shownFamilies,
      shown_types: shownTypes,
      unread_count: unreadCount,
    }),
  },
  {
    event: notificationsPanelClose,
    name: 'close_notifications_panel',
    properties: null,
  },
  {
    event: notificationAssistantOpen,
    name: 'open_notification_assistant',
    properties: ({ isRead, notificationFamilies, notificationId, notificationType, position, source }) => ({
      is_read: isRead,
      notification_families: notificationFamilies,
      notification_id: notificationId,
      notification_type: notificationType,
      source,
      ...(position === undefined ? {} : { position }),
    }),
  },
  {
    event: notificationShare,
    name: 'share_notification',
    properties: ({ notificationFamilies, notificationId, notificationType, source }) => ({
      notification_families: notificationFamilies,
      notification_id: notificationId,
      notification_type: notificationType,
      source,
    }),
  },
  {
    event: notificationsLoadMore,
    name: 'load_more_notifications',
    properties: ({ shownCount }) => ({ shown_count: shownCount }),
  },
  {
    event: notificationsViewAllClick,
    name: 'click_view_all_notifications',
    properties: null,
  },
  {
    event: notificationsRetry,
    name: 'retry_notifications',
    properties: null,
  },
]);

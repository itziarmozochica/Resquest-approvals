import type { NotificationFamily } from '../../models/inbox-notification.model';

/** How the assistant dialog was opened: the header bell, the "view all" page, or a shared notification link. */
export type NotificationAssistantOpenSource = 'bell' | 'shared_link' | 'view_all';

/**
 * Payload for the `open_notification_assistant` event.
 *
 * `notificationType` is the backend `type` string (free-form, snake_case — see `notification-tag.config`).
 * `notificationFamilies` is the closed-enum business family (`generic | pricing | sales`), multi-valued,
 * already resolved to its effective set (real families win over `generic`, empty → `['generic']`). It is
 * an axis independent of `notificationType`, not derived from it.
 * `position` is the zero-based index of the item within the rendered list; absent for shared-link opens,
 * which have no list context.
 * `source` records the entry point (bell / view-all page / shared link).
 */
export interface NotificationItemEventData {
  isRead: boolean;
  notificationFamilies: readonly NotificationFamily[];
  notificationId: string;
  notificationType: string;
  source: NotificationAssistantOpenSource;
  position?: number;
}

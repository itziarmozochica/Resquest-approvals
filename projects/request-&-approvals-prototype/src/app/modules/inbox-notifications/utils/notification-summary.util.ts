import type {
  FzAssistantNotificationsDialogOpenOptions,
  FzAssistantNotificationSummary,
} from '@fz-original/app/modules/reports/fz-assistant-view/components/fz-assistant-notifications-dialog/fz-assistant-notifications-dialog-data.model';

import type { InboxNotification } from '../models/inbox-notification.model';
import { resolveNotificationTags } from '../models/notification-tag.config';

/** Extra, injector-scoped bits the pure mapping can't compute (share link + its post-copy tracking hook). */
export interface DialogOpenExtras {
  readonly shareUrl?: string | null;
  readonly onShare?: () => void;
}

/**
 * Builds the self-contained summary the FZ Assistant dialog renders in its header from an inbox
 * notification. Shared by the header panel and the reports "all notifications" page so both open the
 * assistant with an identical payload. Carries the same resolved bits the list item paints — chips from
 * `tags` plus the backend `title`/`description` — so opening a notification keeps the card's structure.
 */
export function toNotificationSummary(notification: InboxNotification): FzAssistantNotificationSummary {
  return {
    contentType: notification.contentType,
    description: notification.description,
    planTitle: notification.planTitle,
    tags: resolveNotificationTags(notification.tags),
    timestamp: notification.timestamp,
    title: notification.title,
  };
}

/**
 * Maps an inbox notification into the FZ Assistant dialog `open()` options. Single source shared by the bell
 * panel, the reports page and the shared-link listener so all three open the assistant identically. `extras`
 * carries the share link and its tracking hook, which depend on the caller's injector and can't be derived here.
 */
export function toDialogOpenOptions(
  notification: InboxNotification,
  extras: DialogOpenExtras = {},
): FzAssistantNotificationsDialogOpenOptions {
  return {
    actions: notification.suggestedQuestions,
    assistantMessages: notification.assistantMessages,
    insightUrl: notification.embedUrl,
    markdownUrl: notification.markdownUrl,
    notification: toNotificationSummary(notification),
    notificationId: notification.id,
    notificationType: notification.type,
    onShare: extras.onShare,
    shareUrl: extras.shareUrl ?? null,
  };
}

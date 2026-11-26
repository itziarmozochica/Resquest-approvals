import { ChangeDetectionStrategy, Component, DestroyRef, inject, Signal, signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';

import { AnalyticsRoutes } from '@fz-original/app/modules/reports/analytics-routes';
import { FzAssistantNotificationsDialogService } from '@fz-original/app/shared/services/fz-assistant/fz-assistant-notifications-dialog.service';
import { ANALYTICS_BASE_ROUTE } from '@fz-original/app/shared/utils/analytics-breadcrumb.util';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { TranslateModule } from '@ngx-translate/core';

import { InboxNotification } from '../../models/inbox-notification.model';
import { resolveNotificationFamilies } from '../../models/notification-tag.config';
import { RESTING_SCROLL_EDGES, ScrollEdgesState } from '../../models/scroll-edges-state.model';
import { ShareNotificationUrlBuilder } from '../../services/share-notification-url.builder';
import { InboxNotificationsStore } from '../../store/inbox-notifications.store';
import { PANEL_CLOSE } from '../../tokens/panel-close.token';
import { PANEL_LAYOUT } from '../../tokens/panel-layout.token';
import { notificationAssistantOpen } from '../../tracking/events/notification-assistant-open.event';
import { notificationsLoadMore } from '../../tracking/events/notifications-load-more.event';
import { notificationsPanelClose } from '../../tracking/events/notifications-panel-close.event';
import { notificationsRetry } from '../../tracking/events/notifications-retry.event';
import { notificationsViewAllClick } from '../../tracking/events/notifications-view-all-click.event';
import { toDialogOpenOptions } from '../../utils/notification-summary.util';
import { trackNotificationShare } from '../../utils/track-notification-share.util';
import { NotificationsListComponent } from '../notifications-list/notifications-list.component';
import { NotificationsPanelFooterComponent } from '../notifications-panel/components/notifications-panel-footer/notifications-panel-footer.component';
import { NotificationsPanelHeaderComponent } from '../notifications-panel/components/notifications-panel-header/notifications-panel-header.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.notifications-panel-content--sheet]': 'isSheet',
  },
  imports: [NotificationsPanelHeaderComponent, NotificationsListComponent, NotificationsPanelFooterComponent, TranslateModule],
  selector: 'app-notifications-panel-content',
  standalone: true,
  styleUrl: './notifications-panel-content.component.scss',
  templateUrl: './notifications-panel-content.component.html',
})
export class NotificationsPanelContentComponent {
  readonly #store = inject(InboxNotificationsStore);
  readonly #close = inject(PANEL_CLOSE);
  readonly #fzAssistantNotificationsDialog = inject(FzAssistantNotificationsDialogService);
  readonly #layout = inject(PANEL_LAYOUT, { optional: true }) ?? 'overlay';
  readonly #destroyRef = inject(DestroyRef);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #router = inject(Router);
  readonly #shareUrlBuilder = inject(ShareNotificationUrlBuilder);

  readonly notifications: Signal<InboxNotification[]> = this.#store.notifications;
  readonly unreadCount: Signal<number> = this.#store.unseenCount;
  readonly isLoading: Signal<boolean> = this.#store.isLoading;
  readonly isLoadingMore: Signal<boolean> = this.#store.isLoadingMore;
  readonly error: Signal<unknown> = this.#store.error;
  readonly hasMore: Signal<boolean> = this.#store.hasMore;
  readonly isSheet = this.#layout === 'sheet';
  protected readonly scrollEdges: WritableSignal<ScrollEdgesState> = signal(RESTING_SCROLL_EDGES);

  constructor() {
    this.#store.loadInbox();
    this.#destroyRef.onDestroy(() => this.#fzTracking.track(notificationsPanelClose()));
  }

  onClose(): void {
    this.#close();
  }

  onLoadMore(): void {
    this.#store.loadMore();
    this.#fzTracking.track(notificationsLoadMore({ shownCount: this.#store.notifications().length }));
  }

  onOpenAssistant(notification: InboxNotification, position: number): void {
    this.#fzTracking.track(
      notificationAssistantOpen({
        isRead: notification.isRead,
        notificationFamilies: resolveNotificationFamilies(notification.tags),
        notificationId: notification.id,
        notificationType: notification.type,
        position,
        source: 'bell',
      }),
    );
    this.#store.markSeen(notification.id);
    this.#fzAssistantNotificationsDialog.open(
      toDialogOpenOptions(notification, {
        shareUrl: this.#shareUrlBuilder.build(notification),
        onShare: () => trackNotificationShare(this.#fzTracking, notification),
      }),
    );
    this.#close();
  }

  onRetry(): void {
    this.#fzTracking.track(notificationsRetry());
    this.#store.loadInbox();
  }

  onScrollEdges(edges: ScrollEdgesState): void {
    this.scrollEdges.set(edges);
  }

  onViewAll(): void {
    this.#fzTracking.track(notificationsViewAllClick());
    this.#close();
    void this.#router.navigate([ANALYTICS_BASE_ROUTE, AnalyticsRoutes.AllNotifications]);
  }
}

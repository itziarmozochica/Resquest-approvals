import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, Injector, Signal } from '@angular/core';

import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { TranslateModule } from '@ngx-translate/core';

import { mergeNotificationFamilies } from '../../models/notification-tag.config';
import { NotificationsOverlayService } from '../../services/notifications-overlay.service';
import { SharedNotificationListenerService } from '../../services/shared-notification-listener.service';
import { InboxNotificationsStore } from '../../store/inbox-notifications.store';
import { notificationsPanelOpen } from '../../tracking/events/notifications-panel-open.event';
import { inboxNotificationsTrackingProvider } from '../../tracking/inbox-notifications.tracking-provider';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  providers: [...inboxNotificationsTrackingProvider(), SharedNotificationListenerService],
  selector: 'app-notifications-button',
  standalone: true,
  styleUrl: './notifications-button.component.scss',
  templateUrl: './notifications-button.component.html',
})
export class NotificationsButtonComponent {
  readonly #store = inject(InboxNotificationsStore);
  readonly #overlayService = inject(NotificationsOverlayService);
  readonly #elementRef = inject(ElementRef<HTMLElement>);
  readonly #injector = inject(Injector);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #sharedNotificationListener = inject(SharedNotificationListenerService);

  readonly unreadCount: Signal<number> = this.#store.unseenCount;
  readonly unreadCountDisplay: Signal<string> = this.#store.unreadCountDisplay;
  readonly hasUnread: Signal<boolean> = this.#store.hasUnread;

  constructor() {
    this.#store.loadInbox();
    this.#sharedNotificationListener.listen();
    inject(DestroyRef).onDestroy(() => this.#overlayService.close());
    afterNextRender(() => {
      if (this.#overlayService.isOpen) {
        this.#overlayService.reanchor(this.#elementRef.nativeElement);
      }
    });
  }

  onButtonClick(): void {
    if (this.#overlayService.isOpen) {
      this.#overlayService.close();
    } else {
      const notifications = this.#store.notifications();
      this.#fzTracking.track(
        notificationsPanelOpen({
          shownCount: notifications.length,
          shownFamilies: mergeNotificationFamilies(notifications.map(notification => notification.tags)),
          shownTypes: notifications.map(notification => notification.type),
          unreadCount: this.unreadCount(),
        }),
      );
      this.#overlayService.open(this.#elementRef.nativeElement, this.#injector);
    }
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { FzAssistantNotificationsDialogService } from '@fz-original/app/shared/services/fz-assistant/fz-assistant-notifications-dialog.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { TranslateService } from '@ngx-translate/core';
import { filter, map, take } from 'rxjs';

import { InboxNotification } from '../models/inbox-notification.model';
import { resolveNotificationFamilies } from '../models/notification-tag.config';
import { InboxNotificationsStore } from '../store/inbox-notifications.store';
import { notificationAssistantOpen } from '../tracking/events/notification-assistant-open.event';
import { toDialogOpenOptions } from '../utils/notification-summary.util';
import { trackNotificationShare } from '../utils/track-notification-share.util';
import { NotificationsApiService } from './notifications-api.service';
import { SHARED_NOTIFICATION_ID_PARAM, ShareNotificationUrlBuilder } from './share-notification-url.builder';

/**
 * Detects a `sharedNotificationId` query param and auto-opens the FZ Assistant dialog for that notification.
 *
 * Provided in `NotificationsButtonComponent` (not root) on purpose: the bell is gated by
 * `enable_inbox_notifications` and rendered on every private route, and it owns the inbox tracking scope, so
 * events fired here map correctly. The partner switch is already done by `HasForcedPartnerGuard`; a receiver
 * without access simply gets a `404` under their own partner, surfaced as a single "no longer available" toast.
 */
@Injectable()
export class SharedNotificationListenerService {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #api = inject(NotificationsApiService);
  readonly #store = inject(InboxNotificationsStore);
  readonly #dialog = inject(FzAssistantNotificationsDialogService);
  readonly #shareUrlBuilder = inject(ShareNotificationUrlBuilder);
  readonly #toast = inject(ToastService);
  readonly #translate = inject(TranslateService);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #destroyRef = inject(DestroyRef);

  listen(): void {
    this.#route.queryParamMap
      .pipe(
        map(params => params.get(SHARED_NOTIFICATION_ID_PARAM)),
        filter((id): id is string => id != null && id.length > 0),
        take(1),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(id => this.#openShared(id));
  }

  /**
   * Removes only `sharedNotificationId` (keeps `ofeat`) with a same-path `replaceUrl` navigation, so the Angular
   * Router state — not just the address bar — drops the param. A plain `Location.replaceState` leaves
   * `queryParamMap` stale, and a bell re-created on a viewport breakpoint change (e.g. maximizing the window,
   * which flips the header's mobile/desktop `@if`) would then re-read the param and reopen the dialog. Same-path
   * navigations don't close the dialog (see the dialog service's path-aware close), so it stays open.
   */
  #clearParam(): void {
    const urlTree = this.#router.parseUrl(this.#router.url);
    if (urlTree.queryParams[SHARED_NOTIFICATION_ID_PARAM] == null) {
      return;
    }
    delete urlTree.queryParams[SHARED_NOTIFICATION_ID_PARAM];
    void this.#router.navigateByUrl(urlTree, { replaceUrl: true });
  }

  #onError(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 404) {
      this.#toastUnavailable();
    } else {
      this.#toastLoadError();
    }
    this.#clearParam();
  }

  #onFetched(notification: InboxNotification): void {
    if (!notification.isShareable) {
      this.#toastUnavailable();
      this.#clearParam();
      return;
    }

    void this.#dialog
      .open(
        toDialogOpenOptions(notification, {
          shareUrl: this.#shareUrlBuilder.build(notification),
          onShare: () => trackNotificationShare(this.#fzTracking, notification),
        }),
      )
      .then(opened => {
        if (opened) {
          this.#onOpened(notification);
        }
      });
  }

  /**
   * Commits the side effects that assume the shared notification is on screen. Runs only once the dialog has
   * actually opened: if the open was cancelled or its chunk failed to load, we leave `sharedNotificationId` in
   * the URL so a reload can retry, mark nothing seen, and record no phantom open event.
   */
  #onOpened(notification: InboxNotification): void {
    this.#fzTracking.track(
      notificationAssistantOpen({
        isRead: notification.isRead,
        notificationFamilies: resolveNotificationFamilies(notification.tags),
        notificationId: notification.id,
        notificationType: notification.type,
        source: 'shared_link',
      }),
    );
    // `seen` is per-user, so mark it read for the receiver — keeps their bell honest, never touches the sender.
    this.#store.markSeen(notification.id);
    this.#clearParam();
  }

  #openShared(id: string): void {
    this.#api
      .getNotificationById(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: (error: unknown) => this.#onError(error),
        next: notification => this.#onFetched(notification),
      });
  }

  #toastLoadError(): void {
    this.#toast.add({
      autoHide: true,
      message: this.#translate.instant('chatbot.notificationsDialog.share.loadError'),
      sentiment: AlertSentiment.danger,
    });
  }

  #toastUnavailable(): void {
    this.#toast.add({
      autoHide: true,
      message: this.#translate.instant('chatbot.notificationsDialog.share.unavailable'),
      sentiment: AlertSentiment.warning,
    });
  }
}

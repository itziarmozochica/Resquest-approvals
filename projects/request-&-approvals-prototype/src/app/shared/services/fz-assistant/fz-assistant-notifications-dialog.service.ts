import { inject, Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

import type {
  FzAssistantNotificationsDialogData,
  FzAssistantNotificationsDialogOpenOptions,
} from '@fz-original/app/modules/reports/fz-assistant-view/components/fz-assistant-notifications-dialog/fz-assistant-notifications-dialog-data.model';
import { ChatbotFacade } from '@fz-original/app/shared/services/chatbot/chatbot.facade';
import { FzAssistantDialogOverlayService } from '@fz-original/app/shared/services/fz-assistant/fz-assistant-dialog-overlay.service';
import { IgntDialogService, type IgntDialogRef } from '@ignite/common';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class FzAssistantNotificationsDialogService {
  readonly #chatbotFacade = inject(ChatbotFacade);
  readonly #fzAssistantDialogOverlay = inject(FzAssistantDialogOverlayService);
  readonly #igntDialog = inject(IgntDialogService);
  readonly #router = inject(Router);
  #dialogRef: IgntDialogRef<unknown> | null = null;
  #earlyNavSubscription: Subscription | null = null;
  #openInFlight = false;
  #pendingOpenCancelled = false;
  #subscriptions = new Subscription();

  close(): void {
    if (this.#dialogRef === null) {
      this.#pendingOpenCancelled = true;
    }
    this.#dialogRef?.close();
  }

  /**
   * Opens the assistant dialog. Resolves `true` only when the modal actually opened; resolves `false` when the
   * open was skipped (already open / in flight / overlay open), cancelled by an early navigation, or the dialog
   * chunk failed to load. Callers that trigger irreversible side effects on a successful open (e.g. the
   * shared-notification listener marking the notification seen and stripping the URL param) must gate them on
   * this result, so a failed open leaves state recoverable.
   */
  open(options?: FzAssistantNotificationsDialogOpenOptions): Promise<boolean> {
    if (this.#dialogRef !== null || this.#openInFlight || this.#fzAssistantDialogOverlay.isOpen) {
      return Promise.resolve(false);
    }

    this.#chatbotFacade.resetConversation();

    this.#openInFlight = true;
    this.#pendingOpenCancelled = false;

    const openPath = this.#pathOf(this.#router.url);
    this.#earlyNavSubscription = this.#router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe(e => {
      if (this.#pathOf(e.urlAfterRedirects) !== openPath) {
        this.#pendingOpenCancelled = true;
      }
    });

    return this.#openAfterLoad(options, openPath).finally(() => {
      this.#openInFlight = false;
    });
  }

  async #openAfterLoad(options: FzAssistantNotificationsDialogOpenOptions | undefined, openPath: string): Promise<boolean> {
    try {
      const { FzAssistantNotificationsDialogComponent } = await import(
        '@fz-original/app/modules/reports/fz-assistant-view/components/fz-assistant-notifications-dialog/fz-assistant-notifications-dialog.component'
      );

      if (this.#pendingOpenCancelled || this.#dialogRef !== null) {
        return false;
      }

      const data: FzAssistantNotificationsDialogData = {
        actions: options?.actions ?? [],
        assistantMessages: options?.assistantMessages ?? [],
        initialQuery: '',
        insightUrl: options?.insightUrl ?? null,
        markdownUrl: options?.markdownUrl ?? null,
        notification: options?.notification,
        notificationId: options?.notificationId,
        notificationType: options?.notificationType,
        onShare: options?.onShare,
        shareUrl: options?.shareUrl ?? null,
      };
      const dialogRef = this.#igntDialog.openModal(FzAssistantNotificationsDialogComponent, {
        data,
        size: 'lg',
      });
      this.#dialogRef = dialogRef;

      this.#subscriptions.add(
        dialogRef.closed$.pipe(take(1)).subscribe(() => {
          this.#subscriptions.unsubscribe();
          this.#subscriptions = new Subscription();
          this.#dialogRef = null;
        }),
      );

      this.#subscriptions.add(
        this.#router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe(e => {
          if (this.#pathOf(e.urlAfterRedirects) !== openPath) {
            this.#dialogRef?.close();
          }
        }),
      );

      return true;
    } catch {
      /* Chunk load failure: leave dialog closed; user can retry open(). */
      return false;
    } finally {
      this.#earlyNavSubscription?.unsubscribe();
      this.#earlyNavSubscription = null;
    }
  }

  /**
   * The URL's path (no query params, no fragment), used to tell genuine page changes from same-page
   * re-navigations. Parses through the router — like `HasForcedPartnerGuard` and the shared-link listener — rather
   * than a hand-rolled split, so matrix params and encoding go through Angular's URL model, not string ops.
   */
  #pathOf(url: string): string {
    const tree = this.#router.parseUrl(url);
    tree.queryParams = {};
    tree.fragment = null;
    return this.#router.serializeUrl(tree);
  }
}

import { inject, Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

import type {
  FzAssistantDialogChromeApi,
  FzAssistantDialogData,
} from '@fz-original/app/modules/reports/fz-assistant-view/components/fz-assistant-dialog/fz-assistant-dialog-data.model';
import { OpenChatbotEntryPointET } from '@fz-original/app/modules/reports/fz-assistant-view/tracking/events/open-chatbot.event';
import { ChatbotFacade } from '@fz-original/app/shared/services/chatbot/chatbot.facade';
import { IgntDialogService, type IgntDialogRef } from '@ignite/common';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';

export interface FzAssistantDialogOverlayOpenOptions {
  readonly entryPoint: OpenChatbotEntryPointET;
  readonly resetConversation: boolean;
  readonly sendSubscriptionHandoff?: Subscription | null;
}

@Injectable({ providedIn: 'root' })
export class FzAssistantDialogOverlayService {
  readonly #chatbotFacade = inject(ChatbotFacade);
  readonly #igntDialog = inject(IgntDialogService);
  readonly #router = inject(Router);
  #dialogInstance: FzAssistantDialogChromeApi | null = null;
  #dialogRef: IgntDialogRef<unknown> | null = null;
  #handoffSendSubscription: Subscription | null = null;
  #openInFlight = false;
  #pendingOpenCancelled = false;
  #subscriptions = new Subscription();

  close(cancelInFlightGeneration = true): void {
    if (cancelInFlightGeneration) {
      this.#dialogInstance?.cancelCurrentGeneration();
    }
    if (this.#dialogRef === null) {
      this.#pendingOpenCancelled = true;
    }
    this.#dialogRef?.close();
  }

  get isOpen(): boolean {
    return this.#dialogRef !== null || this.#openInFlight;
  }

  open(options: FzAssistantDialogOverlayOpenOptions): void {
    if (this.#dialogRef !== null || this.#openInFlight) {
      return;
    }

    const handoffSendSubscription = options.sendSubscriptionHandoff;
    if (handoffSendSubscription) {
      this.#handoffSendSubscription?.unsubscribe();
      this.#handoffSendSubscription = handoffSendSubscription;
    }

    if (options.resetConversation) {
      this.#chatbotFacade.resetConversation();
    }
    this.#chatbotFacade.setEntryPoint(options.entryPoint);

    this.#openInFlight = true;
    this.#pendingOpenCancelled = false;

    void this.#openAfterLoadComponent().finally(() => {
      this.#openInFlight = false;
    });
  }

  async #openAfterLoadComponent(): Promise<void> {
    try {
      const { FzAssistantDialogComponent } = await import(
        '@fz-original/app/modules/reports/fz-assistant-view/components/fz-assistant-dialog/fz-assistant-dialog.component'
      );

      if (this.#pendingOpenCancelled || this.#dialogRef !== null) {
        return;
      }

      const data: FzAssistantDialogData = {
        initialQuery: '',
        adoptHandoffSubscription: (subscription: Subscription | null) => {
          if (!subscription) {
            return;
          }
          this.#handoffSendSubscription?.unsubscribe();
          this.#handoffSendSubscription = subscription;
        },
        registerChromeApi: (api: FzAssistantDialogChromeApi) => {
          this.#dialogInstance = api;
        },
        unregisterChromeApi: () => {
          this.#dialogInstance = null;
        },
      };

      const dialogRef = this.#igntDialog.openModal(FzAssistantDialogComponent, {
        data,
        size: 'md',
      });
      this.#dialogRef = dialogRef;

      this.#subscriptions.add(
        dialogRef.closed$.pipe(take(1)).subscribe(() => {
          this.#subscriptions.unsubscribe();
          this.#subscriptions = new Subscription();
          this.#dialogInstance = null;
          this.#dialogRef = null;
        }),
      );

      this.#subscriptions.add(
        this.#router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(() => {
          this.#dialogRef?.close();
        }),
      );
    } catch {
      /* Chunk load failure: leave dialog closed; user can retry open(). */
    }
  }
}

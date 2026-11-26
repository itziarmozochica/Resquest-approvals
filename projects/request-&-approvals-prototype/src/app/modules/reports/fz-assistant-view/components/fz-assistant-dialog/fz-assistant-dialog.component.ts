import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
  viewChild,
  type Provider,
} from '@angular/core';
import { Router } from '@angular/router';

import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { AnalyticsRoutes } from '@fz-original/app/modules/reports/analytics-routes';
import { ChatbotContext } from '@fz-original/app/modules/reports/fz-assistant-view/tracking/events/chatbot-context';
import { AiSparkleIconComponent } from '@fz-original/app/shared/components/ai-sparkle-icon/ai-sparkle-icon.component';
import { CHATBOT_CONTEXT } from '@fz-original/app/shared/components/chatbot-modal/chatbot-context.token';
import { ChatbotFacade } from '@fz-original/app/shared/services/chatbot/chatbot.facade';
import { FzAssistantDockUiService } from '@fz-original/app/shared/services/fz-assistant/fz-assistant-dock-ui.service';
import { ANALYTICS_BASE_ROUTE } from '@fz-original/app/shared/utils/analytics-breadcrumb.util';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogCloseDirective, IgntDialogModule, type IgntDialogRef } from '@ignite/common';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { closeChatbot } from '../../tracking/events/close-chatbot.event';
import { openChatbot } from '../../tracking/events/open-chatbot.event';
import { fzAssistantTrackingProvider } from '../../tracking/fz-assistant.tracking-provider';
import { FzAssistantChatSurfaceComponent } from '../fz-assistant-chat-surface/fz-assistant-chat-surface.component';
import type { FzAssistantDialogData } from './fz-assistant-dialog-data.model';

/**
 * The surface's real DI providers, exported so the tracking contract spec can assert the exact
 * array this component registers without reaching into Angular's private decorator metadata.
 */
export const FZ_ASSISTANT_DIALOG_PROVIDERS: Provider[] = [
  { provide: CHATBOT_CONTEXT, useValue: ChatbotContext.topBarDialog },
  ...fzAssistantTrackingProvider(),
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AiSparkleIconComponent,
    FzAssistantChatSurfaceComponent,
    IgntDialogCloseDirective,
    IgntDialogModule,
    IgntIconButtonComponent,
    TranslateModule,
  ],
  providers: FZ_ASSISTANT_DIALOG_PROVIDERS,
  selector: 'app-fz-assistant-dialog',
  standalone: true,
  styleUrl: './fz-assistant-dialog.component.scss',
  templateUrl: './fz-assistant-dialog.component.html',
})
export class FzAssistantDialogComponent implements AfterViewInit, OnDestroy {
  readonly #breakpointStateService = inject(BreakpointStateService);
  readonly #chatbotContext = inject(CHATBOT_CONTEXT);
  readonly #chatbotFacade = inject(ChatbotFacade);
  readonly #dialogRef = inject(IGNT_DIALOG_REF) as IgntDialogRef<unknown>;
  readonly #dockUi = inject(FzAssistantDockUiService);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #router = inject(Router);
  readonly #skipCancelOnDestroy = signal<boolean>(false);

  readonly chatSurface = viewChild<FzAssistantChatSurfaceComponent>('surface');
  readonly dialogData = inject<FzAssistantDialogData>(IGNT_DIALOG_DATA);

  readonly showOpenInSidebarButton = computed(
    () => this.#dockUi.dockRouteEligible() && !this.#breakpointStateService.getStateProp('isMobile')(),
  );

  constructor() {
    this.#fzTracking.track(openChatbot({ chatbotContext: this.#chatbotContext, entryPoint: this.#chatbotFacade.getEntryPoint() }));
  }

  cancelCurrentGeneration(): void {
    this.chatSurface()?.cancelCurrentGeneration();
  }

  detachSendSubscriptionForRouteHandoff(): Subscription | null {
    return this.chatSurface()?.detachSendSubscriptionForRouteHandoff() ?? null;
  }

  ngAfterViewInit(): void {
    this.dialogData.registerChromeApi({
      cancelCurrentGeneration: () => {
        this.cancelCurrentGeneration();
      },
      detachSendSubscriptionForRouteHandoff: () => {
        return this.detachSendSubscriptionForRouteHandoff();
      },
    });
  }

  ngOnDestroy(): void {
    this.dialogData.unregisterChromeApi();
    if (!this.#skipCancelOnDestroy()) {
      this.cancelCurrentGeneration();
    }
    this.#fzTracking.track(closeChatbot({ chatbotContext: this.#chatbotContext }));
  }

  onCustomerServiceRequested(): void {
    this.#dialogRef.close();
  }

  onExpandClick(): void {
    const handoffSubscription: Subscription | null = this.detachSendSubscriptionForRouteHandoff();
    this.dialogData.adoptHandoffSubscription(handoffSubscription);
    const threadId: string | null = this.#chatbotFacade.threadId() ?? this.#chatbotFacade.lastCreatedThreadId();
    this.#skipCancelOnDestroy.set(true);
    this.#dialogRef.close();
    if (threadId) {
      void this.#router.navigate([ANALYTICS_BASE_ROUTE, AnalyticsRoutes.FzAssistant, threadId], { queryParamsHandling: 'merge' });
    } else {
      void this.#router.navigate([ANALYTICS_BASE_ROUTE, AnalyticsRoutes.FzAssistant], { queryParamsHandling: 'merge' });
    }
  }

  onOpenAsDockClick(): void {
    const handoffSubscription: Subscription | null = this.detachSendSubscriptionForRouteHandoff();
    this.dialogData.adoptHandoffSubscription(handoffSubscription);
    // Keep the original entry point: modal→dock is a view switch, not a new sidebar open, so the dock's
    // open_chatbot keeps the real origin (e.g. top_bar) instead of being mis-attributed as 'sidebar'.
    this.#dockUi.openPanel();
    this.#skipCancelOnDestroy.set(true);
    this.#dialogRef.close();
  }
}

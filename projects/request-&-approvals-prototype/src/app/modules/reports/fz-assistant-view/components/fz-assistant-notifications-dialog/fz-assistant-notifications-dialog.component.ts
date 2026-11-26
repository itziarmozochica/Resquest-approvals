import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnDestroy,
  signal,
  viewChild,
  type Provider,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ChatbotContext } from '@fz-original/app/modules/reports/fz-assistant-view/tracking/events/chatbot-context';
import { AiSparkleIconComponent } from '@fz-original/app/shared/components/ai-sparkle-icon/ai-sparkle-icon.component';
import { CHATBOT_CONTEXT } from '@fz-original/app/shared/components/chatbot-modal/chatbot-context.token';
import type { ChatbotMessage } from '@fz-original/app/shared/models/chatbot/chatbot.model';
import { ChatbotFacade } from '@fz-original/app/shared/services/chatbot/chatbot.facade';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IGNT_DIALOG_DATA, IgntDialogCloseDirective, IgntDialogModule, IgntMediaQueriesService } from '@ignite/common';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntTabsItemComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs-item/ignt-tabs-item.component';
import { IgntTabsComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs.component';
import { TranslateModule } from '@ngx-translate/core';
import { ClipboardService } from 'ngx-clipboard';
import { Subscription, timer } from 'rxjs';

import { closeChatbot } from '../../tracking/events/close-chatbot.event';
import { openChatbot, OpenChatbotEntryPoint } from '../../tracking/events/open-chatbot.event';
import { SendChatbotMessageSource } from '../../tracking/events/send-chatbot-message.event';
import { fzAssistantTrackingProvider } from '../../tracking/fz-assistant.tracking-provider';
import { FzAssistantChatSurfaceComponent } from '../fz-assistant-chat-surface/fz-assistant-chat-surface.component';
import { FzAssistantNotificationActionsComponent } from '../fz-assistant-notification-actions/fz-assistant-notification-actions.component';
import { FzAssistantNotificationConversationComponent } from '../fz-assistant-notification-conversation/fz-assistant-notification-conversation.component';
import { FzAssistantNotificationHeaderComponent } from '../fz-assistant-notification-header/fz-assistant-notification-header.component';
import { FzAssistantNotificationInsightComponent } from '../fz-assistant-notification-insight/fz-assistant-notification-insight.component';
import { FzAssistantNotificationMarkdownComponent } from '../fz-assistant-notification-markdown/fz-assistant-notification-markdown.component';
import {
  DEFAULT_SUGGESTED_QUESTIONS,
  type FzAssistantInsightAction,
  type FzAssistantNotificationsDialogData,
  type FzAssistantNotificationSummary,
} from './fz-assistant-notifications-dialog-data.model';

const COPIED_FEEDBACK_MS = 2500;

/**
 * The surface's real DI providers, exported so the tracking contract spec can assert the exact
 * array this component registers without reaching into Angular's private decorator metadata.
 */
export const FZ_ASSISTANT_NOTIFICATIONS_DIALOG_PROVIDERS: Provider[] = [
  { provide: CHATBOT_CONTEXT, useValue: ChatbotContext.notifications },
  ...fzAssistantTrackingProvider(),
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AiSparkleIconComponent,
    FzAssistantChatSurfaceComponent,
    FzAssistantNotificationActionsComponent,
    FzAssistantNotificationConversationComponent,
    FzAssistantNotificationHeaderComponent,
    FzAssistantNotificationInsightComponent,
    FzAssistantNotificationMarkdownComponent,
    IgntDialogCloseDirective,
    IgntDialogModule,
    IgntIconButtonComponent,
    IgntTabsComponent,
    IgntTabsItemComponent,
    NgTemplateOutlet,
    TranslateModule,
  ],
  providers: FZ_ASSISTANT_NOTIFICATIONS_DIALOG_PROVIDERS,
  selector: 'app-fz-assistant-notifications-dialog',
  standalone: true,
  styleUrl: './fz-assistant-notifications-dialog.component.scss',
  templateUrl: './fz-assistant-notifications-dialog.component.html',
})
export class FzAssistantNotificationsDialogComponent implements OnDestroy {
  readonly #chatbotContext = inject(CHATBOT_CONTEXT);
  readonly #chatbotFacade = inject(ChatbotFacade);
  readonly #clipboard = inject(ClipboardService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #mediaQueries = inject(IgntMediaQueriesService);
  #copiedReset: Subscription | null = null;

  private readonly chatSurface = viewChild(FzAssistantChatSurfaceComponent);

  readonly dialogData = inject<FzAssistantNotificationsDialogData>(IGNT_DIALOG_DATA);
  readonly copied: WritableSignal<boolean> = signal(false);

  readonly insightActions: readonly FzAssistantInsightAction[] = this.dialogData.actions?.length
    ? this.dialogData.actions
    : DEFAULT_SUGGESTED_QUESTIONS;
  readonly insightUrl: Signal<string | null> = computed(() => this.dialogData.insightUrl ?? null);
  readonly markdownUrl: Signal<string | null> = computed(() => this.dialogData.markdownUrl ?? null);
  readonly assistantMessages: Signal<readonly ChatbotMessage[]> = computed(() => this.dialogData.assistantMessages ?? []);
  readonly notification: Signal<FzAssistantNotificationSummary | null> = computed(() => this.dialogData.notification ?? null);
  readonly showInsightError: Signal<boolean> = computed(() => this.insightUrl() === null && this.notification()?.contentType === 'html');
  readonly isMarkdown: Signal<boolean> = computed(() => this.notification()?.contentType === 'markdown');
  readonly isFzAssistant: Signal<boolean> = computed(() => this.notification()?.contentType === 'fz_assistant');
  readonly hasAssistantMessages: Signal<boolean> = computed(() => this.isFzAssistant() && this.assistantMessages().length > 0);
  readonly hasFillingContent: Signal<boolean> = computed(
    () => this.insightUrl() !== null || this.isMarkdown() || this.hasAssistantMessages(),
  );
  readonly hasContentBelow: Signal<boolean> = computed(
    () => this.insightUrl() !== null || this.showInsightError() || this.isMarkdown() || this.hasAssistantMessages(),
  );
  readonly selectedTabIndex: WritableSignal<number> = signal(0);
  readonly showInsightActions: Signal<boolean> = computed(
    () => this.#chatbotFacade.messages().length === 0 && !this.#chatbotFacade.isLoadingThread(),
  );
  readonly useTabs: Signal<boolean> = computed(() => !this.#mediaQueries.isDesktopMd() && !this.#mediaQueries.isDesktopLg());

  constructor() {
    this.#chatbotFacade.setNotificationContext(this.dialogData.notificationId ?? null, this.dialogData.notificationType ?? null);
    this.#chatbotFacade.setEntryPoint(OpenChatbotEntryPoint.inboxNotification);
    this.#fzTracking.track(
      openChatbot({
        chatbotContext: this.#chatbotContext,
        entryPoint: OpenChatbotEntryPoint.inboxNotification,
        notificationId: this.dialogData.notificationId,
        notificationType: this.dialogData.notificationType,
      }),
    );
  }

  ngOnDestroy(): void {
    this.#fzTracking.track(closeChatbot({ chatbotContext: this.#chatbotContext }));
    this.#chatbotFacade.clearNotificationContext();
    this.#chatbotFacade.clearEntryPoint();
  }

  onInsightAction(action: FzAssistantInsightAction): void {
    this.chatSurface()?.sendSuggestion(action.prompt, SendChatbotMessageSource.notificationAction);
  }

  onShare(): void {
    const shareUrl = this.dialogData.shareUrl;
    if (shareUrl == null) {
      return;
    }
    this.#clipboard.copy(shareUrl);
    this.copied.set(true);
    this.#copiedReset?.unsubscribe();
    this.#copiedReset = timer(COPIED_FEEDBACK_MS)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.copied.set(false));
    this.dialogData.onShare?.();
  }
}

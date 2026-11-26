import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  Signal,
  signal,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { AiSparkleIconComponent } from '@fz-original/app/shared/components/ai-sparkle-icon/ai-sparkle-icon.component';
import { CHATBOT_CONTEXT } from '@fz-original/app/shared/components/chatbot-modal/chatbot-context.token';
import { ChatbotConversationComponent } from '@fz-original/app/shared/components/chatbot-modal/chatbot-conversation/chatbot-conversation.component';
import { FeedbackRequestEvent } from '@fz-original/app/shared/components/chatbot-modal/chatbot-conversation/chatbot-conversation.model';
import { ChatbotFeedbackModalComponent } from '@fz-original/app/shared/components/chatbot-modal/chatbot-conversation/chatbot-feedback-modal/chatbot-feedback-modal.component';
import { FeedbackModalResult } from '@fz-original/app/shared/components/chatbot-modal/chatbot-conversation/chatbot-feedback-modal/chatbot-feedback-modal.model';
import { FeedbackType } from '@fz-original/app/shared/components/chatbot-modal/chatbot-conversation/chatbot-feedback/chatbot-feedback.component';
import { ChatbotSuggestionsComponent } from '@fz-original/app/shared/components/chatbot-modal/chatbot-conversation/chatbot-suggestions/chatbot-suggestions.component';
import { ChatbotLoadingComponent } from '@fz-original/app/shared/components/chatbot-modal/chatbot-loading/chatbot-loading.component';
import { ChatbotConversationItem, ChatbotSubmitFeedbackPayload } from '@fz-original/app/shared/models/chatbot/chatbot.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import {
  ChatbotConversationReadContext,
  ChatbotConversationReadService,
} from '@fz-original/app/shared/services/chatbot/chatbot-conversation-read.service';
import { ChatbotFacade } from '@fz-original/app/shared/services/chatbot/chatbot.facade';
import { CustomerServiceChatFacade } from '@fz-original/app/shared/services/customer-service-chat/customer-service-chat.facade';
import { FzAssistantComposerService } from '@fz-original/app/shared/services/fz-assistant/fz-assistant-composer.service';
import { FzAssistantDockUiService } from '@fz-original/app/shared/services/fz-assistant/fz-assistant-dock-ui.service';
import { FzAssistantPromptContextService } from '@fz-original/app/shared/services/fz-assistant/fz-assistant-prompt-context.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { attachConversationContentResizeScroll } from '@fz-original/app/shared/utils/chatbot/conversation-scroll.util';
import { bindComposerDraft } from '@fz-original/app/shared/utils/fz-assistant-composer-draft.util';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntDialogService } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { filter, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { ChatbotContext } from '../../tracking/events/chatbot-context';
import { openChatbotHistory } from '../../tracking/events/open-chatbot-history.event';
import { selectChatbotHistoryThread } from '../../tracking/events/select-chatbot-history-thread.event';
import { sendChatbotMessage, SendChatbotMessageSource, SendChatbotMessageSourceET } from '../../tracking/events/send-chatbot-message.event';
import { startChatbotNewChat } from '../../tracking/events/start-chatbot-new-chat.event';
import { submitChatbotFeedback } from '../../tracking/events/submit-chatbot-feedback.event';
import { ChatbotThreadsSidebarComponent } from '../chatbot-threads-sidebar/chatbot-threads-sidebar.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.fz-assistant-chat-surface-host--dock]': 'appearance() === "dock"',
  },
  imports: [
    AiSparkleIconComponent,
    ChatbotConversationComponent,
    ChatbotLoadingComponent,
    ChatbotSuggestionsComponent,
    ChatbotThreadsSidebarComponent,
    FormsModule,
    IgntCheckboxComponent,
    IgntIconButtonComponent,
    IgntIconComponent,
    TranslateModule,
  ],
  selector: 'app-fz-assistant-chat-surface',
  standalone: true,
  styleUrl: './fz-assistant-chat-surface.component.scss',
  templateUrl: './fz-assistant-chat-surface.component.html',
})
export class FzAssistantChatSurfaceComponent implements AfterViewInit {
  readonly #breakpointStateService = inject(BreakpointStateService);
  readonly #chatbotContext = inject(CHATBOT_CONTEXT, { optional: true }) ?? ChatbotContext.modal;
  readonly #chatbotFacade = inject(ChatbotFacade);
  readonly #composer = inject(FzAssistantComposerService);
  readonly #customerServiceChatFacade = inject(CustomerServiceChatFacade);
  readonly #confirmedFeedbackByRunId: WritableSignal<Partial<Record<string, FeedbackType>>> = signal<Partial<Record<string, FeedbackType>>>(
    {},
  );
  readonly #conversationRead = inject(ChatbotConversationReadService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #dockUi = inject(FzAssistantDockUiService);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #partnerService = inject(PartnerService);
  protected readonly fzAssistantPromptContext = inject(FzAssistantPromptContextService);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);
  #finalizeLoadingSuppressed = false;
  #sendSubscription: Subscription | null = null;
  #threadLoadSubscription: Subscription | null = null;

  readonly appearance = input<'dialog' | 'dock'>('dialog');
  readonly initialQuery = input<string>('');
  readonly inputPlaceholderKey = input<string | null>(null);
  readonly showHeader = input<boolean>(true);
  readonly showSuggestions = input<boolean>(true);
  readonly showWelcomeTitle = input<boolean>(true);
  readonly closeRequested = output<void>();
  /**
   * The user chose the customer-service handoff. The Zendesk messenger has already been opened; the
   * host is expected to dismiss whichever Assistant surface it is.
   */
  readonly customerServiceRequested = output<void>();
  readonly expandRequested = output<void>();
  readonly openAsDockRequested = output<void>();
  readonly openAsPopupRequested = output<void>();

  readonly confirmedFeedbackByRunId: Signal<Partial<Record<string, FeedbackType>>> = this.#confirmedFeedbackByRunId.asReadonly();
  readonly currentMessage: WritableSignal<string> = signal<string>('');
  readonly messages: Signal<ChatbotConversationItem[]> = this.#chatbotFacade.messages;
  readonly activeThreadId: Signal<string | null> = this.#chatbotFacade.threadId;
  readonly isConversationHistoryEnabled: boolean = this.#isConversationHistoryEnabled();
  readonly isHistoryOpen: WritableSignal<boolean> = signal<boolean>(false);
  readonly lastCreatedThreadId: Signal<string | null> = this.#chatbotFacade.lastCreatedThreadId;
  readonly lastCreatedThreadTitle: Signal<string | null> = this.#chatbotFacade.lastCreatedThreadTitle;
  readonly pendingThreadTitles: Signal<Record<string, string>> = this.#chatbotFacade.pendingThreadTitles;
  readonly titleReadyThreadId: Signal<string | null> = this.#chatbotFacade.titleReadyThreadId;
  readonly isLoadingThread: Signal<boolean> = this.#chatbotFacade.isLoadingThread;
  readonly isLoading: WritableSignal<boolean> = signal<boolean>(false);
  readonly isInputExpanded: WritableSignal<boolean> = signal<boolean>(false);
  /**
   * Inline loader follows ChatbotFacade (same rules as FzAssistantViewComponent.isGenerationLoadingOnVisibleThread,
   * without URL thread id) so switching dialog/dock does not depend on which surface instance started sendMessage.
   */
  readonly showInlineLoading: Signal<boolean> = computed(() => {
    const facadeThreadId: string | null = this.#chatbotFacade.threadId();
    const visibleThreadId: string | null = facadeThreadId;
    const pendingId: string | null = this.#chatbotFacade.pendingThreadId();
    const pipelineActive: boolean = this.#chatbotFacade.isMessageSendPipelineActive();

    if (pendingId !== null) {
      return pendingId === visibleThreadId;
    }
    if (pipelineActive) {
      return visibleThreadId === facadeThreadId;
    }
    return this.isLoading();
  });

  readonly isExpanded: Signal<boolean> = computed(() => this.messages().length > 0 || this.isLoadingThread());

  readonly canSelectPromptVersion: Signal<boolean> = this.#chatbotFacade.canSelectPromptVersion;
  readonly developerPromptVersionSelected: Signal<boolean> = this.#chatbotFacade.developerPromptVersionSelected;
  readonly showPromptVersionToggle: Signal<boolean> = computed(
    () => this.canSelectPromptVersion() && this.activeThreadId() === null && !this.isExpanded(),
  );

  readonly isMobile: Signal<boolean> = this.#breakpointStateService.getStateProp('isMobile');

  readonly showOpenInSidebarButton: Signal<boolean> = computed(
    () => this.appearance() === 'dialog' && this.#dockUi.dockRouteEligible() && !this.isMobile(),
  );

  readonly inputField = viewChild<ElementRef<HTMLTextAreaElement>>('inputField');
  readonly conversationBody = viewChild<ElementRef<HTMLElement>>('conversationBody');

  constructor() {
    this.#chatbotFacade.loadPromptVersions();

    this.#destroyRef.onDestroy(() => {
      this.cancelCurrentGeneration();
    });

    effect(() => {
      const initial = this.initialQuery();
      if (initial) {
        this.currentMessage.set(initial);
        queueMicrotask(() => {
          this.onInputChange();
        });
      }
    });

    effect(() => {
      this.messages();
      this.showInlineLoading();
      this.isLoadingThread();
      setTimeout(() => {
        this.#scrollToBottom();
        this.#checkConversationReadState();
      });
    });

    effect(onCleanup => {
      const scrollElement: HTMLElement | undefined = this.conversationBody()?.nativeElement;
      if (!scrollElement) {
        return;
      }

      onCleanup(attachConversationContentResizeScroll(scrollElement));
    });

    // A widget (MCP App) may request prepopulating the composer (sendMessage with
    // autoSubmit=false). Write it into the textbox and focus — do NOT send.
    bindComposerDraft({
      composer: this.#composer,
      currentMessage: this.currentMessage,
      inputField: this.inputField,
      onInputChange: () => this.onInputChange(),
    });
  }

  cancelCurrentGeneration(): void {
    this.#sendSubscription?.unsubscribe();
    this.#sendSubscription = null;
  }

  /** Detaches the in-flight send subscription so the host can close without cancelling the request (e.g. expand to route). */
  detachSendSubscriptionForRouteHandoff(): Subscription | null {
    const subscription: Subscription | null = this.#sendSubscription;
    this.#sendSubscription = null;
    this.#finalizeLoadingSuppressed = true;
    return subscription;
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.inputField()?.nativeElement.focus();
    });
  }

  onConversationScroll(event: Event): void {
    this.#conversationRead.onConversationScroll(event.target, this.#conversationReadContext());
  }

  onDeveloperPromptVersionChange(selected: boolean): void {
    this.#chatbotFacade.setDeveloperPromptVersionSelected(selected);
  }

  onHistoryNewChat(): void {
    this.#fzTracking.track(startChatbotNewChat({ chatbotContext: this.#chatbotContext }));
    this.#chatbotFacade.startNewThread(true);
    this.isHistoryOpen.set(false);
  }

  onHistoryThreadSelected(threadId: string): void {
    this.#fzTracking.track(selectChatbotHistoryThread({ chatbotContext: this.#chatbotContext }));
    this.isHistoryOpen.set(false);
    if (threadId === this.#chatbotFacade.threadId()) {
      return;
    }

    this.#threadLoadSubscription?.unsubscribe();
    this.#threadLoadSubscription = this.#chatbotFacade
      .loadThread(threadId, true)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.#toastService.add({
            autoHide: false,
            message: this.#translateService.instant('chatbot.error.message'),
            sentiment: AlertSentiment.danger,
          });
        },
      });
  }

  onInputChange(): void {
    const el: HTMLTextAreaElement | undefined = this.inputField()?.nativeElement;
    if (!el) {
      return;
    }

    const styles: CSSStyleDeclaration = getComputedStyle(el);
    const lineHeightValue: number = parseFloat(styles.lineHeight);
    const fontSize: number = parseFloat(styles.fontSize);
    const lineHeight: number = Number.isNaN(lineHeightValue) ? fontSize * 1.2 : lineHeightValue;
    this.isInputExpanded.set(el.scrollHeight > lineHeight * 1.5);
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onNegativeFeedbackRequested({ runId }: FeedbackRequestEvent): void {
    this.#dialogService
      .openModal<FeedbackModalResult>(ChatbotFeedbackModalComponent, { size: 'sm' })
      .closed$.pipe(
        filter((result): result is FeedbackModalResult => !!result),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((result: FeedbackModalResult) => {
        this.#markConfirmed(runId, 'negative');
        this.#submitFeedback({
          message: result.message,
          positive: false,
          run_id: runId,
          type: result.type ?? 'unknown',
        });
      });
  }

  onPositiveFeedbackSubmitted({ runId }: FeedbackRequestEvent): void {
    this.#markConfirmed(runId, 'positive');
    this.#submitFeedback({ positive: true, run_id: runId, type: 'unknown' });
  }

  /**
   * The chat opens BEFORE the emit, because dismissing this surface destroys the component. The
   * facade is root-provided and owns its own tracking scope, so the opening is still recorded.
   */
  onCustomerServiceSelected(): void {
    this.#customerServiceChatFacade.open('fz_assistant');
    this.customerServiceRequested.emit();
  }

  sendMessage(source: SendChatbotMessageSourceET = SendChatbotMessageSource.manual): void {
    const message = this.currentMessage().trim();
    if (!message || this.isLoading() || this.#chatbotFacade.isMessageSendPipelineActive()) {
      return;
    }

    this.#fzTracking.track(
      sendChatbotMessage({
        chatbotContext: this.#chatbotContext,
        notificationId: this.#chatbotFacade.notificationContextId() ?? undefined,
        notificationType: this.#chatbotFacade.notificationContextType() ?? undefined,
        source,
      }),
    );

    this.#finalizeLoadingSuppressed = false;

    this.isLoading.set(true);
    this.currentMessage.set('');
    this.isInputExpanded.set(false);

    this.#sendSubscription = this.#chatbotFacade
      .sendMessage(message)
      .pipe(
        finalize(() => {
          if (!this.#finalizeLoadingSuppressed) {
            this.isLoading.set(false);
          }
        }),
      )
      .subscribe({
        error: () => {
          this.#toastService.add({
            autoHide: false,
            message: this.#translateService.instant('chatbot.error.message'),
            sentiment: AlertSentiment.danger,
          });
        },
      });
  }

  sendSuggestion(suggestion: string, source: SendChatbotMessageSourceET = SendChatbotMessageSource.suggestion): void {
    this.currentMessage.set(suggestion);
    this.sendMessage(source);
  }

  toggleHistory(): void {
    this.isHistoryOpen.update((open: boolean) => !open);
    if (this.isHistoryOpen()) {
      this.#fzTracking.track(openChatbotHistory({ chatbotContext: this.#chatbotContext }));
    }
  }

  #checkConversationReadState(): void {
    this.#conversationRead.checkConversationReadState(this.conversationBody()?.nativeElement, this.#conversationReadContext());
  }

  #conversationReadContext(): ChatbotConversationReadContext {
    return {
      isGenerationLoading: this.showInlineLoading(),
      isLoadingThread: this.isLoadingThread(),
      messageCount: this.messages().length,
    };
  }

  #isConversationHistoryEnabled(): boolean {
    const partnerId: number | undefined = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined) return false;

    return (
      this.#optimizelyService.isFeatureEnabled(FeatureFlags.ENABLE_CHATBOT_PANEL_CONVERSATION_HISTORY, {
        partner_id: partnerId.toString(),
      }) ?? false
    );
  }

  #markConfirmed(runId: string, feedbackType: FeedbackType): void {
    this.#confirmedFeedbackByRunId.update(current => ({ ...current, [runId]: feedbackType }));
  }

  #scrollToBottom(): void {
    const el = this.conversationBody()?.nativeElement;
    if (!el) return;

    el.scrollTop = el.scrollHeight;
  }

  #submitFeedback(payload: ChatbotSubmitFeedbackPayload): void {
    this.#fzTracking.track(
      submitChatbotFeedback({
        chatbotContext: this.#chatbotContext,
        positive: payload.positive,
        runId: payload.run_id,
        type: payload.type ?? 'unknown',
      }),
    );

    this.#chatbotFacade
      .submitFeedback(payload)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.#toastService.add({
            autoHide: true,
            message: this.#translateService.instant('chatbot.feedback.error'),
            sentiment: AlertSentiment.danger,
          });
        },
        next: () => {
          this.#toastService.add({
            autoHide: true,
            message: this.#translateService.instant('chatbot.feedback.success'),
            sentiment: AlertSentiment.positive,
          });
        },
      });
  }
}

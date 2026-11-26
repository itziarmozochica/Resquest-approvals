import { HttpErrorResponse, HttpResponse, HttpStatusCode } from '@angular/common/http';
import { computed, DestroyRef, effect, inject, Injectable, isDevMode, signal, Signal, WritableSignal } from '@angular/core';

import { OpenChatbotEntryPointET } from '@fz-original/app/modules/reports/fz-assistant-view/tracking/events/open-chatbot.event';
import { FzAssistantViewContext } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-wire.model';
import { FzAssistantDescribeViewBinder } from '@fz-original/app/shared/services/fz-assistant/discover/fz-assistant-describe-view-binder';
import { FzAssistantDiscoverFacade } from '@fz-original/app/shared/services/fz-assistant/discover/fz-assistant-discover.facade';
import { FzAssistantActBinder } from '@fz-original/app/shared/services/fz-assistant/integration/fz-assistant-act-binder';
import { TranslateService } from '@ngx-translate/core';
import * as Sentry from '@sentry/angular';
import {
  catchError,
  defer,
  delay,
  EMPTY,
  expand,
  filter,
  finalize,
  map,
  mergeMap,
  Observable,
  of,
  Subscription,
  tap,
  throwError,
} from 'rxjs';

import { environment } from '../../../../environments/environment';
import { BaseResponse } from '../../models/base-response';
import { ChatbotThread, ChatbotThreadHistory, ChatbotThreadHistoryDTO } from '../../models/chatbot/chatbot-thread.model';
import {
  ChatbotChartConfig,
  ChatbotChartConfigDTO,
  ChatbotClientToolCall,
  ChatbotConversationItem,
  ChatbotInitResponse,
  ChatbotInitResponseDTO,
  ChatbotMessage,
  ChatbotMessageType,
  ChatbotPromptVersion,
  ChatbotPromptVersionsDTO,
  ChatbotRunOutput,
  ChatbotRunOutputDTO,
  ChatbotRunStatus,
  ChatbotSubmitFeedbackPayload,
} from '../../models/chatbot/chatbot.model';
import { FeatureFlags } from '../../optimizely/feature-flags';
import { OptimizelyService } from '../../optimizely/optimizely.service';
import { buildTimeoutMessage } from '../../utils/chatbot.util';
import { hostEventsContainCompleteClientToolTriad, parseClientToolCallsFromHostEvents } from '../../utils/chatbot/chatbot-host-events.util';
import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { PartnerExternalIdsService } from '../partner/partner-external-ids.service';
import { PartnerService } from '../partner/partner.service';
import { Permissions } from '../user/permissions';
import { UserService } from '../user/user.service';
import { ChatbotApiService } from './chatbot-api.service';
import { ChatbotClientToolFulfillmentService } from './chatbot-client-tool-fulfillment.service';
import { ChatbotThreadsApiService } from './chatbot-threads-api.service';
import { ChatbotThreadsAdapter } from './chatbot-threads.adapter';
import { ChatbotAdapter, ChatbotToApiParams } from './chatbot.adapter';

/**
 * Internal poll-loop carrier: hostEvents are parsed once in `toPollEmission`.
 * `pendingToolCalls` excludes already-fulfilled ids; `hasToolHostEvents` is true for any
 * complete triad (pending, echoed, or empty-id dropped), used when remapping empty tool-terminal
 * COMPLETED → ERROR.
 * `willFulfill` / `willReplaceWithError` are decided once where eligibility is computed; `expand`
 * and `filter` both read those flags so withhold/fulfill/ERROR-replacement stay in sync without
 * relying on operator emission order.
 */
type ChatbotPollEmission = {
  hasToolHostEvents: boolean;
  pendingToolCalls: ChatbotClientToolCall[];
  runOutput: ChatbotRunOutput;
  willFulfill: boolean;
  /** Expand will emit a synthetic ERROR; filter must drop this carrier so consumers see one ERROR. */
  willReplaceWithError: boolean;
};

@Injectable({
  providedIn: 'root',
})
export class ChatbotFacade {
  static readonly CHATBOT_TIMEOUT_MS: number = 90000;
  /** Matches lazy `reviews` route permission in `private-routes.ts`. */
  static readonly CAN_VIEW_REVIEWS_PERMISSION: string = 'can_view_reviews';
  static readonly DEV_PROFILE_ID: string = 'fz_assistant_dev';
  static readonly EXCLUDED_ROUTES: string[] = ['analytics/fz-assistant', 'box-office'];
  static readonly EXCLUDED_ROUTE_EXCEPTIONS: string[] = ['box-office/sales-summary'];
  static readonly FZ_ASSISTANT_BANNER_DISMISSED_KEY: string = 'fz-assistant-banner-dismissed';
  static readonly REVIEWS_ROUTE_SEGMENT: string = '/reviews';
  /** Caps fulfill → action-results → poll rounds so a backend minting new toolCallIds cannot loop forever. */
  static readonly MAX_CLIENT_TOOL_FULFILLMENT_ROUNDS: number = 5;
  static readonly MAX_POLL_ATTEMPTS: number = 60;
  static readonly MAX_POLL_ERROR_RETRIES: number = 2;
  static readonly OPTIMISTIC_TITLE_MAX_LENGTH: number = 60;
  static readonly POLLING_INTERVAL_MS: number = 5000;
  static readonly REPORTS_PERMISSION: string = 'can_view_reports';
  static readonly REQUIRED_PERMISSIONS: Permissions[] = [Permissions.CAN_INTERACT_WITH_CHATBOT, Permissions.CAN_SEND_FEEDBACK_TO_CHATBOT];
  #activeHistoryRefreshSubscription: Subscription | null = null;
  #activeHistoryRefreshThreadId: string | null = null;
  #activeMarkSeenSubscription: Subscription | null = null;
  #activeMarkSeenThreadId: string | null = null;
  readonly #chatbotAdapter = inject(ChatbotAdapter);
  readonly #chatbotApiService = inject(ChatbotApiService);
  readonly #chatbotClientToolFulfillment = inject(ChatbotClientToolFulfillmentService);
  readonly #chatbotThreadsAdapter = inject(ChatbotThreadsAdapter);
  readonly #chatbotThreadsApiService = inject(ChatbotThreadsApiService);
  #canSelectPromptVersion: WritableSignal<boolean> = signal<boolean>(false);
  readonly #destroyRef = inject(DestroyRef);
  #developerPromptVersionSelected: WritableSignal<boolean> = signal<boolean>(false);
  readonly #discoverFacade = inject(FzAssistantDiscoverFacade);
  #entryPoint: WritableSignal<OpenChatbotEntryPointET | undefined> = signal<OpenChatbotEntryPointET | undefined>(undefined);
  #isLoadingThread: WritableSignal<boolean> = signal<boolean>(false);
  #lastCreatedThreadId: WritableSignal<string | null> = signal<string | null>(null);
  #lastCreatedThreadTitle: WritableSignal<string | null> = signal<string | null>(null);
  #markedReadIds: Set<string> = new Set();
  #messages: WritableSignal<ChatbotConversationItem[]> = signal<ChatbotConversationItem[]>([]);
  #notificationContextId: WritableSignal<string | null> = signal<string | null>(null);
  #notificationContextType: WritableSignal<string | null> = signal<string | null>(null);
  #pendingThreadTitles: WritableSignal<Record<string, string>> = signal<Record<string, string>>({});
  #regularThreads: WritableSignal<ChatbotThread[]> = signal<ChatbotThread[]>([]);
  #sessionMessages: Map<string, ChatbotConversationItem[]> = new Map();
  #optimizelyService = inject(OptimizelyService);
  readonly #partnerExternalIdsService = inject(PartnerExternalIdsService);
  #partnerService = inject(PartnerService);
  #pendingInitialMessage: WritableSignal<string | null> = signal<string | null>(null);
  #pendingThreadId: WritableSignal<string | null> = signal<string | null>(null);
  #promptVersionsRequestedForPartnerId: number | null = null;
  #sendMessagePipelineDepth: WritableSignal<number> = signal<number>(0);
  #threadId: WritableSignal<string | null> = signal<string | null>(null);
  #titleReadyThreadId: WritableSignal<string | null> = signal<string | null>(null);
  readonly #translateService = inject(TranslateService);
  #userService = inject(UserService);

  readonly canSelectPromptVersion: Signal<boolean> = this.#canSelectPromptVersion.asReadonly();
  readonly developerPromptVersionSelected: Signal<boolean> = this.#developerPromptVersionSelected.asReadonly();
  readonly isLoadingThread: Signal<boolean> = this.#isLoadingThread.asReadonly();
  readonly isMessageSendPipelineActive: Signal<boolean> = computed(() => this.#sendMessagePipelineDepth() > 0);
  readonly lastCreatedThreadId: Signal<string | null> = this.#lastCreatedThreadId.asReadonly();
  readonly lastCreatedThreadTitle: Signal<string | null> = this.#lastCreatedThreadTitle.asReadonly();
  readonly messages: Signal<ChatbotConversationItem[]> = this.#messages.asReadonly();
  readonly notificationContextId: Signal<string | null> = this.#notificationContextId.asReadonly();
  readonly notificationContextType: Signal<string | null> = this.#notificationContextType.asReadonly();
  readonly pendingInitialMessage: Signal<string | null> = this.#pendingInitialMessage.asReadonly();
  readonly pendingThreadId: Signal<string | null> = this.#pendingThreadId.asReadonly();
  readonly pendingThreadTitles: Signal<Record<string, string>> = this.#pendingThreadTitles.asReadonly();
  readonly regularThreads: Signal<ChatbotThread[]> = this.#regularThreads.asReadonly();
  readonly threadId: Signal<string | null> = this.#threadId.asReadonly();
  readonly titleReadyThreadId: Signal<string | null> = this.#titleReadyThreadId.asReadonly();

  constructor() {
    // Eagerly construct the binders so describe_view and act register via their own lifecycle (flag +
    // Optimizely user-data), not inside #pollRunStatus. Act registers unconditionally and reads its flag
    // per call, so SDK init cannot race this constructor and lose the tool for the session.
    inject(FzAssistantDescribeViewBinder);
    inject(FzAssistantActBinder);

    effect(() => {
      const threadId: string | null = this.#threadId();
      if (this.#activeMarkSeenThreadId !== null && this.#activeMarkSeenThreadId !== threadId) {
        this.#disposeActiveMarkSeenInFlight();
      }
    });

    this.#destroyRef.onDestroy(() => {
      this.#disposeActiveMarkSeenInFlight();
      this.#disposeActiveHistoryRefresh();
    });
  }

  appendRegularThreads(threads: ChatbotThread[]): void {
    this.#regularThreads.update((current: ChatbotThread[]) => [...current, ...this.#preserveOptimisticReadState(threads)]);
  }

  canAccessFromReports(): boolean {
    return this.#userService.hasPermission(ChatbotFacade.REPORTS_PERMISSION) && this.isEligible();
  }

  /**
   * Whether the Fz Assistant entry points in {@link LayoutComponent} (sidebar button, header chip, dock)
   * should be available for the current URL. Extends {@link canAccessFromReports} with Reviews-only users
   * who have `can_view_reviews` but not `can_view_reports`.
   */
  canAccessFzAssistantForLayoutShell(url: string): boolean {
    if (!this.isEligible() || this.isRouteExcluded(url)) {
      return false;
    }

    if (this.#userService.hasPermission(ChatbotFacade.REPORTS_PERMISSION)) {
      return true;
    }

    return url.includes(ChatbotFacade.REVIEWS_ROUTE_SEGMENT) && this.#userService.hasPermission(ChatbotFacade.CAN_VIEW_REVIEWS_PERMISSION);
  }

  /**
   * Async variant of {@link canAccessFzAssistantForLayoutShell} that additionally hides the Fz Assistant
   * shell entry points for partners with external channels (detected via `/external-ids`). Emits once,
   * after the external-channels check resolves (or immediately `false` when the synchronous checks fail).
   */
  canAccessFzAssistantForLayoutShell$(url: string): Observable<boolean> {
    if (!this.canAccessFzAssistantForLayoutShell(url)) {
      return of(false);
    }
    return this.#hasNoExternalChannels$();
  }

  clearEntryPoint(): void {
    this.#entryPoint.set(undefined);
  }

  clearNotificationContext(): void {
    this.#notificationContextId.set(null);
    this.#notificationContextType.set(null);
  }

  dismissFzAssistantBanner(): void {
    localStorage.setItem(ChatbotFacade.FZ_ASSISTANT_BANNER_DISMISSED_KEY, 'true');
  }

  /**
   * Poll a run that was started externally (e.g. from an MCP App panel action) and
   * append the AI response to the current conversation when it completes.
   *
   * Unlike `sendMessage`, this does NOT add a user message to the conversation — it
   * only appends the AI response produced by the backend run identified by `runId`.
   * The loading indicator is still shown via `isMessageSendPipelineActive`.
   */
  displayRunResult(runId: string): Observable<void> {
    const partnerId: number | undefined = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined) return EMPTY;

    const threadId: string | null = this.#threadId();
    const capturedMessages: ChatbotConversationItem[] = this.#messages();

    this.#sendMessagePipelineDepth.update((depth: number) => depth + 1);

    return this.#pollRunStatus(partnerId, runId, threadId).pipe(
      map((runOutput: ChatbotRunOutput): void => {
        if (runOutput.status !== ChatbotRunStatus.COMPLETED && runOutput.status !== ChatbotRunStatus.TIMED_OUT) return;

        let displayMessages: ChatbotMessage[] | null = runOutput.messages;
        if (!displayMessages || displayMessages.length === 0) {
          if (runOutput.status !== ChatbotRunStatus.TIMED_OUT) return;

          displayMessages = [buildTimeoutMessage(runOutput.runId, this.#translateService.instant('chatbot.error.timeout'))];
        }

        const aiMessage: ChatbotConversationItem = {
          messages: displayMessages,
          runId: runOutput.runId,
          type: ChatbotMessageType.AI,
        };

        if (threadId) {
          const sessionMsgs: ChatbotConversationItem[] = this.#sessionMessages.get(threadId) ?? capturedMessages;
          const alreadyInSession: boolean = sessionMsgs.some((item: ChatbotConversationItem) => item.runId === runOutput.runId);
          if (!alreadyInSession) {
            this.#sessionMessages.set(threadId, [...sessionMsgs, aiMessage]);
          }
        }

        if (this.#threadId() === threadId) {
          const alreadyHasRun: boolean = this.#messages().some((item: ChatbotConversationItem) => item.runId === runOutput.runId);
          if (!alreadyHasRun) {
            this.#messages.update((msgs: ChatbotConversationItem[]) => [...msgs, aiMessage]);
          }
        }

        if (runOutput.status === ChatbotRunStatus.TIMED_OUT && threadId !== null) {
          this.#refreshThreadFromHistory(partnerId, threadId);
        }
      }),
      finalize(() => {
        this.#sendMessagePipelineDepth.update((depth: number) => Math.max(0, depth - 1));
      }),
      catchError((error: unknown) => {
        if (isDevMode()) {
          console.error('[ChatbotFacade] displayRunResult poll failed', error);
        }
        return EMPTY;
      }),
    );
  }

  findThread(threadId: string): ChatbotThread | null {
    return this.#regularThreads().find((thread: ChatbotThread) => thread.id === threadId) ?? null;
  }

  getAndClearPendingInitialMessage(): string | null {
    const pendingMessage: string | null = this.#pendingInitialMessage();
    this.#pendingInitialMessage.set(null);
    return pendingMessage;
  }

  getChartConfig(partnerId: number, assetId: string): Observable<ChatbotChartConfig | null> {
    return this.#chatbotApiService.getChartConfig(partnerId, assetId).pipe(
      map((response: HttpResponse<ChatbotChartConfigDTO>) => {
        if (!response.body) {
          throw new Error('No response body returned from the chatbot API.');
        }
        return this.#chatbotAdapter.fromChartConfigApi(new BaseResponse(response.body, null));
      }),
    );
  }

  getEntryPoint(): OpenChatbotEntryPointET | undefined {
    return this.#entryPoint();
  }

  isEligible(): boolean {
    const partnerId: number | null = this.#partnerService.getPartner()?.id ?? null;

    if (partnerId === null) return false;

    const isFeatureEnabled =
      this.#optimizelyService.isFeatureEnabled(FeatureFlags.ENABLE_CHATBOT_INTERACTION, {
        partner_id: partnerId.toString(),
      }) ?? false;

    const hasAllPermissions = ChatbotFacade.REQUIRED_PERMISSIONS.every((perm: string) => this.#userService.hasPermission(perm));

    return isFeatureEnabled && hasAllPermissions;
  }

  /**
   * Async variant of {@link isEligible} that additionally hides the Fz Assistant for partners with
   * external channels (detected via `/external-ids`). Emits once, after the external-channels check
   * resolves (or immediately `false` when the synchronous checks already fail).
   */
  isEligible$(): Observable<boolean> {
    if (!this.isEligible()) {
      return of(false);
    }
    return this.#hasNoExternalChannels$();
  }

  isFzAssistantBannerDismissed(): boolean {
    return localStorage.getItem(ChatbotFacade.FZ_ASSISTANT_BANNER_DISMISSED_KEY) === 'true';
  }

  isRouteExcluded(url: string): boolean {
    if (ChatbotFacade.EXCLUDED_ROUTE_EXCEPTIONS.some((route: string) => url.includes(route))) {
      return false;
    }

    return ChatbotFacade.EXCLUDED_ROUTES.some((route: string) => url.includes(route));
  }

  loadPromptVersions(): void {
    const partnerId: number | undefined = this.#partnerService.getPartner()?.id;

    if (partnerId === undefined || this.#promptVersionsRequestedForPartnerId === partnerId) return;

    this.#promptVersionsRequestedForPartnerId = partnerId;
    this.#canSelectPromptVersion.set(false);
    this.#chatbotApiService
      .getPromptVersions(partnerId)
      .pipe(
        catchError(() => {
          if (this.#promptVersionsRequestedForPartnerId === partnerId) {
            this.#promptVersionsRequestedForPartnerId = null;
          }
          return EMPTY;
        }),
      )
      .subscribe((dto: ChatbotPromptVersionsDTO) => {
        if (this.#partnerService.getPartner()?.id !== partnerId) return;
        this.#canSelectPromptVersion.set(dto.prompt_versions.includes(ChatbotPromptVersion.DEVELOPER));
      });
  }

  loadThread(threadId: string, restoreOnFailure = false): Observable<void> {
    const partnerId: number | undefined = this.#partnerService.getPartner()?.id;

    if (partnerId === undefined) return EMPTY;

    const cachedMessages: ChatbotConversationItem[] | undefined = this.#sessionMessages.get(threadId);

    if (cachedMessages) {
      this.#messages.set(cachedMessages);
      this.#threadId.set(threadId);
      return of(undefined);
    }

    let loaded = false;
    let previousMessages: ChatbotConversationItem[] = [];

    return defer(() => {
      previousMessages = this.#messages();
      this.#isLoadingThread.set(true);
      this.#messages.set([]);
      return this.#chatbotThreadsApiService.getThreadHistory(partnerId, threadId);
    }).pipe(
      map((response: HttpResponse<ChatbotThreadHistoryDTO>) => {
        if (!response.body) {
          throw new Error('No response body returned from the chatbot threads history API.');
        }
        const history: ChatbotThreadHistory | null = this.#chatbotThreadsAdapter.fromThreadHistoryApi(
          new BaseResponse(response.body, null),
        );
        if (!history) {
          throw new Error('No thread history returned from the chatbot threads API.');
        }

        this.#messages.set(this.#groupMessagesByConversationItem(history.messages));
        this.#threadId.set(history.threadId);
      }),
      tap(() => (loaded = true)),
      finalize(() => {
        if (restoreOnFailure && !loaded) {
          this.#messages.set(previousMessages);
        }
        this.#isLoadingThread.set(false);
      }),
    );
  }

  markThreadSeen(threadId: string): Observable<void> {
    const partnerId: number | undefined = this.#partnerService.getPartner()?.id;

    if (partnerId === undefined) return EMPTY;

    const cached: ChatbotThread | null = this.findThread(threadId);
    if (cached !== null && cached.read) return EMPTY;

    const didOptimisticPatch: boolean = cached !== null;
    if (didOptimisticPatch) {
      this.#applyOptimisticMarkRead(threadId);
    }

    return this.#chatbotThreadsApiService.markThreadSeen(partnerId, threadId).pipe(
      catchError(() => {
        if (didOptimisticPatch) {
          this.#rollbackOptimisticMarkRead(threadId);
        }
        return EMPTY;
      }),
      map((): undefined => undefined),
    );
  }

  patchThread(threadId: string, patch: Partial<ChatbotThread>): void {
    const apply = (threads: ChatbotThread[]): ChatbotThread[] =>
      threads.map((thread: ChatbotThread) => (thread.id === threadId ? { ...thread, ...patch } : thread));
    this.#regularThreads.update(apply);
  }

  resetConversation(): void {
    this.#messages.set([]);
    this.#threadId.set(null);
    this.#notificationContextId.set(null);
    this.#notificationContextType.set(null);
    this.#isLoadingThread.set(false);
  }

  sendMessage(message: string): Observable<ChatbotRunOutput | void> {
    const partnerId: number | undefined = this.#partnerService.getPartner()?.id;

    if (partnerId === undefined) return EMPTY;

    const previousMessages: ChatbotConversationItem[] = this.#messages();
    const previousThreadId: string | null = this.#threadId();

    this.#disposeActiveHistoryRefreshFor(previousThreadId);

    const wasNewThread: boolean = previousThreadId === null;
    let capturedThreadId: string | null = previousThreadId;

    const userMessage: ChatbotConversationItem = {
      messages: [{ content: message, id: `user-${Date.now()}`, type: ChatbotMessageType.HUMAN }],
      type: 'human',
    };

    this.#messages.set([...previousMessages, userMessage]);
    this.#pendingThreadId.set(previousThreadId);

    const userEmail: string = this.#userService.getUserEmail();
    const isLocal: boolean = !environment.production && !environment.checkVersion;
    const profileId: string | undefined = isLocal ? ChatbotFacade.DEV_PROFILE_ID : undefined;
    const entryPoint: OpenChatbotEntryPointET | undefined = this.#entryPoint();
    const notificationId: string | null = previousThreadId === null ? this.#notificationContextId() : null;
    const promptVersion: ChatbotPromptVersion | undefined =
      previousThreadId === null && this.#developerPromptVersionSelected() && this.canSelectPromptVersion()
        ? ChatbotPromptVersion.DEVELOPER
        : undefined;
    const viewContext: FzAssistantViewContext | undefined = this.#resolveViewContextForSend();
    const toApiParams: ChatbotToApiParams = {
      entryPoint,
      message,
      notificationId,
      profileId,
      promptVersion,
      threadId: previousThreadId,
      userEmail,
      ...(viewContext !== undefined ? { viewContext } : {}),
    };

    const payload: ReturnType<ChatbotAdapter['toApi']> = this.#chatbotAdapter.toApi(toApiParams);

    this.#sendMessagePipelineDepth.update((depth: number) => depth + 1);

    return this.#chatbotApiService.initChat(partnerId, payload, ChatbotFacade.CHATBOT_TIMEOUT_MS).pipe(
      mergeMap((response: HttpResponse<ChatbotInitResponseDTO>) => {
        if (!response.body) {
          throw new Error('No response body returned from the chatbot API.');
        }
        const initResponse: ChatbotInitResponse | null = this.#chatbotAdapter.fromInitResponseApi(new BaseResponse(response.body, null));
        if (!initResponse) {
          throw new Error('No init response returned from the chatbot API.');
        }

        if (this.#wasConversationAbandoned(userMessage)) {
          return EMPTY;
        }

        if (initResponse.threadId) {
          capturedThreadId = initResponse.threadId;
          this.#pendingThreadId.set(initResponse.threadId);

          this.#sessionMessages.set(initResponse.threadId, [...previousMessages, userMessage]);

          if (wasNewThread) {
            if (this.#threadId() === null) {
              this.#threadId.set(initResponse.threadId);
            }
            const optimisticTitle: string = this.#buildOptimisticTitle(message);
            this.#lastCreatedThreadTitle.set(optimisticTitle);
            this.#lastCreatedThreadId.set(initResponse.threadId);
            this.#pendingThreadTitles.update((current: Record<string, string>) => ({
              ...current,
              [initResponse.threadId as string]: optimisticTitle,
            }));
          } else if (this.#threadId() === previousThreadId) {
            this.#threadId.set(initResponse.threadId);
          }
        }

        // Seed fulfill with the send-scoped thread (init id, else the thread this turn started on).
        // Do not re-read live UI signals inside the poll loop — a mid-poll switch must not reroute.
        return this.#pollRunStatus(partnerId, initResponse.runId, normalizeChatbotThreadId(capturedThreadId));
      }),
      map((runOutput: ChatbotRunOutput): ChatbotRunOutput | void => {
        const onSameThread: boolean = capturedThreadId !== null && this.#threadId() === capturedThreadId;

        if (runOutput.status === ChatbotRunStatus.ERROR) {
          return onSameThread ? runOutput : undefined;
        }

        if (runOutput.status === ChatbotRunStatus.COMPLETED || runOutput.status === ChatbotRunStatus.TIMED_OUT) {
          let displayMessages: ChatbotMessage[] | null = runOutput.messages;

          if (!displayMessages || displayMessages.length === 0) {
            if (runOutput.status === ChatbotRunStatus.COMPLETED) {
              throw new Error('No messages returned in completed chatbot run.');
            }

            displayMessages = [buildTimeoutMessage(runOutput.runId, this.#translateService.instant('chatbot.error.timeout'))];
          }

          const aiMessage: ChatbotConversationItem = {
            messages: displayMessages,
            runId: runOutput.runId,
            type: ChatbotMessageType.AI,
          };

          if (capturedThreadId) {
            const reconstructedMessages: ChatbotConversationItem[] = [...previousMessages, userMessage, aiMessage];
            this.#sessionMessages.set(capturedThreadId, reconstructedMessages);
          }

          if (onSameThread) {
            const alreadyHasRun: boolean = this.#messages().some((item: ChatbotConversationItem) => item.runId === runOutput.runId);
            if (!alreadyHasRun) {
              this.#messages.set([...this.#messages(), aiMessage]);
            }
          }

          if (wasNewThread && capturedThreadId !== null) {
            this.#titleReadyThreadId.set(capturedThreadId);
          }

          if (runOutput.status === ChatbotRunStatus.TIMED_OUT && capturedThreadId !== null) {
            this.#refreshThreadFromHistory(partnerId, capturedThreadId);
          }

          return onSameThread ? runOutput : undefined;
        }

        return;
      }),
      catchError((error: unknown) => {
        if (wasNewThread && capturedThreadId === null) {
          const currentMessages: ChatbotConversationItem[] = this.#messages();
          if (currentMessages.includes(userMessage)) {
            this.#messages.set(previousMessages);
          }
        }
        return throwError(() => error);
      }),
      finalize(() => {
        this.#pendingThreadId.set(null);
        this.#sendMessagePipelineDepth.update((depth: number) => Math.max(0, depth - 1));
      }),
    );
  }

  setDeveloperPromptVersionSelected(selected: boolean): void {
    this.#developerPromptVersionSelected.set(selected);
  }

  setEntryPoint(entryPoint: OpenChatbotEntryPointET): void {
    this.#entryPoint.set(entryPoint);
  }

  setNotificationContext(notificationId: string | null, notificationType: string | null = null): void {
    this.#notificationContextId.set(notificationId);
    this.#notificationContextType.set(notificationType);
  }

  setPendingInitialMessage(message: string): void {
    const trimmed: string = message.trim();
    this.#pendingInitialMessage.set(trimmed.length > 0 ? trimmed : null);
  }

  setRegularThreads(threads: ChatbotThread[]): void {
    this.#regularThreads.set(this.#preserveOptimisticReadState(threads));
  }

  startNewThread(resetLastCreatedThreadId = false): void {
    this.resetConversation();
    this.#developerPromptVersionSelected.set(false);
    if (resetLastCreatedThreadId) {
      this.#lastCreatedThreadId.set(null);
      this.#lastCreatedThreadTitle.set(null);
    }
  }

  submitFeedback(feedback: ChatbotSubmitFeedbackPayload): Observable<BaseResponse<void>> {
    const partnerId: number | undefined = this.#partnerService.getPartner()?.id;

    if (partnerId === undefined) return EMPTY;

    const userEmail: string = this.#userService.getUserEmail();
    const payload: ChatbotSubmitFeedbackPayload = { ...feedback, user_email: userEmail };

    return this.#chatbotApiService.submitFeedback(partnerId, payload).pipe(
      map(() => {
        return new BaseResponse(null, null);
      }),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  tryMarkActiveThreadAsSeen(): void {
    const threadId: string | null = this.#threadId();
    if (threadId === null) {
      return;
    }

    const cached: ChatbotThread | null = this.findThread(threadId);
    if (cached !== null && cached.read) {
      return;
    }

    if (this.#activeMarkSeenThreadId === threadId) {
      return;
    }

    this.#activeMarkSeenSubscription?.unsubscribe();
    this.#activeMarkSeenThreadId = threadId;
    this.#activeMarkSeenSubscription = this.markThreadSeen(threadId).subscribe({
      complete: () => this.#clearActiveMarkSeenIf(threadId),
      error: () => this.#clearActiveMarkSeenIf(threadId),
    });
  }

  #applyOptimisticMarkRead(threadId: string): void {
    this.#markedReadIds.add(threadId);
    this.patchThread(threadId, { read: true });
  }

  #buildOptimisticTitle(message: string): string {
    const trimmed: string = message.trim();
    if (trimmed.length <= ChatbotFacade.OPTIMISTIC_TITLE_MAX_LENGTH) {
      return trimmed;
    }
    return `${trimmed.slice(0, ChatbotFacade.OPTIMISTIC_TITLE_MAX_LENGTH).trimEnd()}…`;
  }

  #clearActiveMarkSeenIf(threadId: string): void {
    if (this.#activeMarkSeenThreadId === threadId) {
      this.#disposeActiveMarkSeenInFlight();
    }
  }

  #disposeActiveHistoryRefresh(): void {
    this.#activeHistoryRefreshSubscription?.unsubscribe();
    this.#activeHistoryRefreshSubscription = null;
    this.#activeHistoryRefreshThreadId = null;
  }

  #disposeActiveHistoryRefreshFor(threadId: string | null): void {
    if (threadId !== null && this.#activeHistoryRefreshThreadId === threadId) {
      this.#disposeActiveHistoryRefresh();
    }
  }

  #disposeActiveMarkSeenInFlight(): void {
    this.#activeMarkSeenSubscription?.unsubscribe();
    this.#activeMarkSeenSubscription = null;
    this.#activeMarkSeenThreadId = null;
  }

  #groupMessagesByConversationItem(messages: ChatbotMessage[]): ChatbotConversationItem[] {
    return messages.reduce<ChatbotConversationItem[]>((items, message) => {
      if (message.type === ChatbotMessageType.HUMAN) {
        return [...items, { messages: [message], type: ChatbotMessageType.HUMAN }];
      }

      const lastItem: ChatbotConversationItem | undefined = items[items.length - 1];
      if (lastItem && lastItem.type === ChatbotMessageType.AI) {
        const updatedLastItem: ChatbotConversationItem = {
          ...lastItem,
          messages: [...lastItem.messages, message],
          runId: message.runId ?? lastItem.runId,
        };
        return [...items.slice(0, -1), updatedLastItem];
      }

      return [...items, { messages: [message], runId: message.runId ?? undefined, type: ChatbotMessageType.AI }];
    }, []);
  }

  #hasNoExternalChannels$(): Observable<boolean> {
    const partnerId: number | undefined = this.#partnerService.getPartner()?.id;
    return this.#partnerExternalIdsService.hasNoExternalChannels$(partnerId);
  }

  /**
   * Polls a run to completion. Absorbs the `408` the backend raises on timeout (translated to a
   * terminal `TIMED_OUT` outcome via the adapter) and caps the loop at `MAX_POLL_ATTEMPTS`
   * requests in case the server never reaches a terminal state.
   *
   * A transient `status: "error"` is retried up to `MAX_POLL_ERROR_RETRIES` times *silently*:
   * only the outcome of the last retry reaches the emitted stream, the same way a recovered
   * `pending` poll never surfaces as an error to begin with. Error responses that carry
   * client-tool `hostEvents` are fulfilled instead of retried.
   *
   * Client-tool fulfill runs for Discover (`view_context` / `describe_view`). Complete tool
   * triads on empty COMPLETED polls remap to quiet ERROR instead of toasting.
   *
   * Per the backend contract, AG-UI `hostEvents` arrive on terminal poll responses (`completed`
   * or `error`). Those tool calls are fulfilled before polling stops; action-results returns a
   * continuation `run_id` that subsequent polls follow so the assistant reply is observed.
   * The poll-attempt budget resets when switching to that continuation. At most
   * `MAX_CLIENT_TOOL_FULFILLMENT_ROUNDS` fulfill cycles run per poll session so a backend that
   * mints a new `toolCallId` each round cannot loop unboundedly.
   * Fulfillment uses `runOutput.threadId`, then session `knownThreadId` seeded from `threadIdHint`
   * (init / display-run capture). Live UI `#threadId` / `#pendingThreadId` are never consulted —
   * a mid-poll thread switch must not route action-results to a different conversation.
   * If tools remain and no thread id can be resolved, replace the carrier with a terminal `ERROR`
   * inside the poll loop (via `willReplaceWithError`) so the run finishes and does not hang.
   * `sendMessage` still applies the existing `onSameThread` gate to that ERROR — do not special-case
   * null thread ids there. Terminal emissions that still have unfulfilled tools are withheld via
   * `willFulfill` / `willReplaceWithError` on the poll carrier (set once in `toPollEmission`).
   */
  #pollRunStatus(partnerId: number, runId: string, threadIdHint: string | null = null): Observable<ChatbotRunOutput> {
    return defer(() => {
      let attempts = 0;
      let currentRunId = runId;
      let fulfillmentRounds = 0;
      let knownThreadId: string | null = normalizeChatbotThreadId(threadIdHint);
      const fulfilledToolCallIds = new Set<string>();

      const hasFulfillmentBudget = (): boolean => fulfillmentRounds < ChatbotFacade.MAX_CLIENT_TOOL_FULFILLMENT_ROUNDS;

      const resolveThreadIdForFulfill = (runOutput: ChatbotRunOutput): string | null =>
        normalizeChatbotThreadId(runOutput.threadId) ?? knownThreadId;

      const toPollEmission = (runOutput: ChatbotRunOutput): ChatbotPollEmission => {
        // Pure over the poll payload (no network / side effects). COMPLETED + null messages +
        // tool triads remap to quiet ERROR instead of throwing in sendMessage.
        const hasToolHostEvents = hostEventsContainCompleteClientToolTriad(runOutput.hostEvents);

        const toolCalls = parseClientToolCallsFromHostEvents(runOutput.hostEvents);
        const pendingToolCalls = toolCalls.filter((toolCall: ChatbotClientToolCall) => !fulfilledToolCallIds.has(toolCall.toolCallId));
        const hasResolvableThread = resolveThreadIdForFulfill(runOutput) !== null;
        const willFulfill = pendingToolCalls.length > 0 && hasResolvableThread && hasFulfillmentBudget();
        // Pending tools + no thread: expand emits synthetic ERROR — withhold the original carrier.
        const willReplaceWithError = pendingToolCalls.length > 0 && !hasResolvableThread;

        return {
          hasToolHostEvents,
          pendingToolCalls,
          runOutput,
          willFulfill,
          willReplaceWithError,
        };
      };

      const requestOnce = (): Observable<ChatbotRunOutput> => {
        attempts++;
        return this.#chatbotApiService.getRunStatus(partnerId, currentRunId).pipe(
          map((response: HttpResponse<ChatbotRunOutputDTO>) => {
            if (!response.body) {
              throw new Error('No response body returned from the chatbot polling API.');
            }
            const runOutput: ChatbotRunOutput | null = this.#chatbotAdapter.fromRunOutputApi(new BaseResponse(response.body, null));
            if (!runOutput) {
              throw new Error('No run output returned from the chatbot polling API.');
            }
            return runOutput;
          }),
          catchError((error: unknown) => {
            if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.RequestTimeout) {
              const timeoutOutput: ChatbotRunOutput | null = this.#chatbotAdapter.fromRunTimeoutErrorApi(error, currentRunId);
              if (timeoutOutput !== null) {
                return of(timeoutOutput);
              }
            }
            return throwError(() => error);
          }),
        );
      };

      const requestWithErrorRetry = (retriesLeft: number): Observable<ChatbotPollEmission> =>
        requestOnce().pipe(
          map(toPollEmission),
          mergeMap((emission: ChatbotPollEmission) => {
            const shouldRetryTransientError =
              emission.runOutput.status === ChatbotRunStatus.ERROR && retriesLeft > 0 && emission.pendingToolCalls.length === 0;

            if (!shouldRetryTransientError) {
              return of(emission);
            }
            return of(null).pipe(
              delay(ChatbotFacade.POLLING_INTERVAL_MS),
              mergeMap(() => requestWithErrorRetry(retriesLeft - 1)),
            );
          }),
        );

      const continuePolling = (): Observable<ChatbotPollEmission> =>
        of(null).pipe(
          delay(ChatbotFacade.POLLING_INTERVAL_MS),
          mergeMap(() => requestWithErrorRetry(ChatbotFacade.MAX_POLL_ERROR_RETRIES)),
        );

      return requestWithErrorRetry(ChatbotFacade.MAX_POLL_ERROR_RETRIES).pipe(
        expand((emission: ChatbotPollEmission) => {
          const { pendingToolCalls, runOutput, willFulfill, willReplaceWithError } = emission;

          const nextKnownThreadId = normalizeChatbotThreadId(runOutput.threadId);
          if (nextKnownThreadId !== null) {
            knownThreadId = nextKnownThreadId;
          }

          if (willFulfill) {
            const threadIdForFulfill = resolveThreadIdForFulfill(runOutput);
            // Invariant: `willFulfill` is only set when a thread was resolvable at emission time, and
            // `knownThreadId` is never cleared — so this cannot become null here. No-thread cases go
            // through `willReplaceWithError` instead (do not duplicate that path).
            if (threadIdForFulfill === null) {
              throw new Error('[ChatbotFacade] Invariant violated: willFulfill without a resolvable thread id');
            }

            fulfillmentRounds++;
            return this.#chatbotClientToolFulfillment
              .fulfill(partnerId, {
                runId: runOutput.runId,
                threadId: threadIdForFulfill,
                timeoutMs: ChatbotFacade.CHATBOT_TIMEOUT_MS,
                toolCalls: pendingToolCalls,
              })
              .pipe(
                tap(outcome => {
                  for (const toolCall of pendingToolCalls) {
                    fulfilledToolCallIds.add(toolCall.toolCallId);
                  }
                  // Fresh poll budget for the continuation run — do not inherit the prior run's attempts.
                  attempts = 0;
                  currentRunId = outcome.continuation.runId;
                  const continuationThreadId = normalizeChatbotThreadId(outcome.continuation.threadId);
                  if (continuationThreadId !== null) {
                    knownThreadId = continuationThreadId;
                  }
                }),
                mergeMap(() => continuePolling()),
              );
          }

          if (willReplaceWithError) {
            // Mark calls handled so a later filter pass cannot drop this terminal ERROR emission.
            for (const toolCall of pendingToolCalls) {
              fulfilledToolCallIds.add(toolCall.toolCallId);
            }

            return of(
              toPollEmission({
                ...runOutput,
                hostEvents: undefined,
                messages: null,
                status: ChatbotRunStatus.ERROR,
              }),
            );
          }

          if (pendingToolCalls.length > 0 && !hasFulfillmentBudget()) {
            // Prod-visible: usually means BE mints a new toolCallId every round (unbounded loop).
            const pendingToolCallIds = pendingToolCalls.map((toolCall: ChatbotClientToolCall) => toolCall.toolCallId);
            const message = `[ChatbotFacade] Client-tool fulfillment round cap (${ChatbotFacade.MAX_CLIENT_TOOL_FULFILLMENT_ROUNDS}) reached; emitting terminal run without further fulfill`;
            console.error(message, { pendingToolCallIds, runId: runOutput.runId });
            Sentry.captureMessage(message, {
              extra: { pendingToolCallIds, runId: runOutput.runId },
              level: 'error',
            });
          }

          if (runOutput.status !== ChatbotRunStatus.PENDING) {
            return EMPTY;
          }

          if (attempts >= ChatbotFacade.MAX_POLL_ATTEMPTS) {
            return of(toPollEmission({ messages: null, runId: currentRunId, status: ChatbotRunStatus.TIMED_OUT, threadId: null }));
          }

          return continuePolling();
        }),
        // Withhold carriers that expand will fulfill or replace with a synthetic ERROR.
        filter((emission: ChatbotPollEmission) => !emission.willFulfill && !emission.willReplaceWithError),
        map((emission: ChatbotPollEmission): ChatbotRunOutput => {
          const runOutput: ChatbotRunOutput = { ...emission.runOutput, pollAttempts: attempts };
          // Tool-terminal COMPLETED polls often have `messages: null`. Remap to ERROR when the poll
          // still carries tool hostEvents (pending or already fulfilled / echoed) so sendMessage
          // clears thinking without throwing a toast.
          const hasNoMessages = runOutput.messages == null || runOutput.messages.length === 0;
          if (runOutput.status === ChatbotRunStatus.COMPLETED && hasNoMessages && emission.hasToolHostEvents) {
            return { ...runOutput, status: ChatbotRunStatus.ERROR };
          }
          return runOutput;
        }),
      );
    });
  }

  #preserveOptimisticReadState(threads: ChatbotThread[]): ChatbotThread[] {
    if (this.#markedReadIds.size === 0) return threads;
    return threads.map((thread: ChatbotThread) => (this.#markedReadIds.has(thread.id) ? { ...thread, read: true } : thread));
  }

  #refreshThreadFromHistory(partnerId: number, threadId: string): void {
    this.#disposeActiveHistoryRefresh();
    this.#activeHistoryRefreshThreadId = threadId;

    this.#activeHistoryRefreshSubscription = this.#chatbotThreadsApiService
      .getThreadHistory(partnerId, threadId)
      .pipe(
        map((response: HttpResponse<ChatbotThreadHistoryDTO>): ChatbotThreadHistory | null => {
          if (!response.body) return null;
          return this.#chatbotThreadsAdapter.fromThreadHistoryApi(new BaseResponse(response.body, null));
        }),
        catchError(() => of(null)),
      )
      .subscribe((history: ChatbotThreadHistory | null) => {
        if (!history) return;

        const localMessageCount: number = (this.#sessionMessages.get(threadId) ?? []).reduce(
          (count: number, item: ChatbotConversationItem) => count + item.messages.length,
          0,
        );
        if (history.messages.length <= localMessageCount) return;

        const reconciledMessages: ChatbotConversationItem[] = this.#groupMessagesByConversationItem(history.messages);
        this.#sessionMessages.set(threadId, reconciledMessages);

        if (this.#threadId() === threadId) {
          this.#messages.set(reconciledMessages);
        }
      });
  }

  /**
   * Fresh `view_context` for every `sendMessage` turn (including follow-ups), not only thread
   * creation — intentional per study §4.6 / ticket 21. Still rides the initChat HTTP request.
   * Payload size is bounded by the element cap + table summaries; measure on heavy screens before
   * broad partner rollout. If BE later wants first-message or route-change-only, gate here.
   */
  #resolveViewContextForSend(): FzAssistantViewContext | undefined {
    try {
      // Always attach. No host → `{ route, title }` without `elements` (Pablo / #12087).
      // Active host with empty `elements` still means “captured, nothing operable” (not `no_match`).
      // `no_match` stays on `describe_view` when an explicit scope does not resolve.
      return this.#discoverFacade.buildViewContextForSend();
    } catch (error: unknown) {
      // Degrade: omit view_context so send still proceeds. Log in dev so a broken capture is visible
      // locally (study §10.2); matches ChatbotClientToolFulfillmentService handler-failure posture.
      if (isDevMode()) {
        console.error('[ChatbotFacade] Discover capture failed during send; sending without view_context', error);
      }
      return undefined;
    }
  }

  #rollbackOptimisticMarkRead(threadId: string): void {
    this.#markedReadIds.delete(threadId);
    this.patchThread(threadId, { read: false });
  }

  #wasConversationAbandoned(userMessage: ChatbotConversationItem): boolean {
    return !this.#messages().includes(userMessage);
  }
}

function normalizeChatbotThreadId(threadId: string | null | undefined): string | null {
  if (threadId === null || threadId === undefined) {
    return null;
  }

  const trimmed = threadId.trim();
  return trimmed === '' ? null : trimmed;
}

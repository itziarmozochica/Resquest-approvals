import { NgOptimizedImage } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  Signal,
  signal,
  untracked,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import {
  CHATBOT_THREAD_MENU_ACTIONS,
  ChatbotThread,
  ChatbotThreadListResponse,
  ChatbotThreadMenuActionId,
  ChatbotThreadsState,
} from '@fz-original/app/shared/models/chatbot/chatbot-thread.model';
import { ChatbotThreadsApiService } from '@fz-original/app/shared/services/chatbot/chatbot-threads-api.service';
import { ChatbotThreadsAdapter } from '@fz-original/app/shared/services/chatbot/chatbot-threads.adapter';
import { ChatbotFacade } from '@fz-original/app/shared/services/chatbot/chatbot.facade';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { ANALYTICS_BASE_ROUTE } from '@fz-original/app/shared/utils/analytics-breadcrumb.util';
import { IgntIconComponent } from '@ignite/icon';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, debounceTime, defer, distinctUntilChanged, EMPTY, finalize, map, Observable, Subject, switchMap, tap } from 'rxjs';

import { AnalyticsRoutes } from '../../../analytics-routes';
import {
  ChatbotThreadListComponent,
  ChatbotThreadMenuActionEvent,
  ChatbotThreadRenameSaveEvent,
} from '../chatbot-thread-list/chatbot-thread-list.component';

const SEARCH_DEBOUNCE_MS = 300;
const THREADS_PAGE_SIZE = 20;
const DRAWER_MEDIA_QUERY = '(max-width: 767.98px)';

/* Sidebar owns only the request-meta (loading, cursor, search, error) for each list.
   The actual `threads` array lives on the facade so the optimistic-mark orchestration
   (cache lookup → patch → API → rollback) has a single source of truth and the
   constructor's auto-mark effect on direct-URL nav stays consistent with sidebar clicks. */
type SidebarListState = Omit<ChatbotThreadsState, 'threads'>;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.chatbot-threads-sidebar--collapsed]': 'isCollapsed() && !embedded()',
    '[class.chatbot-threads-sidebar--embedded]': 'embedded()',
    class: 'chatbot-threads-sidebar',
  },
  imports: [ChatbotThreadListComponent, IgntIconComponent, IgntInputFieldComponent, NgOptimizedImage, ReactiveFormsModule, TranslateModule],
  selector: 'app-chatbot-threads-sidebar',
  standalone: true,
  styleUrl: './chatbot-threads-sidebar.component.scss',
  templateUrl: './chatbot-threads-sidebar.component.html',
})
export class ChatbotThreadsSidebarComponent {
  readonly #chatbotFacade = inject(ChatbotFacade);
  readonly #chatbotThreadsAdapter = inject(ChatbotThreadsAdapter);
  readonly #chatbotThreadsApiService = inject(ChatbotThreadsApiService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #partnerService = inject(PartnerService);
  readonly #router = inject(Router);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);

  activeThreadId = input<string | null>(null);
  embedded = input<boolean>(false);
  lastCreatedThreadId = input<string | null>(null);
  lastCreatedThreadTitle = input<string | null>(null);
  pendingThreadTitles = input<Record<string, string>>({});
  titleReadyThreadId = input<string | null>(null);

  collapsed = output<boolean>();
  newChat = output<void>();
  threadSelected = output<string>();

  searchControl: FormControl<string> = new FormControl<string>('', { nonNullable: true });

  #isCollapsed: WritableSignal<boolean>;
  #isDrawerMode: WritableSignal<boolean>;
  #pendingTitleThreadId: WritableSignal<string | null> = signal<string | null>(null);
  #renamingThreadId: WritableSignal<string | null> = signal<string | null>(null);
  #regularListState: WritableSignal<SidebarListState> = signal<SidebarListState>({
    error: false,
    isLoading: false,
    nextCursor: null,
    searchQuery: '',
  });

  isCollapsed: Signal<boolean>;
  pendingTitleThreadId: Signal<string | null> = this.#pendingTitleThreadId.asReadonly();
  /* Public state signals expose the legacy `ChatbotThreadsState` shape (meta + threads)
     so the template + tests don't have to know the threads now live on the facade. */
  threads: Signal<ChatbotThread[]> = this.#chatbotFacade.regularThreads;
  renamingThreadId: Signal<string | null> = this.#renamingThreadId.asReadonly();
  threadsState: Signal<ChatbotThreadsState> = computed(() => ({
    ...this.#regularListState(),
    threads: this.threads(),
  }));

  hasMoreThreads: Signal<boolean> = computed(() => this.#regularListState().nextCursor !== null);
  isLoading: Signal<boolean> = computed(() => this.#regularListState().isLoading);
  isSearchActive: Signal<boolean> = computed(() => this.#regularListState().searchQuery.length > 0);
  searchQuery: Signal<string> = computed(() => this.#regularListState().searchQuery);
  displayThreads: Signal<ChatbotThread[]> = computed(() => {
    const threads: ChatbotThread[] = this.threads();
    const pendingId: string | null = this.#pendingTitleThreadId();
    const optimisticTitle: string | null = this.lastCreatedThreadTitle();
    const pendingTitlesMap: Record<string, string> = this.pendingThreadTitles();

    return threads.map((thread: ChatbotThread) => {
      if (pendingId && optimisticTitle && thread.id === pendingId) {
        return { ...thread, title: optimisticTitle };
      }
      if (!thread.title && pendingTitlesMap[thread.id]) {
        return { ...thread, title: pendingTitlesMap[thread.id] };
      }
      return thread;
    });
  });

  #fetchAction$ = new Subject<{ cursor?: string; query?: string; silent?: boolean }>();
  #hasProcessedInitialLastCreated = false;
  #hasProcessedInitialTitleReady = false;

  constructor() {
    const mediaQueryList: MediaQueryList | null =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(DRAWER_MEDIA_QUERY) : null;
    const initialDrawerMode: boolean = mediaQueryList?.matches ?? false;

    this.#isDrawerMode = signal<boolean>(initialDrawerMode);
    this.#isCollapsed = signal<boolean>(initialDrawerMode);
    this.isCollapsed = this.#isCollapsed.asReadonly();

    /* Defer to afterNextRender so the parent's (collapsed) listener is subscribed
       before we emit. Without this, the parent's isSidebarCollapsed would stay at
       its default false on mobile until the first user interaction. */
    if (initialDrawerMode) {
      afterNextRender(() => this.collapsed.emit(true));
    }

    if (mediaQueryList) {
      const listener = (event: MediaQueryListEvent): void => {
        this.#isDrawerMode.set(event.matches);
        if (event.matches && !this.#isCollapsed()) {
          this.#isCollapsed.set(true);
          this.collapsed.emit(true);
        }
      };
      mediaQueryList.addEventListener('change', listener);
      this.#destroyRef.onDestroy(() => mediaQueryList.removeEventListener('change', listener));
    }

    this.#fetchAction$
      .pipe(
        switchMap((action: { cursor?: string; query?: string; silent?: boolean }) => this.#fetchThreads$(action)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();

    effect(() => {
      const newThreadId = this.lastCreatedThreadId();
      if (!this.#hasProcessedInitialLastCreated) {
        this.#hasProcessedInitialLastCreated = true;
        return;
      }
      this.#pendingTitleThreadId.set(newThreadId);
      if (newThreadId) {
        this.#refreshThreadsList();
      }
    });

    effect(() => {
      const readyThreadId = this.titleReadyThreadId();
      if (!this.#hasProcessedInitialTitleReady) {
        this.#hasProcessedInitialTitleReady = true;
        return;
      }
      if (readyThreadId) {
        untracked(() => {
          if (this.#pendingTitleThreadId() === readyThreadId) {
            this.#pendingTitleThreadId.set(null);
          }
          this.#refreshThreadsList();
        });
      }
    });

    this.#setupSearch();
    this.#fetchAction$.next({});
  }

  onClearSearch(): void {
    this.searchControl.setValue('');
  }

  onCollapseToggle(): void {
    this.#isCollapsed.update((collapsed: boolean) => !collapsed);
    this.collapsed.emit(this.#isCollapsed());
  }

  onListLoadMore(): void {
    this.#loadMoreThreads();
  }

  onListMenuAction(event: ChatbotThreadMenuActionEvent): void {
    this.onThreadMenuAction(event.threadId, event.actionId);
  }

  onListRenameSave(event: ChatbotThreadRenameSaveEvent): void {
    this.onRenameSave(event.threadId, event.title);
  }

  onNewChat(): void {
    this.newChat.emit();
  }

  onRenameCancel(): void {
    this.#renamingThreadId.set(null);
  }

  onRenameSave(threadId: string, newTitle: string): void {
    const partnerId: number | undefined = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined) return;

    const previousTitle: string | undefined = this.#chatbotFacade.findThread(threadId)?.title;

    this.#renamingThreadId.set(null);
    this.#chatbotFacade.patchThread(threadId, { title: newTitle });

    this.#chatbotThreadsApiService
      .updateThreadTitle(partnerId, threadId, newTitle)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          if (previousTitle !== undefined) {
            this.#chatbotFacade.patchThread(threadId, { title: previousTitle });
          }
          this.#toastService.add({
            autoHide: true,
            message: this.#translateService.instant('chatbot.threads.renameError'),
            sentiment: AlertSentiment.danger,
          });
        },
      });
  }

  onThreadMenuAction(threadId: string, actionId: ChatbotThreadMenuActionId): void {
    switch (actionId) {
      case CHATBOT_THREAD_MENU_ACTIONS.Rename:
        this.#renamingThreadId.set(threadId);
        break;
    }
  }

  onThreadSelect(threadId: string): void {
    if (this.embedded()) {
      this.threadSelected.emit(threadId);
      return;
    }

    this.#router.navigate([ANALYTICS_BASE_ROUTE, AnalyticsRoutes.FzAssistant, threadId], { queryParamsHandling: 'preserve' });

    if (this.#isDrawerMode() && !this.#isCollapsed()) {
      this.#isCollapsed.set(true);
      this.collapsed.emit(true);
    }
  }

  #fetchThreads$(options: { cursor?: string; query?: string; silent?: boolean }): Observable<void> {
    const partnerId: number | undefined = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined) return EMPTY;

    const { cursor, query, silent } = options;
    const isSearching: boolean = query !== undefined && query.length > 0;
    const errorKey: string = isSearching ? 'chatbot.threads.searchError' : 'chatbot.threads.loadError';

    return defer(() => {
      if (!silent) {
        this.#regularListState.update((state: SidebarListState) => ({ ...state, error: false, isLoading: true }));
      }
      return isSearching
        ? this.#chatbotThreadsApiService.searchThreads(partnerId, { cursor, limit: THREADS_PAGE_SIZE, q: query as string })
        : this.#chatbotThreadsApiService.getThreads(partnerId, { cursor, limit: THREADS_PAGE_SIZE });
    }).pipe(
      map(response => {
        if (!response.body) {
          throw new Error('No response body');
        }
        return this.#chatbotThreadsAdapter.fromThreadListApi(new BaseResponse(response.body, null));
      }),
      tap((result: ChatbotThreadListResponse | null) => {
        if (result) {
          this.#regularListState.update((state: SidebarListState) => ({
            ...state,
            nextCursor: result.nextCursor,
          }));
          if (cursor) {
            this.#chatbotFacade.appendRegularThreads(result.threads);
          } else {
            this.#chatbotFacade.setRegularThreads(result.threads);
          }
        }
      }),
      catchError(() => {
        if (!silent) {
          this.#regularListState.update((state: SidebarListState) => ({ ...state, error: true }));
          this.#toastService.add({
            autoHide: true,
            message: this.#translateService.instant(errorKey),
            sentiment: AlertSentiment.danger,
          });
        }
        return EMPTY;
      }),
      finalize(() => {
        if (!silent) {
          this.#regularListState.update((state: SidebarListState) => ({ ...state, isLoading: false }));
        }
      }),
      map((): undefined => undefined),
    );
  }

  #loadMoreThreads(): void {
    const { isLoading, nextCursor, searchQuery } = this.#regularListState();
    if (isLoading || !nextCursor) return;

    this.#fetchAction$.next({ cursor: nextCursor, query: searchQuery.length > 0 ? searchQuery : undefined });
  }

  #refreshThreadsList(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.#regularListState.update((state: SidebarListState) => ({
      ...state,
      nextCursor: null,
      searchQuery: '',
    }));
    this.#chatbotFacade.setRegularThreads([]);
    this.#fetchAction$.next({});
  }

  #setupSearch(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        map((query: string) => query.trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((trimmedQuery: string) => {
        this.#regularListState.update((state: SidebarListState) => ({
          ...state,
          nextCursor: null,
          searchQuery: trimmedQuery,
        }));
        this.#chatbotFacade.setRegularThreads([]);
        this.#fetchAction$.next({ query: trimmedQuery });
      });
  }
}

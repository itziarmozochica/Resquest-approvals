import { computed, inject } from '@angular/core';

import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { setAllEntities, setEntities, updateEntity, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, filter, mergeMap, pipe, switchMap, tap } from 'rxjs';

import { InboxNotification } from '../models/inbox-notification.model';
import { InboxNotificationsPage } from '../models/inbox-notifications-page.model';
import { initialInboxNotificationsState } from '../models/store/inbox-notifications-store.model';
import { NotificationsApiService } from '../services/notifications-api.service';
import { setError, setLoadMoreError, setLoadMorePending, setLoadMoreSuccess, setPending, setSuccess } from '../utils/request-state.util';
import { formatUnreadCount } from '../utils/unread-count.util';

export const InboxNotificationsStore = signalStore(
  { providedIn: 'root' },
  withEntities<InboxNotification>(),
  withState(initialInboxNotificationsState),
  withComputed(({ entities, nextCursor, unseenCount }) => ({
    hasMore: computed(() => nextCursor() !== null),
    hasUnread: computed(() => unseenCount() > 0),
    notifications: computed(() => entities()),
    unreadCountDisplay: computed(() => formatUnreadCount(unseenCount())),
  })),
  withMethods((store, api = inject(NotificationsApiService)) => {
    let loadEpoch = 0;

    /** Applies a fresh first page (entities + cursor + unseenCount) from the server as the source of truth. */
    const applyPage = (page: InboxNotificationsPage): void => {
      loadEpoch++;
      patchState(store, setSuccess(), setAllEntities(page.items), {
        nextCursor: page.nextCursor,
        unseenCount: page.unseenCount,
      });
    };

    const loadInbox = rxMethod<void>(
      pipe(
        switchMap(() => {
          patchState(store, setPending(), { loadMoreError: null, nextCursor: null });
          return api.getInboxPage(null).pipe(
            tap((page: InboxNotificationsPage) => applyPage(page)),
            catchError((error: unknown) => {
              patchState(store, setError(error));
              return EMPTY;
            }),
          );
        }),
      ),
    );

    return {
      loadInbox,
      loadMore: rxMethod<void>(
        pipe(
          filter(() => store.nextCursor() !== null && !store.isLoadingMore() && !store.isLoading()),
          switchMap(() => {
            patchState(store, setLoadMorePending());
            return api.getInboxPage(store.nextCursor()).pipe(
              tap((page: InboxNotificationsPage) => {
                patchState(store, setLoadMoreSuccess(), setEntities(page.items), {
                  nextCursor: page.nextCursor,
                });
              }),
              catchError((error: unknown) => {
                patchState(store, setLoadMoreError(error));
                return EMPTY;
              }),
            );
          }),
        ),
      ),
      markSeen: rxMethod<string>(
        pipe(
          mergeMap((id: string) => {
            const previous = store.entityMap()[id];

            if (previous == null) {
              return api.markSeen(id).pipe(
                tap(() => loadInbox()),
                catchError(() => EMPTY),
              );
            }

            if (previous.isRead) {
              return api.markSeen(id).pipe(catchError(() => EMPTY));
            }

            const epochAtRequest = loadEpoch;
            patchState(store, updateEntity({ changes: { isRead: true }, id }), { unseenCount: Math.max(0, store.unseenCount() - 1) });
            return api.markSeen(id).pipe(
              catchError(() => {
                if (loadEpoch === epochAtRequest) {
                  patchState(store, updateEntity({ changes: { isRead: false }, id }), { unseenCount: store.unseenCount() + 1 });
                }
                return EMPTY;
              }),
            );
          }),
        ),
      ),
    };
  }),
);

import type { InboxNotificationsStoreState } from '../models/store/inbox-notifications-store.model';

type LoadSlice = Pick<InboxNotificationsStoreState, 'error' | 'isLoading'>;
type LoadMoreSlice = Pick<InboxNotificationsStoreState, 'isLoadingMore' | 'loadMoreError'>;

export function setPending(): LoadSlice {
  return { error: null, isLoading: true };
}

export function setError(error: unknown): LoadSlice {
  return { error, isLoading: false };
}

export function setSuccess(): LoadSlice {
  return { error: null, isLoading: false };
}

export function setLoadMorePending(): LoadMoreSlice {
  return { isLoadingMore: true, loadMoreError: null };
}

export function setLoadMoreError(error: unknown): LoadMoreSlice {
  return { isLoadingMore: false, loadMoreError: error };
}

export function setLoadMoreSuccess(): LoadMoreSlice {
  return { isLoadingMore: false, loadMoreError: null };
}

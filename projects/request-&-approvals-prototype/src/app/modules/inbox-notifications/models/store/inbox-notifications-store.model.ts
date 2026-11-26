export interface InboxNotificationsStoreState {
  readonly error: unknown;
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly loadMoreError: unknown;
  readonly nextCursor: string | null;
  readonly unseenCount: number;
}

export const initialInboxNotificationsState: InboxNotificationsStoreState = {
  error: null,
  isLoading: false,
  isLoadingMore: false,
  loadMoreError: null,
  nextCursor: null,
  unseenCount: 0,
};

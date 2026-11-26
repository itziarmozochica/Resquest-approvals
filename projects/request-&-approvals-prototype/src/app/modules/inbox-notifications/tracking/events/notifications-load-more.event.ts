import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface NotificationsLoadMoreData {
  shownCount: number;
}

export const notificationsLoadMore = defineEvent<NotificationsLoadMoreData>('notifications.list.load_more');

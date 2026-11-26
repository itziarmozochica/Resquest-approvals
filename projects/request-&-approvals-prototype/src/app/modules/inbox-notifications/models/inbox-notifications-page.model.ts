import { InboxNotification } from './inbox-notification.model';

export interface InboxNotificationsPage {
  items: InboxNotification[];
  nextCursor: string | null;
  unseenCount: number;
}

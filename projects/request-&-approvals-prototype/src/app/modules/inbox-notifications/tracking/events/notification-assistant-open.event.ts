import { defineEvent } from '@fz/fz-tracking/src/public-api';

import type { NotificationItemEventData } from './notification-item-event-data';

export const notificationAssistantOpen = defineEvent<NotificationItemEventData>('notifications.item.assistant_open');

import { mixpanelMapper } from '@fz/fz-tracking/src/public-api';

import { openCustomerServiceChat } from './events/open-customer-service-chat.event';

export const customerServiceChatMixpanelMappers = mixpanelMapper([
  {
    event: openCustomerServiceChat,
    name: 'opened_customer_service_chat',
    properties: ({ entrypoint }) => ({ entry_point: entrypoint }),
  },
]);

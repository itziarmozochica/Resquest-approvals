import { mixpanelMapper } from '@fz/fz-tracking/src/public-api';

import { resendWhatsappPurchaseConfirmation } from './events/resend-whatsapp-purchase-confirmation.event';

export const validationMixpanelMappers = mixpanelMapper([
  {
    event: resendWhatsappPurchaseConfirmation,
    name: 'resend_whatsapp_purchase_confirmation',
    properties: ({ ticketId }) => ({
      ticket_id: ticketId,
    }),
  },
]);

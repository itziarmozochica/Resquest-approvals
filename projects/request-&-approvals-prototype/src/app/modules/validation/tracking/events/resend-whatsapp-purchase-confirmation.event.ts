import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ResendWhatsappPurchaseConfirmationData {
  ticketId: number;
}

export const resendWhatsappPurchaseConfirmation = defineEvent<ResendWhatsappPurchaseConfirmationData>(
  'resend.whatsappPurchaseConfirmation',
);

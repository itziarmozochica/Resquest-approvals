import { mixpanelMapper } from '@fz/fz-tracking/src/public-api';

import { clickDownloadTicketPdf } from './events/click-download-ticket-pdf.event';
import { openDownloadTicketPage } from './events/open-download-ticket-page.event';

export const downloadQrTicketMixpanelMappers = mixpanelMapper([
  {
    event: openDownloadTicketPage,
    name: 'open_download_ticket_page',
    properties: ({ partnerIdentifier }) => ({ partner_identifier: partnerIdentifier }),
  },
  {
    event: clickDownloadTicketPdf,
    name: 'click_download_ticket_pdf',
    properties: ({ orderId, partnerIdentifier, planId, successDownloadingPdf }) => ({
      order_id: orderId,
      partner_identifier: partnerIdentifier,
      plan_id: planId,
      success_downloading_pdf: successDownloadingPdf,
    }),
  },
]);

import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ClickDownloadTicketPdfData {
  orderId: number | null;
  partnerIdentifier: number;
  planId: number | null;
  successDownloadingPdf: boolean;
}

export const clickDownloadTicketPdf = defineEvent<ClickDownloadTicketPdfData>('click.downloadTicketPdf');

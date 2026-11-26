import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface OpenDownloadTicketPageData {
  partnerIdentifier: number;
}

export const openDownloadTicketPage = defineEvent<OpenDownloadTicketPageData>('open.downloadTicketPage');

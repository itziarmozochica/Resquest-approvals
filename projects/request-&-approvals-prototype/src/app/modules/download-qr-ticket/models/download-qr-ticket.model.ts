export interface DownloadQrTicketLink {
  data: string;
  onsiteSetupId: string | null;
  partnerId: number | null;
}

export interface EncodedOrderTicketPdfRequest {
  codeIds: string[];
  data: string;
  onsiteSetupId: string | null;
  partnerId: number;
}

export interface OpenedTicketsState {
  batches: TicketBatchLink[];
  hasOpenedTickets: boolean;
  order?: OpenedTicketsOrder | null;
}

export interface OpenedTicketsOrder {
  id: number | null;
  planId: number | null;
}

export interface TicketBatchLink {
  from: number;
  label: string;
  to: number;
  url: string;
}

export const encodedOrderNotFoundErrorCode = 811;
export const genericErrorMessageKey = 'errors.generic';
export const orderNotFoundMessageKey = 'errors.811';

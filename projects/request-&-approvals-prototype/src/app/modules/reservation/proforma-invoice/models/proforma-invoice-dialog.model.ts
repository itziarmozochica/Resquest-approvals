export interface ProformaInvoiceDialogData {
  businessEmail: string | null;
  businessId: string | null;
  businessName: string | null;
  language: string;
  reservationId: string;
}

export interface ProformaInvoiceDialogResult {
  downloaded: boolean;
}

export enum ProformaInvoiceDialogError {
  DOWNLOAD = 'download',
  LOAD_BUSINESS = 'loadBusiness',
}

export const PROFORMA_INVOICE_MIN_SEARCH_LENGTH = 3;
export const PROFORMA_INVOICE_SEARCH_PAGE_SIZE = 100;

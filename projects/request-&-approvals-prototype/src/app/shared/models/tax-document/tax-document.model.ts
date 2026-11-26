export interface TaxDocumentDTO {
  simplified_bill_id: string;
  supplier_business_name: string;
  supplier_tax_id: string;
  file_url: string;
  transaction_reason: string;
  component?: string | null;
  is_full_invoice?: boolean;
}

export enum TransactionReasonEnum {
  PURCHASE = 'purchase',
  CREDIT_NOTE = 'credit_note',
}

export enum TaxDocumentComponentEnum {
  MIXED = 'mixed',
  SURCHARGE = 'surcharge',
  TICKET = 'ticket',
}

export interface TaxDocument {
  id: string;
  supplierBusinessName: string;
  supplierTaxId: string;
  fileUrl: string;
  transactionReason: TransactionReasonEnum;
  component?: TaxDocumentComponentEnum;
  isFullInvoice?: boolean;
}

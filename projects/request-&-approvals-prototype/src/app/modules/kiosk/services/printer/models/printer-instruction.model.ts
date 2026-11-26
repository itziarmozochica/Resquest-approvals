export interface PrinterInstruction {
  type: string;
  parameters: Array<string | number>;
}

export interface PrinterInstructionsResponse {
  data: Array<PrinterInstruction>;
}

export enum PrinterDocumentType {
  ticket = 'ticket',
  receipt = 'receipt',
  cash_integration = 'cash_integration',
  gift_aid = 'gift_aid',
  refund = 'refund',
}

export interface FiscalTag {
  label?: string;
  value: string;
}

export interface PrinterInstructionsRequest {
  document_type: PrinterDocumentType;
  unify_ticket?: boolean;
  device_id?: string;
  cut_paper_mode?: number;
  at_index?: number;
  code_ids?: number[];
  channel_id?: string;
  fiscal_number?: string;
  fiscal_tags?: FiscalTag[];
}

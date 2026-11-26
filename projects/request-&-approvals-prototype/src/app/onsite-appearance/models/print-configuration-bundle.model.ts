import { PrinterDocumentType } from '../enums/printer-document-type.enum';
import { PrinterType } from '../enums/printer-type.enum';

export interface PrintConfigurationTicketPayloadDTO {
  partner_logo_url: string | null;
  venue_name: boolean;
  venue_name_text: string | null;
  address: boolean;
  date_and_start_time: boolean;
  open_gates: boolean;
  price: boolean;
  surcharge_breakdown: boolean;
  code_text_below_qr: boolean;
  seating_info: boolean;
  nominative: boolean;
  partner_tax_info: boolean;
  partner_tax_info_text: string | null;
  disclaimer_and_terms: boolean;
  disclaimer_and_terms_text: string | null;
  powered_by_fever: boolean;
}

export interface PrintConfigurationDTO {
  id: string;
  name: string;
  document_type: PrinterDocumentType;
  printer_type: PrinterType;
  print_template_layout_id: string;
  ticket?: PrintConfigurationTicketPayloadDTO;
}

export interface PrintConfigurationBundleDTO {
  id: string;
  partner_id: number;
  name: string;
  print_configurations: PrintConfigurationDTO[];
}

export interface PrintConfigurationTicketPayload {
  partnerLogoUrl: string | null;
  venueName: boolean;
  venueNameText: string | null;
  address: boolean;
  dateAndStartTime: boolean;
  openGates: boolean;
  price: boolean;
  surchargeBreakdown: boolean;
  codeTextBelowQr: boolean;
  seatingInfo: boolean;
  nominative: boolean;
  partnerTaxInfo: boolean;
  partnerTaxInfoText: string | null;
  disclaimerAndTerms: boolean;
  disclaimerAndTermsText: string | null;
  poweredByFever: boolean;
}

export interface PrintConfiguration {
  id: string;
  name: string;
  documentType: PrinterDocumentType;
  printerType: PrinterType;
  printTemplateLayoutId: string;
  ticket?: PrintConfigurationTicketPayload;
}

export interface PrintConfigurationBundle {
  id: string;
  partnerId: number;
  name: string;
  printConfigurations: PrintConfiguration[];
}

export interface PrintConfigurationInputDTO {
  name: string;
  document_type: PrinterDocumentType;
  printer_type: PrinterType;
  print_template_layout_id: string;
  ticket?: PrintConfigurationTicketPayloadDTO;
}

export interface PrintConfigurationBundleInputDTO {
  name: string;
  print_configurations: PrintConfigurationInputDTO[];
}

export interface PrintConfigurationInput {
  name: string;
  documentType: PrinterDocumentType;
  printerType: PrinterType;
  printTemplateLayoutId: string;
  ticket?: PrintConfigurationTicketPayload;
}

export interface PrintConfigurationBundleInput {
  name: string;
  printConfigurations: PrintConfigurationInput[];
}

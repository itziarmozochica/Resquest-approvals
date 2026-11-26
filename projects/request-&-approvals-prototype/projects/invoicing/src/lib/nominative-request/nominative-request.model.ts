export type NominativeRequestDocumentType = 'passport' | 'tax_id' | 'national_id';

export type NominativeRequestProcessingStatus = 'pending' | 'completed' | 'failed';

export type NominativeRequestCustomerType = 'business' | 'individual';

export type NominativeRequestDocumentTypeScheme = 'colombia' | 'default';

export const nominativeCountryItaly = 'IT';
export const nominativeCountryMexico = 'MX';
export const nominativeCountryColombia = 'CO';
export const nominativeCountryFrance = 'FR';
export const nominativeCountriesNotRequiringATaxIdFromNationalIndividuals: readonly string[] = ['AT', 'AU', 'DE', 'SG'];

export interface NominativeRequestDocumentTypeOption {
  readonly customerType: NominativeRequestCustomerType;
  readonly scheme: NominativeRequestDocumentTypeScheme;
  readonly value: NominativeRequestDocumentType;
}

export const colombiaDocumentTypes: readonly NominativeRequestDocumentTypeOption[] = [
  { customerType: 'business', scheme: 'colombia', value: 'tax_id' },
  { customerType: 'individual', scheme: 'colombia', value: 'national_id' },
];

export const customerTypeDocumentTypes: readonly NominativeRequestDocumentTypeOption[] = [
  { customerType: 'business', scheme: 'default', value: 'tax_id' },
  { customerType: 'individual', scheme: 'default', value: 'national_id' },
];

export interface NominativeRequestPayloadDTO {
  country_code: string;
  document_type: NominativeRequestDocumentType;
  fiscal_regime_code: string | null;
  locality: string | null;
  mx_cfdi_use: string | null;
  name: string;
  order_country_code: string | null;
  region: string;
  sdi_codice_destinatario: string | null;
  street: string;
  tax_id: string;
  zip_code: string;
}

export interface NominativeRequestDTO {
  country_code: string;
  document_type: NominativeRequestDocumentType | null;
  fiscal_regime_code: string | null;
  full_invoice_id: string;
  legal_name: string;
  locality: string | null;
  mx_cfdi_use: string | null;
  order_id: number | null;
  region: string;
  sdi_codice_destinatario: string | null;
  status: NominativeRequestProcessingStatus;
  street: string;
  tax_id: string;
  zip_code: string;
}

export interface NominativeRequestApiResponse {
  data?: NominativeRequestDTO | null;
}

export interface NominativeRequest {
  countryCode: string;
  documentType: NominativeRequestDocumentType | null;
  fiscalRegimeCode: string | null;
  fullInvoiceId: string | null;
  legalName: string;
  locality: string | null;
  mxCfdiUse: string | null;
  orderId: number | null;
  region: string;
  sdiCodiceDestinatario: string | null;
  status: NominativeRequestProcessingStatus | null;
  street: string;
  taxId: string;
  zipCode: string;
}

export interface NominativeRequestFormValue {
  address: string;
  country: string;
  documentType: NominativeRequestDocumentType;
  fiscalRegimeCode: string;
  legalName: string;
  locality: string;
  mxCfdiUse: string;
  postalCode: string;
  region: string;
  sdiCodiceDestinatario: string;
  taxId: string;
}

export interface NominativeRequestCountryBlocks {
  addressOptional: boolean;
  showItalyFields: boolean;
  showMexicoFields: boolean;
  taxIdOptional: boolean;
}

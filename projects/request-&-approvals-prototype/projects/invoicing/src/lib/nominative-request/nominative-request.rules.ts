import {
  colombiaDocumentTypes,
  customerTypeDocumentTypes,
  nominativeCountriesNotRequiringATaxIdFromNationalIndividuals,
  nominativeCountryColombia,
  nominativeCountryFrance,
  nominativeCountryItaly,
  nominativeCountryMexico,
  type NominativeRequestCountryBlocks,
  type NominativeRequestDocumentType,
  type NominativeRequestDocumentTypeOption,
  type NominativeRequestFormValue,
  type NominativeRequestPayloadDTO,
} from './nominative-request.model';

export const nominativeServerFieldMap: Readonly<Record<string, keyof NominativeRequestFormValue>> = {
  country_code: 'country',
  document_type: 'documentType',
  fiscal_regime_code: 'fiscalRegimeCode',
  locality: 'locality',
  mx_cfdi_use: 'mxCfdiUse',
  name: 'legalName',
  region: 'region',
  sdi_codice_destinatario: 'sdiCodiceDestinatario',
  street: 'address',
  tax_id: 'taxId',
  zip_code: 'postalCode',
};

const reasonPrefix = /Reason:\s*(?<reason>.+)$/u;

const internalCountryCodeByIsoCode: Readonly<Record<string, string>> = { GB: 'UK' };

const isoCountryCodeByInternalCode: Readonly<Record<string, string>> = { UK: 'GB' };

export const nominativeFormFields: readonly (keyof NominativeRequestFormValue)[] = [
  'address',
  'country',
  'documentType',
  'fiscalRegimeCode',
  'legalName',
  'locality',
  'mxCfdiUse',
  'postalCode',
  'region',
  'sdiCodiceDestinatario',
  'taxId',
];

export function normalizeCountryCode(value: string | null | undefined): string {
  const countryCode = (value ?? '').trim().toUpperCase();
  return internalCountryCodeByIsoCode[countryCode] ?? countryCode;
}

export function toCountrySelectorValue(value: string | null | undefined): string {
  const countryCode = (value ?? '').trim().toUpperCase();
  return (isoCountryCodeByInternalCode[countryCode] ?? countryCode).toLowerCase();
}

export function stripReasonPrefix(message: string): string {
  return reasonPrefix.exec(message)?.groups?.reason.trim() ?? message;
}

export function getDocumentTypeOptions(
  selectedCountry: string,
  orderCountry: string | null | undefined,
): readonly NominativeRequestDocumentTypeOption[] {
  const selected = normalizeCountryCode(selectedCountry);
  const order = normalizeCountryCode(orderCountry) || selected;

  if (order === nominativeCountryColombia && selected === nominativeCountryColombia) {
    return colombiaDocumentTypes;
  }

  return customerTypeDocumentTypes;
}

export function getCountryBlocks(
  selectedCountry: string,
  orderCountry: string | null | undefined,
  documentType: NominativeRequestDocumentType | null | undefined,
): NominativeRequestCountryBlocks {
  const selected = normalizeCountryCode(selectedCountry);
  const knownOrder = normalizeCountryCode(orderCountry);
  const order = knownOrder || selected;

  return {
    addressOptional: isAddressOptional(selected, knownOrder, documentType),
    showItalyFields: selected === nominativeCountryItaly && order === nominativeCountryItaly,
    showMexicoFields: selected === nominativeCountryMexico && order === nominativeCountryMexico,
    taxIdOptional: isTaxIdOptional(selected, knownOrder, documentType),
  };
}

export function requiredNominativeRequestFields(blocks: NominativeRequestCountryBlocks): readonly (keyof NominativeRequestFormValue)[] {
  return [
    'country',
    'documentType',
    'legalName',
    ...(blocks.taxIdOptional ? [] : (['taxId'] as const)),
    ...(blocks.addressOptional ? [] : (['address', 'postalCode', 'region'] as const)),
    ...(blocks.showItalyFields ? (['locality'] as const) : []),
    ...(blocks.showMexicoFields ? (['fiscalRegimeCode', 'mxCfdiUse'] as const) : []),
  ];
}

export function buildNominativeRequestPayload(
  formValue: NominativeRequestFormValue,
  blocks: NominativeRequestCountryBlocks,
  orderCountryCode: string | null | undefined,
): NominativeRequestPayloadDTO {
  return {
    country_code: formValue.country,
    document_type: formValue.documentType,
    fiscal_regime_code: blocks.showMexicoFields ? formValue.fiscalRegimeCode : null,
    locality: trimmedOrNull(formValue.locality),
    mx_cfdi_use: blocks.showMexicoFields ? formValue.mxCfdiUse : null,
    name: formValue.legalName,
    order_country_code: normalizeCountryCode(orderCountryCode) || null,
    region: formValue.region,
    sdi_codice_destinatario: blocks.showItalyFields ? trimmedOrNull(formValue.sdiCodiceDestinatario) : null,
    street: formValue.address,
    tax_id: formValue.taxId,
    zip_code: formValue.postalCode,
  };
}

function isIndividualWithKnownOrderCountry(orderCountry: string, documentType: NominativeRequestDocumentType | null | undefined): boolean {
  return orderCountry.length > 0 && documentType === 'national_id';
}

function isTaxIdOptional(
  selectedCountry: string,
  orderCountry: string,
  documentType: NominativeRequestDocumentType | null | undefined,
): boolean {
  if (!isIndividualWithKnownOrderCountry(orderCountry, documentType)) {
    return false;
  }
  if (orderCountry === nominativeCountryFrance) {
    return true;
  }
  if (selectedCountry !== orderCountry) {
    return orderCountry !== nominativeCountryMexico;
  }
  return nominativeCountriesNotRequiringATaxIdFromNationalIndividuals.includes(orderCountry);
}

function isAddressOptional(
  selectedCountry: string,
  orderCountry: string,
  documentType: NominativeRequestDocumentType | null | undefined,
): boolean {
  if (!isIndividualWithKnownOrderCountry(orderCountry, documentType)) {
    return false;
  }
  if (orderCountry === nominativeCountryFrance) {
    return true;
  }
  return selectedCountry !== orderCountry && orderCountry !== nominativeCountryItaly;
}

function trimmedOrNull(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

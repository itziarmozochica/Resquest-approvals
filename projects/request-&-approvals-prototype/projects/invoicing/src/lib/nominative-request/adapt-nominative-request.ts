import type { NominativeRequest, NominativeRequestApiResponse } from './nominative-request.model';

export function adaptNominativeRequest(response: NominativeRequestApiResponse): NominativeRequest | null {
  const data = response.data;

  if (data === null || data === undefined || Object.keys(data).length === 0) {
    return null;
  }

  return {
    countryCode: data.country_code,
    documentType: data.document_type,
    fiscalRegimeCode: data.fiscal_regime_code,
    fullInvoiceId: data.full_invoice_id,
    legalName: data.legal_name,
    locality: data.locality,
    mxCfdiUse: data.mx_cfdi_use,
    orderId: data.order_id,
    region: data.region,
    sdiCodiceDestinatario: data.sdi_codice_destinatario,
    status: data.status,
    street: data.street,
    taxId: data.tax_id,
    zipCode: data.zip_code,
  };
}

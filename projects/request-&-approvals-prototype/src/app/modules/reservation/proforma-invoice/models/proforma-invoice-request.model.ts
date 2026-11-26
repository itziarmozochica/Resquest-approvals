export interface ProformaInvoiceRecipient {
  address: string | null;
  billingName: string | null;
  country: string | null;
  email: string | null;
  name: string;
  postalCode: string | null;
  region: string | null;
  taxId: string | null;
}

export interface ProformaInvoiceRequest {
  paymentNotes: string | null;
  recipient: ProformaInvoiceRecipient;
}

export interface ProformaInvoiceRecipientDTO {
  address: string | null;
  billing_name: string | null;
  country: string | null;
  email: string | null;
  name: string;
  postal_code: string | null;
  region: string | null;
  tax_id: string | null;
}

export interface ProformaInvoiceRequestDTO {
  payment_notes: string | null;
  recipient: ProformaInvoiceRecipientDTO;
}

export interface SignContextAgreementDto {
  individual_agreement_ids: string[];
  agreement_id: string;
  agreement_version_id: string;
  version: number;
  validity_days: number | null;
  title: string;
  legal_text: string;
  signer_role: string;
}

export interface AgreementSignContextDataDto {
  signer_fields: string[];
  agreements: SignContextAgreementDto[];
}

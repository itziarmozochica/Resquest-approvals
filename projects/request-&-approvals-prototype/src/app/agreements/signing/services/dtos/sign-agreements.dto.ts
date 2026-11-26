export interface IndividualAgreementToSignDto {
  id: string;
  first_name?: string;
  last_name?: string;
}

export interface SignAgreementsRequestDto {
  individual_agreements: IndividualAgreementToSignDto[];
  agreement_version_id: string;
  signer: { email: string; first_name: string; last_name: string; phone_number: string | null };
  guardian_declaration_accepted: boolean;
}

export interface SignedIndividualAgreementDto {
  id: string;
  status: string;
}

export interface SignAgreementsDataDto {
  acceptance_recorded: boolean;
  acceptance_id: string;
  accepted_at: string;
  individual_agreements: SignedIndividualAgreementDto[];
}

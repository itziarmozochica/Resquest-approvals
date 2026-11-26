export interface OrderAgreementSignerNameDto {
  first_name: string;
  last_name: string;
}

export interface OrderAgreementSignerDto {
  accepted_at: string;
  individual_agreement_id: string;
  minor: OrderAgreementSignerNameDto | null;
  signer: OrderAgreementSignerNameDto;
}

export interface OrderAgreementSignersDataDto {
  signers: OrderAgreementSignerDto[];
}

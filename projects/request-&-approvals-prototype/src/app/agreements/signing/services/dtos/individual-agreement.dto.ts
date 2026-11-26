export interface IndividualAgreementAgreementDto {
  id: string;
  title: string;
}

export interface IndividualAgreementParticipantDto {
  label: string;
}

/** Mirrors fever2's `PartnerIndividualAgreementSchema`; every field is required there except `claimed` (see its @todo). */
export interface IndividualAgreementDto {
  agreement: IndividualAgreementAgreementDto;
  coverage_rule: string;
  expires_at: string | null;
  id: string;
  identified: boolean;
  order_item_id: number | null;
  participant: IndividualAgreementParticipantDto | null;
  sign_url: string;
  signer_role: string;
  status: string;
  ticket_id: number | null;
  /** @todo Make required once fever2 always sends it (fever2#55308). */
  claimed?: boolean;
}

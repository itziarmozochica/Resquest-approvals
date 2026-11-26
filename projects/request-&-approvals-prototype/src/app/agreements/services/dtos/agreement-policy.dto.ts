export interface AgreementPolicyDto {
  agreement_id: string;
  created_at: string;
  cross_partner_reuse_allowed: boolean;
  effective_from: string;
  effective_until: string | null;
  expires_after_days: number | null;
  group_acceptance_allowed: boolean;
  guardian_acceptance_allowed: boolean;
  id: string;
  status: string;
  updated_at: string;
}

export interface AgreementPolicyInputDto {
  cross_partner_reuse_allowed: boolean;
  effective_from: string | null;
  effective_until: string | null;
  expires_after_days: number | null;
  group_acceptance_allowed: boolean;
  guardian_acceptance_allowed: boolean;
  status: string;
}

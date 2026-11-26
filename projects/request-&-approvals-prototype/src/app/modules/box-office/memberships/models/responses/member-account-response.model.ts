export interface MemberAccountMembershipResponse {
  holder_name?: string | null;
  loyalty_provider: string;
  membership_id: string;
  membership_name: string;
  provider_account_id: string;
  tier_id: string;
  tier_name: string;
  valid_until: string | null;
}

export interface MemberAccountIdentifyResponse {
  memberships: Array<MemberAccountMembershipResponse>;
}

export interface MemberAccountAutoApplyResponse {
  message: string;
}

export interface MemberAccountBenefitResponse {
  discount_value: string | null;
  membership_id: string | null;
  state: string;
  tier_ids: Array<string>;
}

export interface MemberAccountBenefitsSearchResponse {
  benefits_by_session_type_id: Record<string, MemberAccountBenefitResponse>;
}

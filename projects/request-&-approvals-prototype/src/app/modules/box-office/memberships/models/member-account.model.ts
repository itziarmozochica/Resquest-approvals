export interface MemberAccountMembership {
  holderName: string | null;
  loyaltyProvider: string;
  membershipId: string;
  membershipName: string;
  providerAccountId: string;
  tierId: string;
  tierName: string;
  validUntil: string | null;
}

export interface MemberAccountIdentification {
  memberships: Array<MemberAccountMembership>;
  value: string;
}

export type MemberAccountBenefitState = 'eligible' | 'locked' | 'upsell';

export interface MemberAccountBenefit {
  discountValue: string | null;
  membershipId: string | null;
  sessionTypeId: number;
  state: MemberAccountBenefitState;
  tierIds: Array<string>;
}

export interface MemberAccountRef {
  loyaltyProvider: string;
  providerAccountId: string;
}

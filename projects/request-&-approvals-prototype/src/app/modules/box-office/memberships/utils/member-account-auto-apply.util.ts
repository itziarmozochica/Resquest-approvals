import { MemberAccountMembership } from '../models/member-account.model';

export const MAXIMUM_MEMBER_ACCOUNTS = 20;

export interface MemberAccountAutoApplyTarget {
  loyaltyProvider: string;
  providerAccountIds: Array<string>;
}

export function buildMemberAccountAutoApplyTarget(
  memberships: ReadonlyArray<MemberAccountMembership>,
): MemberAccountAutoApplyTarget | null {
  const loyaltyProvider = memberships.find((membership: MemberAccountMembership) => isAddressable(membership))?.loyaltyProvider;

  if (loyaltyProvider === undefined) {
    return null;
  }

  const providerAccountIds = [
    ...new Set(
      memberships
        .filter((membership: MemberAccountMembership) => isAddressable(membership) && membership.loyaltyProvider === loyaltyProvider)
        .map((membership: MemberAccountMembership) => membership.providerAccountId),
    ),
  ].slice(0, MAXIMUM_MEMBER_ACCOUNTS);

  return { loyaltyProvider, providerAccountIds };
}

function isAddressable(membership: MemberAccountMembership): boolean {
  return (
    membership.loyaltyProvider != null &&
    membership.loyaltyProvider !== '' &&
    membership.providerAccountId != null &&
    membership.providerAccountId !== ''
  );
}

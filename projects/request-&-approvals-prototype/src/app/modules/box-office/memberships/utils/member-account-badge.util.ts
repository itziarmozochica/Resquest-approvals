import { MemberAccountMembership } from '../models/member-account.model';

export interface MemberAccountBadge {
  key: string;
  params: Record<string, string | number>;
}

export function memberAccountBadge(memberships: Array<MemberAccountMembership>): MemberAccountBadge | null {
  if (memberships.length === 0) {
    return null;
  }
  if (memberships.length === 1) {
    return singleMembershipBadge(memberships[0]);
  }

  return { key: 'boxOffice.memberAccount.badge.several', params: { count: memberships.length } };
}

function singleMembershipBadge(membership: MemberAccountMembership): MemberAccountBadge {
  if (membership.holderName === null) {
    return { key: 'boxOffice.memberAccount.badge.single', params: { tier: membership.tierName } };
  }

  return { key: 'boxOffice.memberAccount.badge.singleWithHolder', params: { holder: membership.holderName, tier: membership.tierName } };
}

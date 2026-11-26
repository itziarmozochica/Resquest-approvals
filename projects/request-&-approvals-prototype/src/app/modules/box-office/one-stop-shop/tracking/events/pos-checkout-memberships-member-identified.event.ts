import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutMembershipsMemberIdentifiedData {
  discountsCount: number;
  hasPerks: boolean;
}

export const posCheckoutMembershipsMemberIdentified = defineEvent<PosCheckoutMembershipsMemberIdentifiedData>(
  'pos.checkout.memberships.member.identified',
);

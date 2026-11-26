import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutMembershipsMemberRemovedData {
  hadPerks: boolean;
}

export const posCheckoutMembershipsMemberRemoved = defineEvent<PosCheckoutMembershipsMemberRemovedData>(
  'pos.checkout.memberships.member.removed',
);

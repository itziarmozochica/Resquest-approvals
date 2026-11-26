import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutMembershipsApplyBenefitsErrorData {
  failureReason: string;
  planIds: number[];
}

export const posCheckoutMembershipsApplyBenefitsError = defineEvent<PosCheckoutMembershipsApplyBenefitsErrorData>(
  'pos.checkout.memberships.apply_benefits.error',
);

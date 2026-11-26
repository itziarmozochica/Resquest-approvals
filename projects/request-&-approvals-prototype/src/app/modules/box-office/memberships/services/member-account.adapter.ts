import { Injectable } from '@angular/core';

import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';

import { MemberAccountBenefit, MemberAccountBenefitState, MemberAccountMembership } from '../models/member-account.model';
import {
  MemberAccountBenefitResponse,
  MemberAccountBenefitsSearchResponse,
  MemberAccountIdentifyResponse,
  MemberAccountMembershipResponse,
} from '../models/responses/member-account-response.model';

const BENEFIT_STATES: ReadonlyArray<MemberAccountBenefitState> = ['eligible', 'locked', 'upsell'];
const SESSION_TYPE_ID_PATTERN = /^[1-9][0-9]*$/;

@Injectable({
  providedIn: 'root',
})
export class MemberAccountAdapter {
  adaptMemberAccountBenefits(
    response: BaseResponse<MemberAccountBenefitsSearchResponse>,
  ): BaseResponse<ReadonlyMap<number, MemberAccountBenefit>> {
    return new BaseResponse<ReadonlyMap<number, MemberAccountBenefit>>(this.#getBenefits(response?.data), this.#getError(response?.error));
  }

  adaptMemberAccountMemberships(response: BaseResponse<MemberAccountIdentifyResponse>): BaseResponse<Array<MemberAccountMembership>> {
    return new BaseResponse<Array<MemberAccountMembership>>(this.#getMemberships(response?.data), this.#getError(response?.error));
  }

  #getBenefits(data: MemberAccountBenefitsSearchResponse | null | undefined): ReadonlyMap<number, MemberAccountBenefit> {
    const benefits = new Map<number, MemberAccountBenefit>();

    for (const [sessionTypeId, benefit] of Object.entries(data?.benefits_by_session_type_id ?? {})) {
      const adapted = this.#toBenefit(sessionTypeId, benefit);

      if (adapted !== null) {
        benefits.set(adapted.sessionTypeId, adapted);
      }
    }

    return benefits;
  }

  #getError(data: BaseErrorResponse | null | undefined): BaseErrorResponse | null {
    if (!data) {
      return null;
    }
    return { code: data.code, message: `errors.${data.code}` };
  }

  #getMemberships(data: MemberAccountIdentifyResponse | null | undefined): Array<MemberAccountMembership> {
    if (!data?.memberships?.length) {
      return [];
    }

    return data.memberships.map((membership: MemberAccountMembershipResponse) => ({
      holderName: this.#toHolderName(membership.holder_name),
      loyaltyProvider: membership.loyalty_provider,
      membershipId: membership.membership_id,
      membershipName: membership.membership_name,
      providerAccountId: membership.provider_account_id,
      tierId: membership.tier_id,
      tierName: membership.tier_name,
      validUntil: membership.valid_until ?? null,
    }));
  }

  #toHolderName(holderName: string | null | undefined): string | null {
    const trimmedHolderName = holderName?.trim() ?? '';

    return trimmedHolderName.length === 0 ? null : trimmedHolderName;
  }

  #toBenefit(sessionTypeId: string, benefit: MemberAccountBenefitResponse | null | undefined): MemberAccountBenefit | null {
    const id = Number(sessionTypeId);
    const state = BENEFIT_STATES.find((candidate: MemberAccountBenefitState) => candidate === benefit?.state);

    if (!SESSION_TYPE_ID_PATTERN.test(sessionTypeId) || !Number.isSafeInteger(id) || state === undefined) {
      return null;
    }

    return {
      discountValue: benefit?.discount_value ?? null,
      membershipId: benefit?.membership_id ?? null,
      sessionTypeId: id,
      state,
      tierIds: benefit?.tier_ids ?? [],
    };
  }
}

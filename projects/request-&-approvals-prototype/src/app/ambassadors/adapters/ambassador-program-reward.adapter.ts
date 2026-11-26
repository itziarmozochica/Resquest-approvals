import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { AmbassadorProgramRewardTypeEnum } from '@fz-original/app/ambassadors/models/ambassador-program-reward-type';
import {
  AmbassadorProgramRedeemedRewardResponse,
  AmbassadorProgramReward,
  AmbassadorProgramRewardData,
  AmbassadorProgramRewardResponse,
} from '@fz-original/app/ambassadors/models/ambassador-program-reward.model';
import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';
import { LinkPaginationResponse } from '@fz-original/app/shared/models/link-pagination-response';

@Injectable({
  providedIn: 'root',
})
export class AmbassadorProgramRewardAdapter implements AdapterInterface<LinkPaginationResponse<AmbassadorProgramReward[]> | null> {
  fromApi(response: HttpResponse<BaseResponse<AmbassadorProgramRewardResponse>>): LinkPaginationResponse<AmbassadorProgramReward[]> | null {
    const body = response.body;
    return new LinkPaginationResponse<AmbassadorProgramReward[]>(
      response.headers.get('Link'),
      this.getData(body?.data?.ambassador_program_rewards),
      this.getError(body?.error),
    );
  }

  fromApiRedeemed(
    response: HttpResponse<BaseResponse<AmbassadorProgramRedeemedRewardResponse>>,
  ): LinkPaginationResponse<AmbassadorProgramReward[]> | null {
    const body = response.body;
    return new LinkPaginationResponse<AmbassadorProgramReward[]>(
      response.headers.get('Link'),
      this.getData(body?.data?.ambassador_program_redeemed_rewards),
      this.getError(body?.error),
    );
  }

  fromApiSingle(response: HttpResponse<BaseResponse<AmbassadorProgramRewardData | null>>): BaseResponse<AmbassadorProgramReward | null> {
    const body = response.body;
    if (!body?.data) {
      return new BaseResponse<AmbassadorProgramReward>(null, this.getError(body?.error));
    }
    return new BaseResponse<AmbassadorProgramReward>(this.transformSingleData(body.data), this.getError(body.error));
  }

  private getData(ambassadorProgramRewardsData?: Array<AmbassadorProgramRewardData> | null): AmbassadorProgramReward[] | null {
    if (ambassadorProgramRewardsData == null) {
      return null;
    }
    return ambassadorProgramRewardsData.map(ambassadorProgramReward => this.transformSingleData(ambassadorProgramReward));
  }

  private transformSingleData(ambassadorProgramReward: AmbassadorProgramRewardData): AmbassadorProgramReward {
    return {
      id: ambassadorProgramReward.id,
      ambassadorProgramId: ambassadorProgramReward.ambassador_program_id,
      title: ambassadorProgramReward.title,
      description: ambassadorProgramReward.description,
      imageUrl: ambassadorProgramReward.image,
      points: ambassadorProgramReward.points,
      type: (ambassadorProgramReward.type as AmbassadorProgramRewardTypeEnum) ?? null,
      initialStock: ambassadorProgramReward.initial_stock,
      redeemedCount: ambassadorProgramReward.redeemed_count,
      displayRealAvailability: ambassadorProgramReward.display_real_availability,
      maxUsesPerUser: ambassadorProgramReward.max_uses_per_user,
      rewardId: ambassadorProgramReward.reward_id,
      rewardTitle: ambassadorProgramReward.reward_title,
      redeemedAt: ambassadorProgramReward.redeemed_at,
      affiliateCode: ambassadorProgramReward.affiliate_code,
      affiliateName: ambassadorProgramReward.affiliate_name,
      affiliateEmail: ambassadorProgramReward.affiliate_email,
      redeemedOnPartnerSideAt: ambassadorProgramReward.redeemed_on_partner_side_at,
      code: ambassadorProgramReward.code,
      soldOut:
        ambassadorProgramReward.initial_stock !== undefined && ambassadorProgramReward.redeemed_count !== undefined
          ? ambassadorProgramReward.initial_stock === 0 || ambassadorProgramReward.redeemed_count >= ambassadorProgramReward.initial_stock
          : undefined,
      redeemInstructionsLink: ambassadorProgramReward.redeem_instructions_link,
      redemptionId: ambassadorProgramReward.redemption_id,
    };
  }

  private getError(data: BaseErrorResponse | null | undefined) {
    if (data == null) {
      return null;
    }
    return { code: data.code, message: data.message };
  }
}

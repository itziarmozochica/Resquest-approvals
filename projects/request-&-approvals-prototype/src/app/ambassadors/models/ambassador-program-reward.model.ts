import { AmbassadorProgramRewardTypeEnum } from '@fz-original/app/ambassadors/models/ambassador-program-reward-type';

export interface AmbassadorProgramReward {
  // Common fields for both regular and redeemed rewards
  id: string;
  ambassadorProgramId: string;
  title: string;
  description: string;
  imageUrl: string;
  points: number;
  type: AmbassadorProgramRewardTypeEnum;

  // Fields for regular rewards (optional for redeemed rewards)
  initialStock?: number;
  redeemedCount?: number;
  displayRealAvailability?: boolean;
  maxUsesPerUser?: number;
  soldOut?: boolean;

  // Fields for redeemed rewards (optional for regular rewards)
  redemptionId?: string;
  rewardId?: string;
  rewardTitle?: string;
  redeemedAt?: string;
  affiliateCode?: string;
  code?: string;
  affiliateName?: string;
  affiliateEmail?: string;
  redeemedOnPartnerSideAt?: string;
  redeemInstructionsLink?: string;
}

export interface AmbassadorProgramRewardData {
  // Common fields for both regular and redeemed rewards
  id: string;
  ambassador_program_id: string;
  title: string;
  description: string;
  image: string;
  points: number;
  type: string;

  // Fields for regular rewards (optional for redeemed rewards)
  initial_stock?: number;
  redeemed_count?: number;
  display_real_availability?: boolean;
  max_uses_per_user?: number;

  // Fields for redeemed rewards (optional for regular rewards)
  redemption_id?: string;
  reward_id?: string;
  reward_title?: string;
  redeemed_at?: string;
  affiliate_code?: string;
  code?: string;
  affiliate_name?: string;
  affiliate_email?: string;
  redeemed_on_partner_side_at?: string;
  redeem_instructions_link?: string;
}

export interface AmbassadorProgramRewardResponse {
  ambassador_program_rewards: Array<AmbassadorProgramRewardData>;
}

export interface AmbassadorProgramRedeemedRewardResponse {
  ambassador_program_redeemed_rewards: Array<AmbassadorProgramRewardData>;
}

import { Place } from '../../shared/models/plan/place.model';
import { PlanStatus } from '../../shared/models/plan/plan-status.enum';

export interface AmbassadorProgramSummaryPlan {
  address: string;
  city_currency: string;
  city_id: number;
  city_name: string;
  city_timezone: string;
  id: number;
  name: string;
  status: PlanStatus;
  tracking_link: string;
}

export interface AmbassadorProgramSummary {
  affiliateCode: string;
  channelId: string;
  contactSupportEmail: string;
  description: string;
  endsAt: string;
  id: string;
  image: string;
  partnerId: number;
  places: Place[];
  plans: Array<AmbassadorProgramSummaryPlan>;
  points: number;
  privacyPoliciesLink: string;
  redeemExpirationAt: string;
  redeemInstructionsLink: string;
  startsAt: string;
  status: PlanStatus;
  termsAndConditionsLink: string;
  title: string;
}

export interface AmbassadorProgramSummaryData {
  affiliate_code: string;
  ambassador_program_points: number;
  channel_id: string;
  contact_support_email: string;
  description: string;
  ends_at: string;
  id: string;
  image: string;
  partner_id: number;
  plans: Array<AmbassadorProgramSummaryPlan>;
  privacy_policies_link: string;
  redeem_expiration_at: string;
  redeem_instructions_link: string;
  starts_at: string;
  terms_and_conditions_link: string;
  title: string;
}

export interface AmbassadorProgramsSummaryData {
  ambassador_programs: Array<AmbassadorProgramSummaryData>;
}

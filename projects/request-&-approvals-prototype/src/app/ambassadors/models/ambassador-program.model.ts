import { Place } from '@fz-original/app/shared/models/plan/place.model';
import { PlanStatus } from '@fz-original/app/shared/models/plan/plan-status.enum';

export interface AmbassadorProgram {
  contactSupportEmail: string;
  description: string;
  endsAt: string;
  gdprText: string;
  id: string;
  image: string;
  partnerId: number;
  places: Place[];
  plans: Array<number>;
  points: number;
  privacyPoliciesLink: string;
  redeemExpirationAt: string;
  redeemInstructionsLink: string;
  startsAt: string;
  status?: PlanStatus;
  termsAndConditionsLink: string;
  title: string;
}

export interface AmbassadorProgramData {
  contact_support_email: string;
  description: string;
  ends_at: string;
  gdpr_text: string;
  id: string;
  image: string;
  partner_id: number;
  plans: Array<number>;
  privacy_policies_link: string;
  redeem_expiration_at: string;
  redeem_instructions_link: string;
  starts_at: string;
  terms_and_conditions_link: string;
  title: string;
}

export interface AmbassadorProgramsData {
  ambassador_programs: Array<AmbassadorProgramData>;
}

import { Injectable } from '@angular/core';

import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import { City } from '@fz-original/app/shared/models/plan/city.model';
import { Place, PlaceData } from '@fz-original/app/shared/models/plan/place.model';
import { PlanData } from '@fz-original/app/shared/models/plan/plan.model';

import { AmbassadorProgram, AmbassadorProgramData } from '../models/ambassador-program.model';
import { AmbassadorRedeemedPointsData } from '../models/ambassador-redeemed-points.model';

@Injectable({
  providedIn: 'root',
})
export class AmbassadorProgramAdapter implements AdapterInterface<AmbassadorProgram | null> {
  fromApi(data: {
    ambassadorProgram?: AmbassadorProgramData | null;
    plan?: PlanData | null;
    redeemedPoints?: AmbassadorRedeemedPointsData | null;
  }): AmbassadorProgram | null {
    const { plan, ambassadorProgram, redeemedPoints } = data;

    return this.getData(plan, ambassadorProgram, redeemedPoints);
  }
  private getData(
    planData: PlanData | null | undefined,
    ambassadorProgramData: AmbassadorProgramData | null | undefined,
    redeemedPointsData: AmbassadorRedeemedPointsData | null | undefined,
  ): AmbassadorProgram | null {
    if (ambassadorProgramData == null) {
      return null;
    }

    return {
      id: ambassadorProgramData.id,
      partnerId: ambassadorProgramData.partner_id,
      title: ambassadorProgramData.title,
      description: ambassadorProgramData.description,
      image: ambassadorProgramData.image || planData?.image_url || '',
      termsAndConditionsLink: ambassadorProgramData.terms_and_conditions_link,
      privacyPoliciesLink: ambassadorProgramData.privacy_policies_link,
      contactSupportEmail: ambassadorProgramData.contact_support_email,
      redeemInstructionsLink: ambassadorProgramData.redeem_instructions_link,
      redeemExpirationAt: ambassadorProgramData.redeem_expiration_at,
      startsAt: ambassadorProgramData.starts_at || '',
      endsAt: ambassadorProgramData.ends_at || '',
      plans: ambassadorProgramData.plans,
      points: redeemedPointsData?.ambassador_program_points || 0,
      places:
        planData?.places?.map((place: PlaceData) => {
          return new Place(
            place.id,
            place.name,
            place.address,
            new City(place.city.id, place.city.name, place.city.timezone),
            place.zip_code,
          );
        }) || [],
      status: planData?.status,
      gdprText: ambassadorProgramData.gdpr_text,
    };
  }
}

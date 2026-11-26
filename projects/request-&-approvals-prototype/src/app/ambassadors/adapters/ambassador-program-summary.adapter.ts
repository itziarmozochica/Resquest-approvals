import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { LinkPaginationResponse } from '@fz-original/app/shared/models/link-pagination-response';
import { PlanStatus } from '@fz-original/app/shared/models/plan/plan-status.enum';

import { City } from '../../shared/models/plan/city.model';
import { Place } from '../../shared/models/plan/place.model';
import {
  AmbassadorProgramsSummaryData,
  AmbassadorProgramSummary,
  AmbassadorProgramSummaryData,
} from '../models/ambassador-program-summary.model';

@Injectable({
  providedIn: 'root',
})
export class AmbassadorProgramSummaryAdapter implements AdapterInterface<AmbassadorProgramSummary | null> {
  fromApi(data: AmbassadorProgramSummaryData): AmbassadorProgramSummary | null {
    if (!data) {
      return null;
    }

    return {
      id: data.id,
      partnerId: data.partner_id,
      channelId: data.channel_id,
      affiliateCode: data.affiliate_code,
      title: data.title,
      description: data.description,
      image: data.image,
      termsAndConditionsLink: data.terms_and_conditions_link,
      privacyPoliciesLink: data.privacy_policies_link,
      contactSupportEmail: data.contact_support_email,
      redeemInstructionsLink: data.redeem_instructions_link,
      redeemExpirationAt: data.redeem_expiration_at,
      startsAt: data.starts_at || '',
      endsAt: data.ends_at || '',
      plans: data.plans,
      points: data.ambassador_program_points,
      places: data.plans.map(
        plan =>
          new Place(
            plan.id,
            plan.name,
            plan.address,
            new City(plan.city_id, plan.city_name, plan.city_timezone, undefined, plan.city_currency),
          ),
      ),
      status: data.plans[0]?.status || PlanStatus.ON_SALE,
    };
  }

  fromApiPaginated(
    result: HttpResponse<BaseResponse<AmbassadorProgramsSummaryData>>,
  ): LinkPaginationResponse<(AmbassadorProgramSummary | null)[] | null> {
    if (!result.body?.data?.ambassador_programs) {
      return new LinkPaginationResponse<(AmbassadorProgramSummary | null)[]>(result.headers.get('Link'), [], result.body?.error);
    }

    const ambassadorPrograms = result.body.data.ambassador_programs.map((program: AmbassadorProgramSummaryData) => this.fromApi(program));

    return new LinkPaginationResponse<(AmbassadorProgramSummary | null)[]>(
      result.headers.get('Link'),
      ambassadorPrograms,
      result.body?.error,
    );
  }
}

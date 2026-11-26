import { inject, Injectable } from '@angular/core';

import { ReservationBusinessChooseStateService } from '@fz-original/app/modules/reservation/services/reservation-state.service';
import { Observable } from 'rxjs';

import { BaseResponse } from '../../models/base-response';
import { OrganizationTypeEnum } from '../../models/partner/organization-type.enum';
import { Plan } from '../../models/plan/plan.model';
import { PlanService } from '../../services/plan/plan.service';
import { UserService } from '../../services/user/user.service';

@Injectable({
  providedIn: 'root',
})
export class SearchBarOptionsService {
  #planService: PlanService = inject(PlanService);
  #reservationBusinessChooseService = inject(ReservationBusinessChooseStateService);
  #userService: UserService = inject(UserService);

  getOptions(partnerId: number, channelId?: string, partnerType?: string): Observable<BaseResponse<Plan[] | null>> {
    const isBusiness = this.#userService.isBusiness();
    let businessId = undefined;
    if (isBusiness) {
      const getBusinessUser = this.#reservationBusinessChooseService.getBusinessUser();
      businessId = getBusinessUser()?.business?.id ?? this.#userService.getUser()?.business?.id;
    }
    if (businessId !== undefined) {
      return this.#planService.getBookingAgentPlans(partnerId, businessId);
    }
    if (partnerType === OrganizationTypeEnum.RESELLER) {
      return this.#planService.getResellerPlans(partnerId, {
        channelId,
      });
    }
    return this.#planService.getPlans(partnerId, undefined, {
      channelId,
    });
  }
}

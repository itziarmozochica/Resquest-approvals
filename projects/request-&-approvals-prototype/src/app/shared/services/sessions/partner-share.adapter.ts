import { inject, Injectable } from '@angular/core';

import { UserService } from '@fz-original/app/shared/services/user/user.service';

@Injectable({
  providedIn: 'root',
})
export class PartnerShareAdapter {
  readonly #userService = inject(UserService);

  toApi(partnerSharePercentage: number | null | undefined): number | null {
    if (this.#userService.getUser()?.isStaff() !== true || partnerSharePercentage === null || partnerSharePercentage === undefined) {
      return null;
    }
    return Number((partnerSharePercentage / 100).toFixed(4));
  }

  fromApi(partnerShare: number | null | undefined): number | null {
    if (partnerShare === null || partnerShare === undefined) {
      return null;
    }
    return Number((partnerShare * 100).toFixed(2));
  }
}

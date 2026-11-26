import { inject, Injectable } from '@angular/core';

import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { AddOnPartnerVisibility, SessionTypeCategory } from '@fz-original/app/shared/services/sessions/session-type.model';
import { UserService } from '@fz-original/app/shared/services/user/user.service';

@Injectable({
  providedIn: 'root',
})
export class PartnerVisibilityAdapter {
  readonly #userService = inject(UserService);

  toApi(categoryId: SessionTypeCategory, partnerVisibility: SelectOption | null | undefined): AddOnPartnerVisibility | null {
    if (!this.#userService.getUser()?.isStaff()) {
      return null;
    }
    if (categoryId === SessionTypeCategory.cancellationInsurance) {
      return AddOnPartnerVisibility.feverAndPartners;
    }
    if (categoryId !== SessionTypeCategory.premiumRefundPolicy) {
      return null;
    }
    return Object.values(AddOnPartnerVisibility).find(visibility => visibility === partnerVisibility?.id) ?? null;
  }
}

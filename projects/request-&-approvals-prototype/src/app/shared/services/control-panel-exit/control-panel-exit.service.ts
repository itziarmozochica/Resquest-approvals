import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { PlanStateService } from '@fz-original/app/modules/reservation/services/plan-state.service';
import { ReservationBusinessChooseStateService } from '@fz-original/app/modules/reservation/services/reservation-state.service';
import { WhitelabelAccessService } from '@fz-original/app/modules/whitelabel-management/services/whitelabel-access.service';
import { SearchBarService } from '@fz-original/app/shared/search-bar/service/search-bar.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';

export const CONTROL_PANEL_EXIT_TO_ORGANIZATION_SELECTOR_STATE = 'controlPanelExitToOrganizationSelector';

@Injectable({
  providedIn: 'root',
})
export class ControlPanelExitService {
  readonly #partnerService = inject(PartnerService);
  readonly #planStateService = inject(PlanStateService);
  readonly #reservationBusinessChooseService = inject(ReservationBusinessChooseStateService);
  readonly #router = inject(Router);
  readonly #searchBarService = inject(SearchBarService);
  readonly #userService = inject(UserService);
  readonly #whitelabelAccessService = inject(WhitelabelAccessService);

  clearOrganizationContext(): void {
    this.#partnerService.clearPartner();
    this.#userService.clearPermissions();
    this.#whitelabelAccessService.clear();
    this.#userService.setSelectedOrganizationRole(null);
    this.#searchBarService.clearPlanList();
    this.#planStateService.reset();
    // Derived from the organization context being cleared, like the plan state above (GAME-1340).
    this.#reservationBusinessChooseService.reset();
  }

  exitToOrganizationSelector(): void {
    this.clearOrganizationContext();
    void this.#router.navigateByUrl('/login', {
      replaceUrl: true,
      state: { [CONTROL_PANEL_EXIT_TO_ORGANIZATION_SELECTOR_STATE]: true },
    });
  }
}

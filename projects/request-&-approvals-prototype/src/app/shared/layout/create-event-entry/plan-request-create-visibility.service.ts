import { inject, Injectable } from '@angular/core';

import { FeatureFlags } from '../../optimizely/feature-flags';
import { OptimizelyService } from '../../optimizely/optimizely.service';
import { Permissions } from '../../services/user/permissions';
import { UserService } from '../../services/user/user.service';

@Injectable({ providedIn: 'root' })
export class PlanRequestCreateVisibilityService {
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #userService = inject(UserService);

  canShowCreateRequestDropdown(): boolean {
    if (this.#userService.hasPermission(Permissions.CAN_VIEW_CREATE_EVENT)) {
      return true;
    }
    return (
      this.#userService.hasPermission(Permissions.CAN_DUPLICATE_EVENT) &&
      this.#optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.DUPLICATE_EVENT_MODAL,
        team: 'b2b-platform',
      }) === true
    );
  }
}

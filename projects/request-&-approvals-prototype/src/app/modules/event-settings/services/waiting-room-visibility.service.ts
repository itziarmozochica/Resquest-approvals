import { inject, Injectable } from '@angular/core';

import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';

@Injectable({
  providedIn: 'root',
})
export class WaitingRoomVisibilityService {
  #optimizelyService = inject(OptimizelyService);
  #userService = inject(UserService);

  canViewWaitingRoomConfig(): boolean {
    const isSuperuser = this.#userService.getUser()?.isStaff();
    const isFlagEnabled = this.#optimizelyService.isFeatureEnabled({
      optimizelyFeatureKey: FeatureFlags.SHOW_WAITING_ROOM_CONFIG,
      team: 'b2b-platform',
    });
    return Boolean(isSuperuser) && Boolean(isFlagEnabled);
  }

  canViewOutflowConfig(): boolean {
    const isSuperuser = this.#userService.getUser()?.isStaff();
    const isFlagEnabled = this.#optimizelyService.isFeatureEnabled({
      optimizelyFeatureKey: FeatureFlags.SHOW_WAITING_ROOM_OUTFLOW_CONFIG,
      team: 'b2b-platform',
    });
    return Boolean(isSuperuser) && Boolean(isFlagEnabled);
  }
}

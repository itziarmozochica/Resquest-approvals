import { inject, Injectable } from '@angular/core';

import { AuthenticationService } from '@fz-original/app/core/authentication/authentication.service';
import { User } from '@fz-original/app/shared/models/user/user.model';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';

@Injectable({
  providedIn: 'root',
})
export class ControlPanelAccessContextService {
  readonly #authenticationService = inject(AuthenticationService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #userService = inject(UserService);

  applyAccessContext(user: User | null): void {
    const userId = user?.id ?? this.#authenticationService.getUserId();
    if (userId) {
      this.#optimizelyService.setUserId(String(userId));
      this.#userService.setUserId(userId);
    }
    if (user) {
      this.#optimizelyService.setIsSuperuser(user.isStaff());
    }
  }
}

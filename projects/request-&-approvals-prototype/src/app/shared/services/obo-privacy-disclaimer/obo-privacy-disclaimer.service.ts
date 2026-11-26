import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { FeatureFlags } from '../../optimizely/feature-flags';
import { OptimizelyService } from '../../optimizely/optimizely.service';
import { UserService } from '../user/user.service';

@Injectable({ providedIn: 'root' })
export class OboPrivacyDisclaimerService {
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #router = inject(Router);
  readonly #userService = inject(UserService);

  shouldShowPrivacyDisclaimer(): boolean {
    return this.#isKiosk() || !this.#isBoxOffice() || !this.#isHideOboPrivacyDisclaimerEnabled();
  }

  #isBoxOffice(): boolean {
    return this.#router.url.includes('/box-office');
  }

  #isHideOboPrivacyDisclaimerEnabled(): boolean {
    return (
      this.#optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.B2B_ONSITE_HIDE_OBO_PRIVACY_DISCLAIMER,
        team: 'b2b-onsite',
      }) ?? false
    );
  }

  #isKiosk(): boolean {
    return this.#userService.isKioskUser() || this.#router.url.includes('/kiosk/');
  }
}

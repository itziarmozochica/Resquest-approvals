import { HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { quickSetupPlanWriteOriginContext } from '@fz-original/app/shared/interceptors/plan-write-origin';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';

@Injectable({
  providedIn: 'root',
})
export class QuickSetupWriteOriginService {
  readonly #optimizely = inject(OptimizelyService);

  #marked = false;

  beginRun(): void {
    this.#marked = this.#optimizely.isFeatureEnabled(FeatureFlags.PROJECT_MANAGEMENT_QUICK_SETUP_FROM_IR) === true;
  }

  context(): HttpContext {
    return this.#marked ? quickSetupPlanWriteOriginContext() : new HttpContext();
  }
}

import { inject, Injectable, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { merge } from 'rxjs';
import { scan } from 'rxjs/operators';

import { OtherSettingsState } from '../models/settings-configs.model';

@Injectable({
  providedIn: 'root',
})
export class CancellationSettingsVisibilityService {
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #optimizelyDataRevision: Signal<number> = toSignal(
    merge(this.#optimizelyService.observeUserData(), this.#optimizelyService.observePlanData()).pipe(
      scan((revision: number): number => revision + 1, 0),
    ),
    { initialValue: 0 },
  );

  canView(state: OtherSettingsState): boolean {
    return this.#isFeatureEnabled() && state.hasFields.cancellationSettings;
  }

  #isFeatureEnabled(): boolean {
    this.#optimizelyDataRevision();

    return (
      this.#optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.LOYALTY_PLAN_CANCELLATION_SETTINGS,
        team: 'loyalty-marketplaces',
      }) === true
    );
  }
}

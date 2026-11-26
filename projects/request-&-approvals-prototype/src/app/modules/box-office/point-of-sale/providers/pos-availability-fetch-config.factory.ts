import { inject } from '@angular/core';

import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { type AvailabilityFetchConfig, type AvailabilityFetchContext, type AvailabilityFetchGate } from '@fz/ticketing';

export function posAvailabilityFetchConfigFactory(): AvailabilityFetchConfig {
  const optimizely = inject(OptimizelyService);

  const whenEnabled =
    (flag: FeatureFlags): AvailabilityFetchGate =>
    ({ partnerId, planId }: AvailabilityFetchContext): boolean =>
      optimizely.isFeatureEnabled(flag, { partner_id: partnerId, plan_id: planId }) ?? false;

  const onFastLoadWhenEnabled =
    (flag: FeatureFlags): AvailabilityFetchGate =>
    (context: AvailabilityFetchContext): boolean =>
      context.isFastLoad && whenEnabled(flag)(context);

  return {
    parallelLegs: onFastLoadWhenEnabled(FeatureFlags.BOX_OFFICE_PARALLEL_SESSIONS_FOR_DATE),
    preloadFollowingDays: whenEnabled(FeatureFlags.BOX_OFFICE_PRELOAD_FOLLOWING_DAYS),
    timeWindows: onFastLoadWhenEnabled(FeatureFlags.BOX_OFFICE_SESSIONS_FOR_DATE_WINDOWS),
  };
}

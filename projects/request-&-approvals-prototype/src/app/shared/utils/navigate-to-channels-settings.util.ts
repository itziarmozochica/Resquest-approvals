import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Params, Router } from '@angular/router';

import { take } from 'rxjs/operators';

import { SelectedPlanContext } from '../services/__data__/selected-plan-context.model';
import { SelectedPlanContextService } from '../services/selected-plan-context/selected-plan-context.service';

const CHANNELS_SETTINGS_PATH = '/channels-settings';

export function buildChannelsSettingsQueryParams(
  planId: number,
  routeQueryParams: Params,
  context: SelectedPlanContext,
): Record<string, number> {
  const queryParams: Record<string, number> = { planId };

  const routeCityId = routeQueryParams['cityId'];
  const parsedRouteCityId = routeCityId !== undefined && routeCityId !== null && routeCityId !== '' ? Number(routeCityId) : Number.NaN;

  const cityId = Number.isFinite(context.cityId) ? context.cityId : Number.isFinite(parsedRouteCityId) ? parsedRouteCityId : undefined;

  if (cityId !== undefined) {
    queryParams.cityId = cityId;
  }

  return queryParams;
}

export function navigateToChannelsSettings(
  selectedPlanContextService: SelectedPlanContextService,
  router: Router,
  planId: number | null | undefined,
  routeQueryParams: Params,
  destroyRef: DestroyRef,
): void {
  if (planId === null || planId === undefined) {
    void router.navigate([CHANNELS_SETTINGS_PATH]);
    return;
  }

  selectedPlanContextService
    .getQueryParamsFor(CHANNELS_SETTINGS_PATH)
    .pipe(take(1), takeUntilDestroyed(destroyRef))
    .subscribe(context => {
      const mergedContext: SelectedPlanContext = { ...context, planId };
      const queryParams = buildChannelsSettingsQueryParams(planId, routeQueryParams, mergedContext);

      void router.navigate([CHANNELS_SETTINGS_PATH], { queryParams });
    });
}

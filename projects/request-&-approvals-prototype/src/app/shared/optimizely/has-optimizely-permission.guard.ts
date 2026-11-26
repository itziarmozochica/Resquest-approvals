import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';

import { UserAttributes } from '@optimizely/optimizely-sdk';

import { OptimizelyService } from './optimizely.service';

export const HasOptimizelyPermissionGuard: CanActivateFn = (
  activatedRouteSnapshot: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
): boolean => {
  const optimizelyService: OptimizelyService = inject(OptimizelyService);
  const router: Router = inject(Router);
  const module = activatedRouteSnapshot.data['module'];
  const planId = state?.root?.queryParamMap?.get('planId') ?? activatedRouteSnapshot.queryParamMap.get('planId');
  const extraAttributes: UserAttributes = {};

  if (planId != null && planId !== '') {
    extraAttributes.plan_id = planId;
  }

  if (optimizelyService.isFeatureEnabled(module, extraAttributes)) {
    return true;
  }

  router.navigate(['/plans'], { state: { url: state.url } });
  return false;
};

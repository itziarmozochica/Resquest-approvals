import { inject, Injector } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { Observable, of } from 'rxjs';
import { catchError, defaultIfEmpty, filter, map, mergeMap, take } from 'rxjs/operators';

import { OptimizelyService } from '../../optimizely/optimizely.service';
import { SelectedPlanContextService } from '../../services/selected-plan-context/selected-plan-context.service';
import { UserService } from '../../services/user/user.service';

export const PermissionBasedGuard: CanActivateFn = (activatedRouteSnapshot: ActivatedRouteSnapshot): Observable<boolean> => {
  const userService: UserService = inject(UserService);
  const datadogLogService: DatadogLogService = inject(DatadogLogService);
  const router: Router = inject(Router);
  const selectedPlanContextService: SelectedPlanContextService = inject(SelectedPlanContextService);
  const injector: Injector = inject(Injector);

  return userService.getUserObservable().pipe(
    filter(user => user !== null),
    take(1),
    mergeMap(() => {
      return userService.getPermissionsInOrganization().pipe(
        mergeMap(result => {
          const permissionData: string | readonly string[] = activatedRouteSnapshot.data['permission'];
          userService.setFirstActiveUrlByPermission(result.data as string[]);

          const permissions = permissionData instanceof Array ? permissionData : [permissionData];
          const hasPermission = permissions.some(permission => userService.hasPermission(permission));

          const featureFlag: string | undefined = activatedRouteSnapshot.data['featureFlag'];
          const featureFlagEnabled = featureFlag !== undefined && injector.get(OptimizelyService).isFeatureEnabled(featureFlag) === true;

          const granted = featureFlag !== undefined ? hasPermission && featureFlagEnabled : hasPermission;

          if (!permissionData || granted) {
            return of(true);
          }

          datadogLogService.logWarn('Route denied by the permission guard', {
            requiredPermissions: permissions,
            grantedPermissionCount: Array.isArray(result.data) ? result.data.length : 0,
            featureFlag: featureFlag ?? null,
            featureFlagEnabled: featureFlag === undefined ? null : featureFlagEnabled,
            routePath: activatedRouteSnapshot.routeConfig?.path ?? null,
          });

          const nextRoute: string = userService.getFirstActiveUrlByPermission();
          const currentUrl = router.url.split('?')[0];

          return selectedPlanContextService.getQueryParamsFor(nextRoute).pipe(
            take(1),
            map(queryParams => {
              router.navigate([nextRoute], {
                queryParams,
                ...(currentUrl === nextRoute ? { onSameUrlNavigation: 'reload' as const } : {}),
              });
              return false;
            }),
          );
        }),
        catchError((error: unknown) => {
          datadogLogService.logWarn('Route denied because the permissions could not be resolved', {
            routePath: activatedRouteSnapshot.routeConfig?.path ?? null,
            error: String(error),
          });
          router.navigateByUrl('/plans');
          return of(false);
        }),
      );
    }),
    defaultIfEmpty(false),
  );
};

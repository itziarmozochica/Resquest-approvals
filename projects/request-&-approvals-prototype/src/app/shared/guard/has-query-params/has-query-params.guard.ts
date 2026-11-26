import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';

export const HasQueryParamsGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router: Router = inject(Router);
  if (!route.data.requiredParams || !Array.isArray(route.data.requiredParams)) {
    return true;
  }

  let shouldGoToHome = false;
  route.data.requiredParams.forEach(qp => {
    shouldGoToHome = !route.queryParams[qp] || shouldGoToHome;
  });
  return shouldGoToHome ? router.parseUrl('/') : true;
};

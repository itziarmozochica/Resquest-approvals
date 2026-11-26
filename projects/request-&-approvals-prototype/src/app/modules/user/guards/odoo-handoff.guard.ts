import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';

import { OboSecondScreenDataService } from '@fz-original/app/modules/box-office/obo-second-screen/services/obo-second-screen-data.service';
import { SpinnerService } from '@fz-original/app/shared/layout/spinner/spinner.service';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { AuthenticationService } from '../../../core/authentication/authentication.service';
import { SKIP_ODOO_TILL_LOCK_STATE } from '../../../core/authentication/skip-odoo-till-lock.state';
import { normalizeOdooHandoffNextPath } from '../utils/odoo-handoff-next-path.util';

export const odooHandoffGuard: CanActivateFn = route => {
  const authenticationService = inject(AuthenticationService);
  const oboSecondScreenDataService = inject(OboSecondScreenDataService);
  const router = inject(Router);
  const spinnerService = inject(SpinnerService);

  const assertion = route.queryParamMap.get('assertion');
  const next = normalizeOdooHandoffNextPath(route.queryParamMap.get('next'));

  if (!assertion) {
    return new RedirectCommand(router.parseUrl('/login'), { replaceUrl: true, state: { [SKIP_ODOO_TILL_LOCK_STATE]: true } });
  }

  spinnerService.show();

  // The handoff is the only login the Odoo-first app goes through, and a cashier change clears the
  // customer screen record on the way: start it here so the paired screen leaves its logged-out state.
  return authenticationService.loginWithOdooHandoff(assertion).pipe(
    map(() => {
      oboSecondScreenDataService.createForActingOrganization();

      return new RedirectCommand(router.parseUrl(next), { replaceUrl: true });
    }),
    catchError(() =>
      of(
        new RedirectCommand(
          router.createUrlTree(['/login'], {
            queryParams: { next },
          }),
          { replaceUrl: true, state: { [SKIP_ODOO_TILL_LOCK_STATE]: true } },
        ),
      ),
    ),
  );
};

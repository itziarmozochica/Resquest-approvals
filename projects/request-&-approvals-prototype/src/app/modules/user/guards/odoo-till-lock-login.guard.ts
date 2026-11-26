import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { EntryPointClient } from '@fz-original/app/app/enums/entry-point-client.enum';
import { OdooTillLockRedirectService } from '@fz-original/app/core/authentication/odoo-till-lock-redirect.service';
import { SKIP_ODOO_TILL_LOCK_STATE } from '@fz-original/app/core/authentication/skip-odoo-till-lock.state';
import { OdooTillLockLinkService } from '@fz-original/app/modules/box-office/odoo-food-and-beverage/services/odoo-till-lock-link.service';
import { EntryPointClientService } from '@fz-original/app/shared/services/entry-point-client/entry-point-client.service';

/**
 * With Odoo as the entry point, the Feverzone login is not where a logged-out operator belongs: they signed in
 * with an Odoo PIN and come back through the Odoo hand-off. Whatever sends them to `/login` (logout, an expired
 * session, a guard), this is the one place that sends them to the till lock instead, through `OdooTillLockRedirectService`.
 *
 * The login still shows when there is no stored lock link for the selected onsite setup, or when the navigation
 * carries `SKIP_ODOO_TILL_LOCK_STATE` because the Odoo hand-off just failed.
 */
export const odooTillLockLoginGuard: CanActivateFn = () => {
  const odooTillLockLinkService = inject(OdooTillLockLinkService);
  const odooTillLockRedirectService = inject(OdooTillLockRedirectService);
  const router = inject(Router);
  const entryPointClientService = inject(EntryPointClientService);

  if (entryPointClientService.entryPointClient() !== EntryPointClient.Odoo) {
    return true;
  }

  if (router.getCurrentNavigation()?.extras.state?.[SKIP_ODOO_TILL_LOCK_STATE] === true) {
    return true;
  }

  const lockLink = odooTillLockLinkService.getStoredLockLink();

  if (lockLink === null) {
    return true;
  }

  return !odooTillLockRedirectService.leaveFor(lockLink);
};

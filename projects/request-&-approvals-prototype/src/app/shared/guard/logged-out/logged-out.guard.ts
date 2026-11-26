import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthenticationService } from '../../../core/authentication/authentication.service';
import { CONTROL_PANEL_EXIT_TO_ORGANIZATION_SELECTOR_STATE } from '../../services/control-panel-exit/control-panel-exit.service';
import { PartnerService } from '../../services/partner/partner.service';
import { UserService } from '../../services/user/user.service';

export const LoggedOutGuard: CanActivateFn = () => {
  const authenticationService: AuthenticationService = inject(AuthenticationService);
  const router: Router = inject(Router);
  const partnerService: PartnerService = inject(PartnerService);
  const userService: UserService = inject(UserService);
  const isControlPanelExitToOrganizationSelector =
    router.getCurrentNavigation()?.extras?.state?.[CONTROL_PANEL_EXIT_TO_ORGANIZATION_SELECTOR_STATE] === true;

  if (isControlPanelExitToOrganizationSelector) {
    return true;
  }

  if (!authenticationService.isLoggedIn() || !partnerService.getPartner() || !userService.getUser()) {
    return true;
  }
  router.navigate(['/project-management/projects']);
  return false;
};

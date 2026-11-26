import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';

import { defer, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { AuthenticationService } from '../../../core/authentication/authentication.service';
import { Permissions } from '../../services/user/permissions';
import { UserService } from '../../services/user/user.service';

/**
 * Matches a route only for users with reports access. Lets the router fall through to the
 * next sibling route (e.g. the legacy plan dashboard) for everyone else.
 *
 * Waits on the permissions rather than reading the cached list, the way `PermissionBasedGuard` does.
 * `canMatch` runs during route recognition, before any `canActivate` in the tree, and nothing loads
 * the permissions earlier on this path — so a synchronous read sees `[]` on the first navigation
 * after a page load and sends every deep link and every refresh to the legacy dashboard, while
 * clicking through from the event list works. That asymmetry reads as an intermittent bug, and the
 * deep-link path is the one this route exists to serve.
 *
 * Failing means falling through, never throwing: this guard decides which of two sibling routes the
 * router takes, so an error here does not degrade the screen, it aborts the whole navigation.
 */
export const canMatchViewReportsGuard: CanMatchFn = (): Observable<boolean> => {
  const authenticationService = inject(AuthenticationService);
  const userService = inject(UserService);

  /**
   * The session gate for the private tree is a `canActivateChild` (`LoggedGuard`), which runs after
   * recognition — so an unauthenticated deep link reaches this guard with no user, no partner and no
   * token, and asking for the permissions there took the navigation down before anyone could redirect
   * (FEVERZONE-21H). Falling through hands the URL to the legacy sibling, whose `LoggedGuard` sends the
   * visitor to `/login?next=<deep link>` and therefore back to this same URL, by then with a session.
   *
   * Answering here also keeps the sibling `canMatch` guards out of the picture: they wait on a partner
   * that never arrives without a session, and `prioritizedGuardValue()` resolves on the first guard in
   * declaration order, so a `false` from this one decides while a `true` would hang the navigation.
   */
  if (!authenticationService.isLoggedIn()) {
    return of(false);
  }

  /**
   * `getPermissionsInOrganization()` reports an unknown user or partner by throwing synchronously, so
   * outside `defer()` the `catchError` below is not installed yet when the call runs and cannot see it.
   */
  return defer(() => userService.getPermissionsInOrganization()).pipe(
    map(() => userService.hasPermission(Permissions.CAN_VIEW_REPORTS)),
    catchError(() => of(false)),
  );
};

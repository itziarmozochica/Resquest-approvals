import { inject, Injectable } from '@angular/core';

import { EMPTY, Observable } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { Shift } from '../../modules/box-office/shared/models/shifts.model';
import { UserShiftService } from '../../modules/box-office/ticketing/services/user-shift/user-shift.service';
import { OptimizelyService } from '../../shared/optimizely/optimizely.service';
import { ErrorModalService } from '../../shared/services/error-modal/error-modal.service';
import { UserService } from '../../shared/services/user/user.service';
import { AuthenticationService } from './authentication.service';
import { ImpersonationService } from './impersonation.service';

@Injectable({
  providedIn: 'root',
})
export class ShiftReminderLogoutService {
  #authenticationService = inject(AuthenticationService);
  #errorModalService = inject(ErrorModalService);
  #impersonationService = inject(ImpersonationService);
  #optimizelyService = inject(OptimizelyService);
  #userService = inject(UserService);
  #userShiftService = inject(UserShiftService);

  logout(): Observable<void> {
    if (this.#impersonationService.isImpersonating()) {
      return this.#impersonationService.stopWithoutReload().pipe(
        catchError(() => {
          this.#showImpersonationStopError();
          return EMPTY;
        }),
        switchMap(response => {
          if (response.error) {
            this.#showImpersonationStopError();
            return EMPTY;
          }

          return this.#logoutWithShiftReminder();
        }),
      );
    }

    return this.#logoutWithShiftReminder();
  }

  #logoutWithShiftReminder(): Observable<void> {
    const isReminderShiftModalEnabled = this.#optimizelyService.isFeatureEnabled('reminder_shift_modal');
    const userHasPermission = this.#userService.hasPermission('can_view_my_shifts');

    if (!isReminderShiftModalEnabled || !userHasPermission) {
      return this.#performLogout();
    }

    return this.#userShiftService.getOpenedShift().pipe(
      switchMap((shift: Shift | null) => {
        if (shift !== null) {
          this.#showReminderShiftModal();
          return EMPTY;
        }
        return this.#performLogout();
      }),
    );
  }

  #performLogout(): Observable<void> {
    return this.#authenticationService.logout().pipe(map((): void => void 0));
  }

  #showImpersonationStopError(): void {
    this.#errorModalService.open({
      message: 'errors.generic',
      title: 'common.errorTitle',
    });
  }

  #showReminderShiftModal(): void {
    this.#errorModalService.open({
      message: 'logout.openedShiftModal.message',
      title: 'logout.openedShiftModal.title',
    });
  }
}

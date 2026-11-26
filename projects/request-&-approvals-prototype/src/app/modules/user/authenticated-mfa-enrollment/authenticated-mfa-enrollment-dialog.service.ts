import { inject, Injectable, Signal, signal } from '@angular/core';

import { IgntDialogRef, IgntDialogService } from '@ignite/common';
import { finalize, Observable, take } from 'rxjs';

import { UserMfaStatusService } from '../../../shared/services/user/user-mfa-status.service';
import { AuthenticatedMfaEnrollmentModalData } from './authenticated-mfa-enrollment-modal-data.model';
import { AuthenticatedMfaEnrollmentModalComponent } from './authenticated-mfa-enrollment-modal.component';

@Injectable({
  providedIn: 'root',
})
export class AuthenticatedMfaEnrollmentDialogService {
  readonly #dialog = inject(IgntDialogService);
  readonly #isOpen = signal(false);
  readonly #userMfaStatus = inject(UserMfaStatusService);

  /** True while the authenticated MFA enrollment modal is open. */
  readonly isOpen: Signal<boolean> = this.#isOpen.asReadonly();

  // Reloads MFA on verify success (under the open modal); closing has no further side effects.
  // `isOpen` is cleared by an internal subscription so callers (e.g. the layout banner) can
  // unsubscribe when destroyed without flipping the flag back and re-showing the banner.
  open(): Observable<unknown> {
    const dialogData: AuthenticatedMfaEnrollmentModalData = {
      onEnrolled: (): void => {
        this.#userMfaStatus.reload();
      },
    };

    this.#isOpen.set(true);

    const dialogRef: IgntDialogRef<boolean> = this.#dialog.openModal<boolean, AuthenticatedMfaEnrollmentModalData>(
      AuthenticatedMfaEnrollmentModalComponent,
      {
        data: dialogData,
        disableCloseShortcuts: true,
        size: 'sm',
      },
    );

    const closed$: Observable<boolean | undefined> = dialogRef.closed$.pipe(take(1));

    closed$
      .pipe(
        finalize((): void => {
          this.#isOpen.set(false);
        }),
      )
      .subscribe();

    return closed$;
  }
}

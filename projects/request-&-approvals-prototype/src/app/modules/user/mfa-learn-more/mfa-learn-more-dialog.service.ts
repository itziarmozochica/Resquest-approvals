import { inject, Injectable, Signal, signal } from '@angular/core';

import { IgntDialogRef, IgntDialogService } from '@ignite/common';
import { asapScheduler, finalize, Observable, observeOn, of, share, switchMap, take } from 'rxjs';

import { userMfaPolicyStatus, UserMfaStatus } from '../../../shared/models/user/user-mfa.model';
import { PartnerService } from '../../../shared/services/partner/partner.service';
import { UserMfaStatusService } from '../../../shared/services/user/user-mfa-status.service';
import { AuthenticatedMfaEnrollmentDialogService } from '../authenticated-mfa-enrollment/authenticated-mfa-enrollment-dialog.service';
import { MfaLearnMoreModalData, MfaLearnMoreModalResult } from './mfa-learn-more-modal-data.model';
import { MfaLearnMoreModalComponent } from './mfa-learn-more-modal.component';

@Injectable({
  providedIn: 'root',
})
export class MfaLearnMoreDialogService {
  readonly #authenticatedMfaEnrollmentDialog = inject(AuthenticatedMfaEnrollmentDialogService);
  readonly #dialog = inject(IgntDialogService);
  readonly #isOpen = signal(false);
  readonly #partner = inject(PartnerService);
  readonly #userMfaStatus = inject(UserMfaStatusService);

  /** True while the learn-more modal is open, including the handoff into enrollment when Setup is chosen. */
  readonly isOpen: Signal<boolean> = this.#isOpen.asReadonly();

  // `isOpen` stays true across learn-more → enrollment so the layout banner does not flash between
  // overlays. It is cleared by an internal subscription so callers can unsubscribe without flipping
  // the flag early.
  open(): Observable<unknown> {
    const status: UserMfaStatus | null = this.#userMfaStatus.status();
    const dialogData: MfaLearnMoreModalData = {
      enforcedAt: this.#userMfaStatus.enforcedAt(),
      isGraceExpired: status?.policy.status === userMfaPolicyStatus.required,
      orgName: this.#partner.getPartner()?.name ?? null,
    };

    this.#isOpen.set(true);

    const dialogRef: IgntDialogRef<MfaLearnMoreModalResult | undefined> = this.#dialog.openModal<
      MfaLearnMoreModalResult | undefined,
      MfaLearnMoreModalData
    >(MfaLearnMoreModalComponent, {
      data: dialogData,
      size: 'sm',
    });

    // Ignite emits closed$ before restoring focus and disposing the overlay; wait one microtask
    // so enrollment opens on a clean screen and does not steal a dying trigger as its focus target.
    // `share()` keeps a single enrollment open() when both the internal isOpen subscription and the
    // caller subscribe to the same chain.
    const result$: Observable<unknown> = dialogRef.closed$.pipe(
      take(1),
      observeOn(asapScheduler),
      switchMap((result: MfaLearnMoreModalResult | undefined) => {
        if (result === MfaLearnMoreModalResult.Setup) {
          return this.#authenticatedMfaEnrollmentDialog.open();
        }

        return of(result);
      }),
      share(),
    );

    result$
      .pipe(
        finalize((): void => {
          this.#isOpen.set(false);
        }),
      )
      .subscribe();

    return result$;
  }
}

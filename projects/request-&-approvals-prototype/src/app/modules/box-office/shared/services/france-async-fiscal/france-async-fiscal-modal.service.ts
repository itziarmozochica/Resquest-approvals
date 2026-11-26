import { inject, Injectable, Injector, signal } from '@angular/core';

import { IGNT_DIALOG_TRANSLATIONS, IgntDialogService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { catchError, defaultIfEmpty, defer, map, Observable, of, switchMap } from 'rxjs';

/**
 * Cashier-facing messages for a France async sale that ended without a ticket. Kept apart from
 * `EfrUserMessageModalService` (the Hungary EFR UserMessage notice) so this flow does not change the
 * modal host of a screen it has nothing to do with.
 */
@Injectable({
  providedIn: 'root',
})
export class FranceAsyncFiscalModalService {
  readonly #dialogService = inject(IgntDialogService);
  readonly #injector = inject(Injector);
  readonly #translate = inject(TranslateService);

  showBookingFailure(): Observable<void> {
    return this.#openMessage(
      this.#translate.instant('boxOffice.fiscal.bookingFailure.title'),
      this.#translate.instant('boxOffice.fiscal.bookingFailure.message'),
    );
  }

  showBookingFailureError(): Observable<void> {
    return this.#openMessage(
      this.#translate.instant('boxOffice.fiscal.bookingFailure.errorTitle'),
      this.#translate.instant('boxOffice.fiscal.bookingFailure.errorMessage'),
    );
  }

  showFiscalSigningActionFailed(): Observable<void> {
    return this.#openMessage(
      this.#translate.instant('boxOffice.fiscal.signingRetry.actionFailedTitle'),
      this.#translate.instant('boxOffice.fiscal.signingRetry.actionFailedMessage'),
    );
  }

  /**
   * Resolves true when the cashier chooses to sign again, false when they give the sale up, and null
   * when the dialog closed twice without an answer. Both actions touch the fiscal journal or the
   * payments, so an unanswered dialog is opened once more and never stands in for either choice.
   */
  showFiscalSigningRetryPrompt(): Observable<boolean | null> {
    const okButton = this.#translate.instant('boxOffice.fiscal.signingRetry.retry');
    const cancelButton = this.#translate.instant('boxOffice.fiscal.signingRetry.cancelSale');
    const prompt$ = defer(
      () =>
        this.#dialogService.openConfirmModal(
          this.#translate.instant('boxOffice.fiscal.signingRetry.title'),
          this.#translate.instant('boxOffice.fiscal.signingRetry.message'),
          {
            injector: Injector.create({
              parent: this.#injector,
              providers: [{ provide: IGNT_DIALOG_TRANSLATIONS, useValue: signal({ cancelButton, okButton }) }],
            }),
          },
        ).closed$,
    ).pipe(
      map(answer => (typeof answer === 'boolean' ? answer : null)),
      catchError(() => of(null)),
      defaultIfEmpty(null),
    );
    return prompt$.pipe(switchMap(answer => (answer === null ? prompt$ : of(answer))));
  }

  showFiscalSigningStillRunning(): Observable<void> {
    return this.#openMessage(
      this.#translate.instant('boxOffice.fiscal.signingRetry.stillRunningTitle'),
      this.#translate.instant('boxOffice.fiscal.signingRetry.stillRunningMessage'),
    );
  }

  showFiscalSigningUnresolvable(): Observable<void> {
    return this.#openMessage(
      this.#translate.instant('boxOffice.fiscal.signingRetry.unresolvableTitle'),
      this.#translate.instant('boxOffice.fiscal.signingRetry.unresolvableMessage'),
    );
  }

  showFranceAsyncFiscalFailure(): Observable<void> {
    return this.#openMessage(
      this.#translate.instant('boxOffice.fiscal.franceAsyncFailureTitle'),
      this.#translate.instant('boxOffice.fiscal.franceAsyncFailureMessage'),
    );
  }

  showFranceAsyncFiscalFailureError(): Observable<void> {
    return this.#openMessage(
      this.#translate.instant('boxOffice.fiscal.franceAsyncFailureErrorTitle'),
      this.#translate.instant('boxOffice.fiscal.franceAsyncFailureErrorMessage'),
    );
  }

  #openMessage(title: string, message: string): Observable<void> {
    const okButton = this.#translate.instant('common.accept');
    return this.#dialogService
      .openMessageModal(title, message, {
        injector: Injector.create({
          parent: this.#injector,
          providers: [{ provide: IGNT_DIALOG_TRANSLATIONS, useValue: signal({ okButton }) }],
        }),
      })
      .closed$.pipe(
        catchError(() => of(undefined)),
        map((): undefined => undefined),
      );
  }
}

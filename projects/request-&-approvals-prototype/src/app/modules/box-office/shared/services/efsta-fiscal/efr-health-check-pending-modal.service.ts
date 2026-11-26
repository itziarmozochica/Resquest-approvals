import { inject, Injectable } from '@angular/core';

import { IgntDialogRef, IgntDialogService } from '@ignite/common';
import {
  catchError,
  concatMap,
  defer,
  finalize,
  map,
  Observable,
  of,
  ReplaySubject,
  Subscription,
  take,
  throwError,
  timeout,
  timer,
} from 'rxjs';

import { EfrHealthCheckPendingModalComponent } from '../../components/efr-health-check-pending-modal/efr-health-check-pending-modal.component';
import { EfrHealthCheckPendingDialogData } from './models/efr-health-check.model';

export const EFR_HEALTH_CHECK_PENDING_DELAY_MS = 400;
export const EFR_HEALTH_CHECK_PENDING_CLOSE_TIMEOUT_MS = 1000;

@Injectable({
  providedIn: 'root',
})
export class EfrHealthCheckPendingModalService {
  readonly #dialogService = inject(IgntDialogService);

  #activeChecks = 0;
  #closingDialog: Observable<void> | null = null;
  #dialogRef: IgntDialogRef | null = null;
  #openTimer: Subscription | null = null;

  trackPending<T>(source: Observable<T>, data?: EfrHealthCheckPendingDialogData): Observable<T> {
    return defer(() => {
      this.#acquire(data);
      let released = false;
      const release = (): Observable<void> => {
        if (released) {
          return of(undefined);
        }
        released = true;
        return this.#release();
      };

      return source.pipe(
        concatMap((value: T) => release().pipe(map(() => value))),
        catchError((error: unknown) => release().pipe(concatMap(() => throwError(() => error)))),
        finalize(() => {
          release().subscribe();
        }),
      );
    });
  }

  #acquire(data?: EfrHealthCheckPendingDialogData): void {
    this.#activeChecks += 1;
    if (this.#activeChecks > 1) {
      return;
    }
    const afterPreviousClose = this.#closingDialog ?? of(undefined);
    this.#openTimer = afterPreviousClose.pipe(concatMap(() => timer(EFR_HEALTH_CHECK_PENDING_DELAY_MS))).subscribe(() => {
      this.#openTimer = null;
      this.#dialogRef = this.#dialogService.openModal(EfrHealthCheckPendingModalComponent, {
        data,
        disableCloseShortcuts: true,
        size: 'sm',
      });
    });
  }

  #closeDialog(dialogRef: IgntDialogRef): Observable<void> {
    const closed = new ReplaySubject<void>(1);
    dialogRef.closed$.pipe(take(1)).subscribe({
      complete: () => {
        closed.next(undefined);
        closed.complete();
      },
    });
    dialogRef.close();
    return closed.asObservable().pipe(timeout({ each: EFR_HEALTH_CHECK_PENDING_CLOSE_TIMEOUT_MS, with: () => of(undefined) }));
  }

  #release(): Observable<void> {
    this.#activeChecks -= 1;
    if (this.#activeChecks > 0) {
      return of(undefined);
    }
    this.#openTimer?.unsubscribe();
    this.#openTimer = null;
    const dialogRef = this.#dialogRef;
    this.#dialogRef = null;
    if (dialogRef === null) {
      return of(undefined);
    }
    const closing = this.#closeDialog(dialogRef);
    this.#closingDialog = closing;
    closing.subscribe(() => {
      if (this.#closingDialog === closing) {
        this.#closingDialog = null;
      }
    });
    return closing;
  }
}

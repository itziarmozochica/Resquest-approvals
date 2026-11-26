import { inject, Injectable, signal, WritableSignal } from '@angular/core';

import { IgntDialogRef, IgntDialogService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import {
  asapScheduler,
  catchError,
  concatMap,
  defaultIfEmpty,
  defer,
  finalize,
  map,
  MonoTypeOperatorFunction,
  Observable,
  observeOn,
  switchMap,
  take,
  throwError,
} from 'rxjs';

import { PrintProgressDialogComponent } from '../../components/print-progress-dialog/print-progress-dialog.component';
import { PrintRetryDialogComponent } from '../../components/print-retry-dialog/print-retry-dialog.component';
import { PrintProgressDialogData, PrintProgressRef, PrintRetryDialogData, PrintRetryDialogLabels } from './models/print-dialog.model';

@Injectable({
  providedIn: 'root',
})
export class PrintDialogService {
  static readonly cancelKey = 'common.cancel';
  static readonly printingKey = 'boxOffice.order.zebraPrinter.printing';
  static readonly printingProgressKey = 'boxOffice.order.zebraPrinter.printingProgress';
  static readonly retryKey = 'boxOffice.order.zebraPrinter.buttons.retry';

  readonly #dialogService = inject(IgntDialogService);
  readonly #translateService = inject(TranslateService);

  confirmRetry(title: string, message: string, labels: PrintRetryDialogLabels = {}): Observable<boolean> {
    const dialogRef: IgntDialogRef<boolean> = this.#dialogService.openModal<boolean, PrintRetryDialogData>(PrintRetryDialogComponent, {
      data: {
        cancelLabel: labels.cancelLabel ?? this.#translateService.instant(PrintDialogService.cancelKey),
        message,
        retryLabel: labels.retryLabel ?? this.#translateService.instant(PrintDialogService.retryKey),
        title,
      },
      disableCloseShortcuts: true,
      size: 'sm',
    });

    // Waits the same extra microtask as the progress close, so a retry does not open its progress under this dialog.
    return dialogRef.closed$.pipe(
      take(1),
      map((shouldRetry: boolean | undefined): boolean => shouldRetry === true),
      observeOn(asapScheduler),
    );
  }

  openProgress(total: number, current: number = 1): PrintProgressRef {
    const message: WritableSignal<string> = signal(this.#getProgressMessage(current, total));
    const dialogRef: IgntDialogRef<void> = this.#dialogService.openModal<void, PrintProgressDialogData>(PrintProgressDialogComponent, {
      data: { message: message.asReadonly() },
      disableCloseShortcuts: true,
      size: 'sm',
    });

    return {
      close: (): Observable<void> => {
        dialogRef.close();
        // Ignite emits `closed$` after the closing animation, just before the overlay restores the focus and disposes,
        // so the next step waits one more microtask to open its own dialog on a clean screen.
        return dialogRef.closed$.pipe(
          take(1),
          defaultIfEmpty(undefined),
          map((): void => undefined),
          observeOn(asapScheduler),
        );
      },
      update: (currentStep: number): void => message.set(this.#getProgressMessage(currentStep, total)),
    };
  }

  showMessage(title: string, message: string): void {
    this.#dialogService.openMessageModal(title, message);
  }

  #getProgressMessage(current: number, total: number): string {
    return total > 1
      ? this.#translateService.instant(PrintDialogService.printingProgressKey, { current, total })
      : this.#translateService.instant(PrintDialogService.printingKey);
  }
}

/**
 * Holds the value or the error of a progress step until its dialog has closed, so whatever comes next — another dialog,
 * a new tab — does not open underneath it. Closes the dialog on teardown too.
 */
export function closingProgress<T>(progress: PrintProgressRef): MonoTypeOperatorFunction<T> {
  return (source$: Observable<T>): Observable<T> =>
    defer(() => {
      let isClosing = false;
      const close$ = (): Observable<void> => {
        isClosing = true;
        return progress.close();
      };

      return source$.pipe(
        concatMap((value: T) => close$().pipe(map((): T => value))),
        catchError((error: unknown) => (isClosing ? throwError(() => error) : close$().pipe(switchMap(() => throwError(() => error))))),
        finalize(() => {
          if (!isClosing) {
            progress.close();
          }
        }),
      );
    });
}

import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogModule, IgntDialogRef } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { Observable } from 'rxjs';

export interface CancelReservationConfirmModalData<T = unknown> {
  acceptLabel: string;
  cancelLabel: string;
  message: string;
  title: string;
  onConfirm?: () => Observable<T>;
}

export interface CancelReservationConfirmModalResult<T = unknown> {
  confirmed: boolean;
  error?: unknown;
  result?: T;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntDialogModule],
  selector: 'app-cancel-reservation-confirm-modal',
  standalone: true,
  styleUrls: ['./cancel-reservation-confirm-modal.component.scss'],
  templateUrl: './cancel-reservation-confirm-modal.component.html',
})
export class CancelReservationConfirmModalComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject<IgntDialogRef<CancelReservationConfirmModalResult>>(IGNT_DIALOG_REF);

  protected readonly dialogData = inject<CancelReservationConfirmModalData>(IGNT_DIALOG_DATA);
  protected readonly isLoading = signal(false);

  onAccept(): void {
    if (this.isLoading()) {
      return;
    }

    if (!this.dialogData.onConfirm) {
      this.#dialogRef.close({ confirmed: true });
      return;
    }

    this.isLoading.set(true);
    this.dialogData
      .onConfirm()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: (error: unknown) => {
          this.isLoading.set(false);
          this.#dialogRef.close({ confirmed: true, error });
        },
        next: (result: unknown) => {
          this.isLoading.set(false);
          this.#dialogRef.close({ confirmed: true, result });
        },
      });
  }

  onCancel(): void {
    if (this.isLoading()) {
      return;
    }
    this.#dialogRef.close({ confirmed: false });
  }
}

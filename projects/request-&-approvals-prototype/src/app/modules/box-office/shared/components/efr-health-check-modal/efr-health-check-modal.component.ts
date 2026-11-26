import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';

import { IgntButtonComponent, IgntButtonVariant } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, take } from 'rxjs';

import {
  EfrHealthCheckDialogData,
  EfrHealthCheckResult,
  EfrHealthError,
  EfrHealthErrorCode,
  EfrRegistrationFailureModalClose,
} from '../../services/efsta-fiscal/models/efr-health-check.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, TranslateModule],
  selector: 'fzo-efr-health-check-modal',
  standalone: true,
  styleUrl: './efr-health-check-modal.component.scss',
  templateUrl: './efr-health-check-modal.component.html',
})
export class EfrHealthCheckModalComponent {
  readonly #cdr = inject(ChangeDetectorRef);
  readonly #data = inject<EfrHealthCheckDialogData>(DIALOG_DATA);
  readonly #dialogRef = inject<DialogRef<EfrHealthCheckResult | EfrRegistrationFailureModalClose | undefined>>(DialogRef);

  #latestUnhealthyResult: EfrHealthCheckResult = this.#data.initialUnhealthyResult ?? {
    healthy: false,
    error: this.#data.error,
    state: null,
  };
  #closeDayAction = this.#data.closeDayAction;
  loading = false;
  solutionsExpanded = false;

  protected get error(): EfrHealthError {
    const resolved = this.#latestUnhealthyResult.error;
    if (resolved == null) {
      throw new Error('EfrHealthCheckModalComponent: missing error for unhealthy EFR state');
    }
    return resolved;
  }

  protected get closeBtnKey(): string {
    return this.#data.closeBtnKey ?? 'boxOffice.fiscal.healthCheck.closeModal';
  }

  protected get retryBtnKey(): string {
    return this.#data.retryBtnKey ?? 'boxOffice.fiscal.healthCheck.checkAgain';
  }

  protected get warningKey(): string | undefined {
    return this.#data.warningKey;
  }

  protected readonly hideCloseBtn = this.#data.hideCloseBtn === true;

  protected get hideRetryBtn(): boolean {
    return this.error.retryable === false;
  }

  protected get closeBtnVariant(): IgntButtonVariant {
    return this.hideRetryBtn ? 'primary' : 'secondary';
  }

  protected get closeDayActionFn(): (() => Observable<EfrHealthCheckResult>) | undefined {
    return this.#closeDayAction;
  }

  protected get closeDayActionBtnKey(): string {
    return this.#data.closeDayActionBtnKey ?? 'boxOffice.fiscal.healthCheck.zRequired.closeDayBtn';
  }

  close(): void {
    if (this.#data.trackLastUnhealthyOnAbort === true) {
      this.#dialogRef.close({ kind: 'aborted', lastUnhealthy: this.#latestUnhealthyResult });
      return;
    }
    this.#dialogRef.close();
  }

  retry(): void {
    this.loading = true;
    this.#data
      .onRetry()
      .pipe(take(1))
      .subscribe({
        complete: () => {
          this.loading = false;
          this.#cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.#cdr.markForCheck();
        },
        next: result => {
          this.loading = false;
          if (result.healthy) {
            if (this.#data.trackLastUnhealthyOnAbort === true) {
              this.#dialogRef.close({ kind: 'success', result });
            } else {
              this.#dialogRef.close(result);
            }
          } else {
            this.#latestUnhealthyResult = result;
            this.solutionsExpanded = false;
          }
          this.#cdr.markForCheck();
        },
      });
  }

  closeDayDirect(): void {
    const action = this.#closeDayAction;
    if (action == null) return;
    this.loading = true;
    action()
      .pipe(take(1))
      .subscribe({
        error: () => {
          this.loading = false;
          this.#cdr.markForCheck();
        },
        next: result => {
          this.loading = false;
          if (result.healthy || result.error?.code !== EfrHealthErrorCode.Z_REQUIRED) {
            this.#closeDayAction = undefined;
          }
          if (result.healthy) {
            if (this.#data.trackLastUnhealthyOnAbort === true) {
              this.#dialogRef.close({ kind: 'success', result });
            } else {
              this.#dialogRef.close(result);
            }
          } else {
            this.#latestUnhealthyResult = result;
            this.solutionsExpanded = false;
          }
          this.#cdr.markForCheck();
        },
      });
  }

  toggleSolutions(): void {
    this.solutionsExpanded = !this.solutionsExpanded;
  }
}

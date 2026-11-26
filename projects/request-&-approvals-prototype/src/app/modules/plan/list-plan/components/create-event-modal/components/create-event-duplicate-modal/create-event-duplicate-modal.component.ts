import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { DuplicatePlanOrchestratorService } from '@fz-original/app/modules/plan/services/duplicate-plan-orchestrator.service';
import { DuplicatePlanSuccess } from '@fz-original/app/modules/plan/services/duplicate-plan-result.model';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogModule, IgntDialogService, type IgntDialogRef } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize, take } from 'rxjs/operators';

import { planTrackingProvider } from '../../../../../tracking/plan.tracking-provider';
import { DuplicatePlanConfirmDialogComponent } from '../../../duplicate-plan-confirm-dialog/duplicate-plan-confirm-dialog.component';
import { type DuplicatePlanConfirmDialogData } from '../../../duplicate-plan-confirm-dialog/duplicate-plan-confirm-dialog.model';
import { mapCreateEventTypeToPlanKind } from '../../utils/map-create-event-type-to-plan-kind.util';
import { PlanSelectComponent, type PlanSelection } from '../plan-select/plan-select.component';
import { type CreateEventDuplicateModalData, type CreateEventDuplicateModalResult } from './create-event-duplicate-modal.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlanSelectComponent, IgntButtonComponent, IgntDialogModule, IgntIconComponent, TranslateModule],
  providers: [DuplicatePlanOrchestratorService, ...planTrackingProvider()],
  selector: 'app-create-event-duplicate-modal',
  standalone: true,
  styleUrl: './create-event-duplicate-modal.component.scss',
  templateUrl: './create-event-duplicate-modal.component.html',
})
export class CreateEventDuplicateModalComponent {
  readonly #data = inject<CreateEventDuplicateModalData>(IGNT_DIALOG_DATA);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(IGNT_DIALOG_REF) as IgntDialogRef<CreateEventDuplicateModalResult>;
  readonly #dialogService = inject(IgntDialogService);
  readonly #duplicatePlanOrchestratorService = inject(DuplicatePlanOrchestratorService);
  readonly #router = inject(Router);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);

  readonly #selectedPlan = signal<PlanSelection | null>(null);

  protected readonly eventType = this.#data.eventType;
  protected readonly isConfirmDisabled = computed(() => this.#selectedPlan() === null || this.isConfirmPending() || this.isDuplicating());
  protected readonly isConfirmPending = signal(false);
  protected readonly isDuplicating = signal(false);
  protected readonly planKind = mapCreateEventTypeToPlanKind(this.eventType);

  protected onBack(): void {
    if (this.isConfirmPending() || this.isDuplicating()) {
      return;
    }

    this.#dialogRef.close('back');
  }

  protected onConfirm(): void {
    const selectedPlan = this.#selectedPlan();

    if (!selectedPlan || this.isConfirmPending() || this.isDuplicating()) {
      return;
    }

    this.isConfirmPending.set(true);

    const confirmRef = this.#dialogService.openModal<boolean, DuplicatePlanConfirmDialogData>(DuplicatePlanConfirmDialogComponent, {
      data: {
        acceptButtonLabel: this.#translateService.instant('listPlan.duplicateEvent.confirmAccept'),
        cancelButtonLabel: this.#translateService.instant('common.cancel'),
        question: this.#translateService.instant('listPlan.duplicateEvent.confirmMessage', { planName: selectedPlan.planName }),
        title: this.#translateService.instant('listPlan.duplicateEvent.confirmTitle'),
      },
      size: 'sm',
    });

    confirmRef.closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe((accepted: boolean | undefined) => {
      this.isConfirmPending.set(false);

      if (accepted === true) {
        this.#duplicateSelectedPlan(selectedPlan);
      }
    });
  }

  #duplicateSelectedPlan(selectedPlan: PlanSelection): void {
    this.isDuplicating.set(true);

    this.#duplicatePlanOrchestratorService
      .executeDuplicate({
        planId: selectedPlan.planId,
        planName: selectedPlan.planName,
        source: 'create_event',
      })
      .pipe(
        finalize(() => this.isDuplicating.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: () => {
          this.#toastService.add({
            autoHide: true,
            delay: 5000,
            message: this.#translateService.instant('errors.generic'),
            sentiment: AlertSentiment.danger,
            title: this.#translateService.instant('common.errorTitle'),
          });
        },
        next: (result: DuplicatePlanSuccess) => {
          this.#toastService.add({
            autoHide: true,
            delay: 5000,
            message: this.#translateService.instant('listPlan.duplicateEvent.successMessage'),
            sentiment: AlertSentiment.positive,
            title: this.#translateService.instant('listPlan.duplicateEvent.successTitle'),
          });
          this.#dialogRef.close('confirmed');
          void this.#router.navigate(['/plans/dashboard'], { queryParams: { planId: result.duplicatedPlanId } });
        },
      });
  }

  protected onPlanSelected(selection: PlanSelection | null): void {
    this.#selectedPlan.set(selection);
  }
}

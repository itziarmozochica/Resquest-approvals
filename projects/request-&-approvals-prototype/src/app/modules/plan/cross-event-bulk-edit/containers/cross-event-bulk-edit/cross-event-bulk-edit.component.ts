import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Injector } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntButtonComponent, IgntDialogService, type IgntDialogRef } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';
import { take } from 'rxjs';

import { crossEventBulkEditStepCompleted } from '../../../tracking/events/cross-event-bulk-edit-step-completed.event';
import { planTrackingProvider } from '../../../tracking/plan.tracking-provider';
import { CrossEventBulkEditEventListComponent } from '../../components/cross-event-bulk-edit-event-list/cross-event-bulk-edit-event-list.component';
import { CrossEventBulkEditWizardPanelComponent } from '../../components/cross-event-bulk-edit-wizard-panel/cross-event-bulk-edit-wizard-panel.component';
import { CrossEventBulkEditStore } from '../../store/cross-event-bulk-edit.store';
import { toSelectEventsStepCompletedData } from '../../utils/cross-event-bulk-edit-tracking.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrossEventBulkEditEventListComponent, IgntButtonComponent, TranslateModule],
  providers: [...planTrackingProvider(), CrossEventBulkEditStore],
  selector: 'app-cross-event-bulk-edit',
  styleUrl: './cross-event-bulk-edit.component.scss',
  templateUrl: './cross-event-bulk-edit.component.html',
})
export class CrossEventBulkEditComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #injector = inject(Injector);
  readonly #router = inject(Router);
  readonly #store = inject(CrossEventBulkEditStore);
  #wizardPanel: IgntDialogRef<void> | null = null;

  protected readonly isContinueUnavailable = computed(() => !this.#store.canContinue());
  protected readonly selectedPlanCount = computed(() => this.#store.selectedPlanIds().length);

  constructor() {
    this.#destroyRef.onDestroy(() => {
      this.#wizardPanel?.close();
    });
  }

  protected onContinue(): void {
    if (!this.#store.canContinue() || this.#wizardPanel !== null) {
      return;
    }

    this.#fzTracking.track(
      crossEventBulkEditStepCompleted(
        toSelectEventsStepCompletedData({
          planOnSale: this.#store.planOnSale(),
          planPlaceIds: this.#store.planPlaceIds(),
          selectedPlanIds: this.#store.selectedPlanIds(),
          usedSelectAll: this.#store.usedSelectAll(),
        }),
      ),
    );
    this.#store.openWizard();
    const dialogRef = this.#dialogService.openSidePanel<void>(CrossEventBulkEditWizardPanelComponent, {
      injector: this.#injector,
      size: 'md',
    });
    this.#wizardPanel = dialogRef;
    dialogRef.closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.#wizardPanel = null;
    });
  }

  protected onLeave(): void {
    void this.#router.navigate(['/plans']);
  }
}

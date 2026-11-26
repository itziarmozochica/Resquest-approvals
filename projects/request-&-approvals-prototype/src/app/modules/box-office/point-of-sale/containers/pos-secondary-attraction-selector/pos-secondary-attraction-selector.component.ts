import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { type SecondaryPlanInformation } from '@fz-original/app/shared/models/plan/plan.model';
import { IgntAlertComponent, IgntButtonComponent } from '@ignite/common';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { TranslateModule } from '@ngx-translate/core';

import { PosFlexibleBundleService } from '../../services/flexible-bundle/pos-flexible-bundle.service';
import { PosTicketingState } from '../../state/pos-ticketing.state';
import { maxSecondaryPlanSelections, selectableSecondaryPlans } from '../../utils/pos-secondary-plan-rows.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntAlertComponent, IgntButtonComponent, IgntCheckboxComponent, TranslateModule],
  selector: 'pos-secondary-attraction-selector',
  standalone: true,
  styleUrl: './pos-secondary-attraction-selector.component.scss',
  templateUrl: './pos-secondary-attraction-selector.component.html',
})
export class PosSecondaryAttractionSelectorComponent {
  readonly #flexibleBundle = inject(PosFlexibleBundleService);
  readonly #state = inject(PosTicketingState);

  readonly mainPlanName = computed(() => this.#state.activePlan()?.name ?? '');

  readonly secondaryPlans = computed<readonly SecondaryPlanInformation[]>(() => selectableSecondaryPlans(this.#state.activePlan()));

  readonly #bundleInfo = computed(() => this.#state.activePlan()?.bundleInformation ?? null);

  protected readonly minSecondary = computed(() => Math.max((this.#bundleInfo()?.minSize ?? 1) - 1, 0));

  readonly #maxSecondary = computed(() => maxSecondaryPlanSelections(this.#bundleInfo(), this.secondaryPlans().length));

  readonly selectedPlanIds = this.#state.selectedSecondaryPlanIds;

  readonly meetsMinimum = computed(() => this.selectedPlanIds().size >= this.minSecondary());

  readonly isAtMax = computed(() => this.selectedPlanIds().size >= this.#maxSecondary());

  readonly selectedCount = computed(() => this.selectedPlanIds().size + 1);

  readonly secondaryPlanRows = computed(() => {
    const selectedPlanIds = this.selectedPlanIds();
    const isAtMax = this.isAtMax();

    return this.secondaryPlans().map((plan: SecondaryPlanInformation) => {
      const isSelected = selectedPlanIds.has(plan.id);

      return { id: plan.id, isDisabled: isAtMax && !isSelected, isSelected, name: plan.name };
    });
  });

  togglePlan(planId: number): void {
    const next = new Set(this.selectedPlanIds());

    if (next.has(planId)) {
      next.delete(planId);
    } else if (next.size < this.#maxSecondary()) {
      next.add(planId);
    } else {
      return;
    }

    this.#flexibleBundle.setSecondaryPlans(next);
  }

  clearSelection(): void {
    this.#flexibleBundle.setSecondaryPlans(new Set());
  }
}

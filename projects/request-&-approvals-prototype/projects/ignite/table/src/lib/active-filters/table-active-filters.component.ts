import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { IgntPillComponent } from '@ignite/common';

import type { IgntTableAppliedFilter } from '../models/ignt-table-filter.model';
import { IgntTableTranslationsDirective } from '../table-translations.directive';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntPillComponent],
  selector: 'ignt-table-active-filters',
  standalone: true,
  styleUrl: './table-active-filters.component.scss',
  templateUrl: './table-active-filters.component.html',
})
export class IgntTableActiveFiltersComponent {
  readonly #translations = inject(IgntTableTranslationsDirective).translations;

  readonly selectedPills = input.required<readonly IgntTableAppliedFilter[]>();

  readonly clearAll = output();
  readonly pillRemoved = output<{ id: string }>();

  protected readonly clearAllLabel = computed(() => this.#translations().clearAllLabel);
  protected readonly hasSelectedPills = computed(() => this.selectedPills().length > 0);

  protected onPillClick(pill: IgntTableAppliedFilter): void {
    if (pill.disabled === true) {
      return;
    }

    this.pillRemoved.emit({ id: pill.id });
  }
}

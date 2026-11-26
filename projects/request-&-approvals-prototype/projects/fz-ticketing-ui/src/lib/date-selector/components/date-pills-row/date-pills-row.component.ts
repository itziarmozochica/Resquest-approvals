import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';

import type { ResolvedFztDateSelectorTranslations } from '../../models/date-selector-translations.model';
import type { FztDatePillsRowVm, FztDatePillVm } from '../../models/date-selector-vm.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent],
  selector: 'fzt-date-pills-row',
  standalone: true,
  styleUrl: './date-pills-row.component.scss',
  templateUrl: './date-pills-row.component.html',
})
export class FztDatePillsRowComponent {
  readonly translations = input.required<ResolvedFztDateSelectorTranslations>();
  readonly vm = input.required<FztDatePillsRowVm>();
  readonly dateSelected = output<string>();
  readonly loadMoreClicked = output();

  protected onPillClick(pill: FztDatePillVm): void {
    if (pill.isDisabled) {
      return;
    }

    this.dateSelected.emit(pill.dateKey);
  }
}

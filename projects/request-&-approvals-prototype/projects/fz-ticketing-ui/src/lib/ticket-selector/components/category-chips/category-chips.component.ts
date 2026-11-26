import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IgntTooltipDirective } from '@ignite/common';

import { FztTooltipGesturesDirective } from '../../directives/tooltip-gestures.directive';
import { FztTruncationDirective } from '../../directives/truncation.directive';
import type { FztCategoryChipVm } from '../../models/party-ticket-column-vm.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FztTooltipGesturesDirective, FztTruncationDirective, IgntTooltipDirective],
  selector: 'fzt-category-chips',
  styleUrl: './category-chips.component.scss',
  templateUrl: './category-chips.component.html',
})
export class FztCategoryChipsComponent {
  readonly vm = input.required<readonly FztCategoryChipVm[]>();
  readonly categorySelected = output<string>();

  protected onChipPressed(chip: FztCategoryChipVm): void {
    if (!chip.isDisabled && !chip.isSelected) {
      this.categorySelected.emit(chip.category);
    }
  }
}

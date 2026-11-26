import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IgntTooltipDirective } from '@ignite/common';

import { FztTooltipGesturesDirective } from '../../directives/tooltip-gestures.directive';
import { FztTruncationDirective } from '../../directives/truncation.directive';
import type { FztExplodeLevelItemVm, FztExplodeLevelRowVm } from '../../models/ticket-selector-vm.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FztTooltipGesturesDirective, FztTruncationDirective, IgntTooltipDirective],
  selector: 'fzt-explode-levels',
  styleUrl: './explode-levels.component.scss',
  templateUrl: './explode-levels.component.html',
})
export class FztExplodeLevelsComponent {
  readonly rows = input.required<readonly FztExplodeLevelRowVm[]>();
  readonly levelSelected = output<readonly string[]>();

  protected selectLevel(item: FztExplodeLevelItemVm): void {
    this.levelSelected.emit(item.path);
  }
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IgntTooltipDirective, type IgntTooltipPlacement } from '@ignite/common';
import { IgntIconComponent, IgntIconName, IgntIconSize, IgntIconVariant } from '@ignite/icon';

const TOOLTIP_MAX_WIDTH = 272;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, IgntTooltipDirective],
  selector: 'app-tooltip-icon',
  standalone: true,
  styleUrl: './tooltip-icon.component.scss',
  templateUrl: './tooltip-icon.component.html',
})
export class TooltipIconComponent {
  readonly tooltip = input.required<string>();
  readonly name = input<IgntIconName>('info-circle');
  readonly placement = input<IgntTooltipPlacement>('top');
  readonly size = input<IgntIconSize>('sm');
  readonly tooltipMaxWidth = input<number>(TOOLTIP_MAX_WIDTH);
  readonly variant = input<IgntIconVariant>('solid');
}

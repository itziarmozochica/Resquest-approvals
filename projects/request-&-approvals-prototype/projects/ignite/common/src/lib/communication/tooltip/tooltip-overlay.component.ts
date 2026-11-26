import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, TemplateRef } from '@angular/core';

import { IgntUUIDDirective } from '../../core/directives/uuid.directive';
import type { IgntTooltipPlacement } from './models/tooltip.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.id]': 'tooltipId',
    '[class.ignt-tooltip--bottom]': 'placement() === "bottom"',
    '[class.ignt-tooltip--left]': 'placement() === "left"',
    '[class.ignt-tooltip--right]': 'placement() === "right"',
    '[style.max-width.px]': 'maxWidth()',
    role: 'tooltip',
  },
  hostDirectives: [IgntUUIDDirective],
  imports: [NgTemplateOutlet],
  selector: 'ignt-tooltip-overlay',
  standalone: true,
  styleUrl: './tooltip-overlay.component.scss',
  templateUrl: './tooltip-overlay.component.html',
})
export class IgntTooltipOverlayComponent {
  label = input<string | null>(null);
  maxWidth = input<number>(256);
  placement = input<IgntTooltipPlacement>('top');
  tooltipTemplate = input<TemplateRef<unknown> | null>(null);

  readonly #uuidDirective = inject(IgntUUIDDirective);
  readonly tooltipId = this.#uuidDirective.uuid;
}

import { Directive, input, InputSignal, Type } from '@angular/core';

import { IgntChartTooltipTrigger } from '../../models/chart-tooltip';

@Directive({
  standalone: true,
})
export class IgntChartTooltipDirective {
  /** Whether to show the tooltip on hover. Default: `true`. */
  showTooltip: InputSignal<boolean> = input<boolean>(true);

  /**
   * Returns the resolved tooltip option for the given trigger, or `{ show: false }` when the tooltip is disabled.
   * Intended to be called inside a `computed()` so signal dependencies are tracked automatically.
   */
  tooltipConfig(trigger: IgntChartTooltipTrigger): { trigger: IgntChartTooltipTrigger } | { show: false } {
    return this.showTooltip() ? { trigger } : { show: false };
  }
}

export function withIgntChartTooltip(): {
  directive: Type<IgntChartTooltipDirective>;
  inputs: string[];
  outputs: string[];
} {
  return {
    directive: IgntChartTooltipDirective,
    inputs: ['showTooltip'],
    outputs: [],
  };
}

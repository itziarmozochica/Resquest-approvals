import { Directive, input, InputSignal, Type } from '@angular/core';

import { IgntChartLegendConfig, IgntChartLegendOption } from '../../models/chart-legend';

@Directive({
  standalone: true,
})
export class IgntChartLegendDirective {
  /** Legend position and margin. */
  legend: InputSignal<IgntChartLegendConfig> = input<IgntChartLegendConfig>({});

  /** Whether to show the legend. Default: `true`. */
  showLegend: InputSignal<boolean> = input<boolean>(true);

  /**
   * Returns the resolved legend option for the given series names, or `undefined` when the legend is disabled.
   * Intended to be called inside a `computed()` so signal dependencies are tracked automatically.
   */
  legendConfig(data: string[]): IgntChartLegendOption | undefined {
    if (!this.showLegend()) return undefined;

    const legendInput = this.legend();
    const margin = legendInput.margin ?? 0;
    const isAtBottom = (legendInput.position ?? 'bottom') === 'bottom';

    return {
      bottom: isAtBottom ? margin : undefined,
      data,
      selectedMode: legendInput.selectedMode,
      top: isAtBottom ? undefined : margin,
      type: 'scroll',
    };
  }
}

export function withIgntChartLegend(): {
  directive: Type<IgntChartLegendDirective>;
  inputs: string[];
  outputs: string[];
} {
  return {
    directive: IgntChartLegendDirective,
    inputs: ['legend', 'showLegend'],
    outputs: [],
  };
}

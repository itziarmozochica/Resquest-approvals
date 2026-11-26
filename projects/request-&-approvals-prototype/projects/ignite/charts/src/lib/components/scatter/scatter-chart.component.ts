import { ChangeDetectionStrategy, Component, computed, inject, input, InputSignal, Signal } from '@angular/core';

import type { EChartsOption, ScatterSeriesOption } from 'echarts';
import { ScatterChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';

import { IgntChartAnimationsDirective, withIgntChartAnimations } from '../../directives/chart-animations/chart-animations.directive';
import { IgntChartColorsDirective, withIgntChartColors } from '../../directives/chart-colors/chart-colors.directive';
import { IgntChartLegendDirective, withIgntChartLegend } from '../../directives/chart-legend/chart-legend.directive';
import { IgntChartTooltipDirective, withIgntChartTooltip } from '../../directives/chart-tooltip/chart-tooltip.directive';
import { IgntScatterChartDataItem } from '../../models/scatter-chart';

echarts.use([ScatterChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

/**
 * Scatter plot for comparing two numeric measures per observation.
 *
 * Shared inputs (animation, colors, legend, tooltip) come from chart host directives
 * (see `directives/chart-*`) via `hostDirectives`. Scatter-specific inputs (`datasetLabel`,
 * `pointSize`, {@link data}) are declared on this class. Default plot margins use
 * {@link IgntScatterChartComponent.defaultGrid}. Point rows use {@link IgntScatterChartDataItem}.
 *
 * @example
 * ```html
 * <ignt-scatter-chart
 *   [datasetLabel]="'REVENUE_VS_COST' | translate"
 *   [data]="[
 *     { x: 10, y: 20, name: 'Point A' },
 *     { x: 15, y: 25, name: 'Point B' },
 *   ]"
 * />
 * ```
 *
 * @see Storybook: Components / Data Visualization / Charts / Scatter
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [withIgntChartAnimations(), withIgntChartColors(), withIgntChartLegend(), withIgntChartTooltip()],
  imports: [NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  selector: 'ignt-scatter-chart',
  standalone: true,
  styleUrl: './scatter-chart.component.scss',
  templateUrl: './scatter-chart.component.html',
})
export class IgntScatterChartComponent {
  /** Default ECharts grid padding for axis labels and legend clearance. */
  static readonly defaultGrid = {
    bottom: 60,
    containLabel: true,
    left: 20,
    right: 20,
    top: 20,
  } as const;

  readonly #chartAnimations = inject(IgntChartAnimationsDirective);
  readonly #chartColors = inject(IgntChartColorsDirective);
  readonly #chartLegend = inject(IgntChartLegendDirective);
  readonly #chartTooltip = inject(IgntChartTooltipDirective);

  /**
   * Human-readable label for the whole point group in the legend (from the app, e.g. i18n).
   * Must match the name list passed into the shared legend helper so toggling stays in sync.
   */
  datasetLabel: InputSignal<string> = input.required<string>();

  /** Observations to plot; each row supplies `x`, `y`, and an optional `name`. */
  data: InputSignal<IgntScatterChartDataItem[]> = input<IgntScatterChartDataItem[]>([]);

  /** Diameter of each marker on the plot, in CSS pixels. */
  pointSize: InputSignal<number> = input<number>(10);

  /**
   * Resolved configuration passed to the chart surface. Treat this as an internal wire
   * format: prefer binding {@link data}, {@link datasetLabel}, and {@link pointSize} instead.
   */
  chartOptions: Signal<EChartsOption> = computed<EChartsOption>(() => {
    const points = this.data();
    const axes = this.#continuousCartesianAxes();

    return {
      animation: this.#chartAnimations.animation(),
      grid: IgntScatterChartComponent.defaultGrid,
      legend: this.#chartLegend.legendConfig([this.datasetLabel()]),
      series: this.#scatterSeriesFromPoints(points),
      tooltip: this.#chartTooltip.tooltipConfig('item'),
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
    };
  });

  #continuousCartesianAxes(): { xAxis: { type: 'value' }; yAxis: { type: 'value' } } {
    return {
      xAxis: { type: 'value' },
      yAxis: { type: 'value' },
    };
  }

  #scatterSeriesFromPoints(points: IgntScatterChartDataItem[]): ScatterSeriesOption[] {
    const emptyLength = 0;
    if (points.length === emptyLength) {
      return [];
    }

    const label = this.datasetLabel();
    const size = this.pointSize();

    return [
      {
        data: points.map((item, index) => ({
          name: item.name ?? String(index + 1),
          value: [item.x, item.y],
        })),
        itemStyle: { color: this.#chartColors.resolveColor(0, 'area') },
        name: label,
        symbolSize: size,
        type: 'scatter',
      },
    ];
  }
}

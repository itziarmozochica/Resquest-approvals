import { ChangeDetectionStrategy, Component, computed, inject, input, InputSignal, Signal } from '@angular/core';

import type { EChartsOption } from 'echarts';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';

import { IgntChartAnimationsDirective, withIgntChartAnimations } from '../../directives/chart-animations/chart-animations.directive';
import { IgntChartColorsDirective, withIgntChartColors } from '../../directives/chart-colors/chart-colors.directive';
import { IgntChartLegendDirective, withIgntChartLegend } from '../../directives/chart-legend/chart-legend.directive';
import { IgntChartTooltipDirective, withIgntChartTooltip } from '../../directives/chart-tooltip/chart-tooltip.directive';
import { IgntBarLineSeries, IgntBarLineXAxisConfig, IgntBarLineYAxes } from '../../models/bar-line-chart';
import { chartGrid } from '../../utils/chart-grid.util';

echarts.use([BarChart, LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

/**
 * Bar and line combination chart for visualizing categorical data with one or two Y-axes.
 *
 * Shared inputs (animation, legend, tooltip) are provided by chart host directives
 * (see `directives/chart-*`) via `hostDirectives` and are not declared in this class.
 *
 * @example
 * <ignt-bar-line-chart
 *   [series]="[{ name: 'Sales', type: 'bar', data: [150, 230] }, { name: 'Trend', type: 'line', data: [140, 200] }]"
 *   [xAxisData]="['Mon', 'Tue']"
 * />
 *
 * @see Storybook: Components / Data Visualization / Charts / Bar Line
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [withIgntChartAnimations(), withIgntChartColors(), withIgntChartLegend(), withIgntChartTooltip()],
  imports: [NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  selector: 'ignt-bar-line-chart',
  standalone: true,
  styleUrl: './bar-line-chart.component.scss',
  templateUrl: './bar-line-chart.component.html',
})
export class IgntBarLineChartComponent {
  static readonly BAR_OPACITY_WHEN_MIXED = 0.4;

  readonly #chartAnimations = inject(IgntChartAnimationsDirective);
  readonly #chartColors = inject(IgntChartColorsDirective);
  readonly #chartLegend = inject(IgntChartLegendDirective);
  readonly #chartTooltip = inject(IgntChartTooltipDirective);

  /** Bar and/or line series to render. Colors are auto-assigned from the design system palette. See {@link IgntBarLineSeries}. */
  readonly series: InputSignal<IgntBarLineSeries[]> = input<IgntBarLineSeries[]>([]);

  /** Whether line series draw a dot at each data point. Turn it off when the points crowd the line. Bar series are unaffected. Defaults to `true`. */
  readonly showSymbol: InputSignal<boolean> = input<boolean>(true);

  /** Optional X-axis configuration: label name and rotation angle. See {@link IgntBarLineXAxisConfig}. */
  readonly xAxisConfig: InputSignal<IgntBarLineXAxisConfig | undefined> = input<IgntBarLineXAxisConfig | undefined>();

  /** Category labels displayed on the X-axis, in the same order as each series `data` array. */
  readonly xAxisData: InputSignal<string[]> = input<string[]>([]);

  /** One or two Y-axes. Use two for dual-axis charts (e.g. revenue + growth rate). Defaults to a single left axis. See {@link IgntBarLineYAxes}. */
  readonly yAxes: InputSignal<IgntBarLineYAxes> = input<IgntBarLineYAxes>([{ position: 'left' }]);

  static readonly X_AXIS_LABEL_MAX_WIDTH = 90;

  static readonly Y_AXIS_NAME_GAP = 44;

  readonly chartOptions: Signal<EChartsOption> = computed<EChartsOption>(() => {
    const isLegendAtBottom = (this.#chartLegend.legend().position ?? 'bottom') === 'bottom';
    const rotate = this.xAxisConfig()?.rotate ?? 0;
    // Push the centered axis title below rotated labels so it never overlaps them:
    // a label truncated to X_AXIS_LABEL_MAX_WIDTH projects sin(rotate) * width downwards.
    const nameGap = 28 + Math.round(Math.abs(Math.sin((rotate * Math.PI) / 180)) * IgntBarLineChartComponent.X_AXIS_LABEL_MAX_WIDTH);

    return {
      animation: this.#chartAnimations.animation(),
      grid: chartGrid({ isLegendAtBottom, showLegend: this.#chartLegend.showLegend() }),
      legend: this.#chartLegend.legendConfig(this.series().map(serie => serie.name)),
      series: this.#buildSeriesData(this.series()),
      tooltip: this.#chartTooltip.tooltipConfig('axis'),
      xAxis: {
        axisLabel: {
          hideOverlap: true,
          overflow: 'truncate',
          rotate,
          width: IgntBarLineChartComponent.X_AXIS_LABEL_MAX_WIDTH,
        },
        boundaryGap: true,
        data: this.xAxisData(),
        name: this.xAxisConfig()?.name,
        nameGap,
        nameLocation: 'middle',
        type: 'category',
      },
      yAxis: this.yAxes().map(axis => ({
        max: axis.max,
        min: axis.min,
        name: axis.name,
        nameGap: IgntBarLineChartComponent.Y_AXIS_NAME_GAP,
        nameLocation: 'middle',
        position: axis.position ?? 'left',
        type: 'value',
      })),
    };
  });

  #buildSeriesData(series: IgntBarLineSeries[]): EChartsOption['series'] {
    const total = series.length;
    const hasMixedTypes = series.some(serie => serie.type === 'bar') && series.some(serie => serie.type === 'line');

    return series.map((serie, index) => {
      const color = this.#chartColors.resolveSeriesColor(index, total, serie.type);
      const shouldApplyOpacity = hasMixedTypes && serie.type === 'bar';

      return {
        data: serie.data,
        itemStyle: { color, opacity: shouldApplyOpacity ? IgntBarLineChartComponent.BAR_OPACITY_WHEN_MIXED : undefined },
        lineStyle: { color },
        name: serie.name,
        showSymbol: serie.type === 'line' ? this.showSymbol() : undefined,
        smooth: serie.type === 'line' ? (serie.smooth ?? false) : undefined,
        type: serie.type,
        yAxisIndex: serie.yAxisIndex ?? 0,
      };
    });
  }
}

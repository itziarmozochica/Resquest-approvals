import { ChangeDetectionStrategy, Component, computed, inject, input, InputSignal, Signal } from '@angular/core';

import type { EChartsOption, LineSeriesOption } from 'echarts';
import { LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';

import { IgntChartAnimationsDirective, withIgntChartAnimations } from '../../directives/chart-animations/chart-animations.directive';
import { IgntChartColorsDirective, withIgntChartColors } from '../../directives/chart-colors/chart-colors.directive';
import { IgntChartLegendDirective, withIgntChartLegend } from '../../directives/chart-legend/chart-legend.directive';
import { IgntChartTooltipDirective, withIgntChartTooltip } from '../../directives/chart-tooltip/chart-tooltip.directive';
import { IgntAreaSeries } from '../../models/area-chart';
import { chartGrid } from '../../utils/chart-grid.util';

echarts.use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

/**
 * Area chart component for visualizing trends over categories.
 *
 * Shared inputs (animation, legend, tooltip) and the color palette are provided by chart
 * host directives (see `directives/ignt-chart-*`) via `hostDirectives` and are not declared
 * in this class.
 *
 * @example
 * <ignt-area-chart
 *   [categories]="['Mon', 'Tue', 'Wed']"
 *   [series]="[{ name: 'Series', data: [820, 932, 901] }]"
 * />
 *
 * @see Storybook: Components / Data Visualization / Area Chart
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [withIgntChartAnimations(), withIgntChartColors(), withIgntChartLegend(), withIgntChartTooltip()],
  imports: [NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  selector: 'ignt-area-chart',
  standalone: true,
  styleUrl: './area-chart.component.scss',
  templateUrl: './area-chart.component.html',
})
export class IgntAreaChartComponent {
  readonly #chartAnimations = inject(IgntChartAnimationsDirective);
  readonly #chartColors = inject(IgntChartColorsDirective);
  readonly #chartLegend = inject(IgntChartLegendDirective);
  readonly #chartTooltip = inject(IgntChartTooltipDirective);

  /** Category labels for the x-axis. */
  categories: InputSignal<string[]> = input<string[]>([]);

  /** Data series to display. See {@link IgntAreaSeries}. */
  series: InputSignal<IgntAreaSeries[]> = input<IgntAreaSeries[]>([]);

  /** Resolved chart options consumed by the underlying rendering library. */
  chartOptions: Signal<EChartsOption> = computed<EChartsOption>(() => {
    const categories = this.categories();
    const series = this.series();
    const isLegendAtBottom = (this.#chartLegend.legend().position ?? 'bottom') === 'bottom';

    return {
      animation: this.#chartAnimations.animation(),
      grid: chartGrid({ isLegendAtBottom, showLegend: this.#chartLegend.showLegend() }),
      legend: this.#chartLegend.legendConfig(series.map(seriesItem => seriesItem.name)),
      series: this.#buildSeries(series),
      tooltip: this.#chartTooltip.tooltipConfig('axis'),
      xAxis: {
        boundaryGap: false,
        data: categories,
        type: 'category',
      },
      yAxis: {
        type: 'value',
      },
    };
  });

  #buildSeries(series: IgntAreaSeries[]): LineSeriesOption[] {
    const total = series.length;

    return series.map((serie, index) => {
      const lineColor = this.#chartColors.resolveSeriesColor(index, total, 'line');
      const areaColor = this.#chartColors.resolveSeriesColor(index, total, 'area');

      return {
        areaStyle: { color: areaColor },
        data: serie.data,
        itemStyle: { color: lineColor },
        lineStyle: { color: lineColor },
        name: serie.name,
        type: 'line',
      };
    });
  }
}

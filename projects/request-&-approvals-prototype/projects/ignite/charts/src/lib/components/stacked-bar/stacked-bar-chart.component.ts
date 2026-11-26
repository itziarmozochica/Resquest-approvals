import { ChangeDetectionStrategy, Component, computed, inject, input, InputSignal, Signal } from '@angular/core';

import type { BarSeriesOption, EChartsOption } from 'echarts';
import { BarChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';

import { IgntChartAnimationsDirective, withIgntChartAnimations } from '../../directives/chart-animations/chart-animations.directive';
import { IgntChartColorsDirective, withIgntChartColors } from '../../directives/chart-colors/chart-colors.directive';
import { IgntChartLegendDirective, withIgntChartLegend } from '../../directives/chart-legend/chart-legend.directive';
import { IgntChartTooltipDirective, withIgntChartTooltip } from '../../directives/chart-tooltip/chart-tooltip.directive';
import { IgntStackedBarChartSeries } from '../../models/stacked-bar-chart';

echarts.use([BarChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

const barWidth = '60%';
const barGrid = { bottom: 60, left: 80, right: 80, top: 60 } as const;

/**
 * Stacked bar chart component for comparing categorical data across multiple series.
 *
 * Supports normalization (100% stacked) and horizontal orientation.
 * Shared inputs are provided by chart host directives (see `directives/ignt-chart-*`)
 * via `hostDirectives` and are not declared in this class.
 *
 * @example
 * <ignt-stacked-bar-chart
 *   [categories]="['Mon', 'Tue', 'Wed']"
 *   [series]="[{ name: 'Series A', data: [100, 200, 300] }]"
 *   [normalized]="true"
 *   [showLabels]="true"
 * />
 *
 * @see Storybook: Components / Data Visualization / Stacked Bar Chart
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [withIgntChartAnimations(), withIgntChartColors(), withIgntChartLegend(), withIgntChartTooltip()],
  imports: [NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  selector: 'ignt-stacked-bar-chart',
  standalone: true,
  styleUrl: './stacked-bar-chart.component.scss',
  templateUrl: './stacked-bar-chart.component.html',
})
export class IgntStackedBarChartComponent {
  readonly #chartAnimations = inject(IgntChartAnimationsDirective);
  readonly #chartColors = inject(IgntChartColorsDirective);
  readonly #chartLegend = inject(IgntChartLegendDirective);
  readonly #chartTooltip = inject(IgntChartTooltipDirective);

  /** Default stack identifier when not specified. */
  readonly #defaultStack = 'total';

  /** Category labels for the axis. */
  categories: InputSignal<string[]> = input<string[]>([]);

  /** Whether to normalize data to 100% (percentage stacked). */
  normalized: InputSignal<boolean> = input<boolean>(false);

  /** Chart orientation. */
  orientation: InputSignal<'vertical' | 'horizontal'> = input<'vertical' | 'horizontal'>('vertical');

  /** Data series to display. See {@link IgntStackedBarChartSeries}. */
  series: InputSignal<IgntStackedBarChartSeries[]> = input<IgntStackedBarChartSeries[]>([]);

  /** Whether to show value/percentage labels on bars. */
  showLabels: InputSignal<boolean> = input<boolean>(false);

  chartOptions: Signal<EChartsOption> = computed<EChartsOption>(() => {
    const isVertical = this.orientation() === 'vertical';
    const normalized = this.normalized();

    const categoryAxis = { data: this.categories(), type: 'category' as const };
    const valueAxis = { type: 'value' as const };

    const baseTooltip = this.#chartTooltip.tooltipConfig('axis');
    const tooltip =
      'trigger' in baseTooltip
        ? {
            ...baseTooltip,
            order: 'valueDesc' as const,
            ...(normalized && {
              valueFormatter: (value: unknown) => {
                if (typeof value === 'number') {
                  return `${Math.round(value * 1000) / 10}%`;
                }
                return typeof value === 'string' ? value : '';
              },
            }),
          }
        : baseTooltip;

    return {
      animation: this.#chartAnimations.animation(),
      grid: barGrid,
      legend: this.#chartLegend.legendConfig(this.series().map(serie => serie.name)),
      series: this.#buildSeries(),
      tooltip,
      xAxis: isVertical ? categoryAxis : valueAxis,
      yAxis: isVertical ? valueAxis : categoryAxis,
    };
  });

  #buildSeries(): BarSeriesOption[] {
    const seriesData = this.series();
    const normalized = this.normalized();
    const showLabels = this.showLabels();

    const stackTotals = normalized ? this.#computeStackTotals(seriesData) : new Map<string, number[]>();

    return seriesData.map((serie, seriesIndex) => {
      const stack = serie.stack ?? this.#defaultStack;
      const totals = stackTotals.get(stack) ?? [];

      const data = serie.data.map((value, categoryIndex) => {
        const numValue = this.#toNumber(value);
        return normalized && totals[categoryIndex] > 0 ? numValue / totals[categoryIndex] : numValue;
      });

      return {
        barWidth,
        data,
        itemStyle: { color: this.#chartColors.resolveColor(seriesIndex, 'area') },
        label: showLabels
          ? {
              show: true,
              formatter: (params: { value?: unknown }) => {
                const value = typeof params.value === 'number' ? params.value : null;
                return normalized && value !== null ? `${Math.round(value * 1000) / 10}%` : String(value ?? '');
              },
            }
          : undefined,
        name: serie.name,
        stack,
        type: 'bar',
      } as BarSeriesOption;
    });
  }

  #computeStackTotals(seriesData: IgntStackedBarChartSeries[]): Map<string, number[]> {
    const stackTotals = new Map<string, number[]>();

    if (seriesData.length === 0) return stackTotals;

    const categoryCount = seriesData[0].data.length;

    for (const serie of seriesData) {
      const stack = serie.stack ?? this.#defaultStack;

      let totals = stackTotals.get(stack);
      if (totals === undefined) {
        totals = new Array<number>(categoryCount).fill(0);
        stackTotals.set(stack, totals);
      }

      for (let index = 0; index < serie.data.length; index += 1) {
        totals[index] += this.#toNumber(serie.data[index]);
      }
    }

    return stackTotals;
  }

  #toNumber(value: number | null): number {
    return value ?? 0;
  }
}

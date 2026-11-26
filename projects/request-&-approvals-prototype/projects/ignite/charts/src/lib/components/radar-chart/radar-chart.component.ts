import { ChangeDetectionStrategy, Component, computed, inject, input, InputSignal, Signal } from '@angular/core';

import type { EChartsOption } from 'echarts';
import { RadarChart } from 'echarts/charts';
import { GridComponent, LegendComponent, RadarComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';

import { IgntChartAnimationsDirective, withIgntChartAnimations } from '../../directives/chart-animations/chart-animations.directive';
import { IgntChartColorsDirective, withIgntChartColors } from '../../directives/chart-colors/chart-colors.directive';
import { IgntChartLegendDirective, withIgntChartLegend } from '../../directives/chart-legend/chart-legend.directive';
import { IgntChartTooltipDirective, withIgntChartTooltip } from '../../directives/chart-tooltip/chart-tooltip.directive';
import { IgntRadarConfig, IgntRadarIndicator, IgntRadarSeries, IgntRadarSeriesDataItem } from '../../models/radar-chart';

echarts.use([RadarChart, GridComponent, LegendComponent, RadarComponent, TooltipComponent, CanvasRenderer]);

/**
 * Radar chart component for comparing multiple variables across one or more data series.
 *
 * Shared inputs (animation, legend, tooltip) are provided by chart host directives
 * (see `directives/chart-*`) via `hostDirectives` and are not declared in this class.
 *
 * @example
 * <ignt-radar-chart
 *   [indicators]="[{ name: 'Attack', max: 100 }, { name: 'Defense', max: 100 }]"
 *   [series]="[{ name: 'Player 1', data: [80, 70] }]"
 * />
 *
 * @see Storybook: Components / Data Visualization / Charts / Radar
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [withIgntChartAnimations(), withIgntChartColors(), withIgntChartLegend(), withIgntChartTooltip()],
  imports: [NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  selector: 'ignt-radar-chart',
  standalone: true,
  styleUrl: './radar-chart.component.scss',
  templateUrl: './radar-chart.component.html',
})
export class IgntRadarChartComponent {
  readonly #chartAnimations = inject(IgntChartAnimationsDirective);
  readonly #chartColors = inject(IgntChartColorsDirective);
  readonly #chartLegend = inject(IgntChartLegendDirective);
  readonly #chartTooltip = inject(IgntChartTooltipDirective);

  /** Opacity of the filled area (0–1). Use `0` to show only the outline. Default: `0.4`. */
  areaOpacity: InputSignal<number> = input<number>(0.4);

  /** Axis dimensions (e.g. "Attack", "Speed"). Each series `data` array must match this length. See {@link IgntRadarIndicator}. */
  indicators: InputSignal<IgntRadarIndicator[]> = input<IgntRadarIndicator[]>([]);

  /** Grid layout: shape (polygon/circle), radius, center, splitNumber, startAngle. See {@link IgntRadarConfig}. */
  radarConfig: InputSignal<IgntRadarConfig> = input<IgntRadarConfig>({});

  /** Data series to display. Each item is one polygon; `data` length must equal `indicators` length. See {@link IgntRadarSeries}. */
  series: InputSignal<IgntRadarSeries[]> = input<IgntRadarSeries[]>([]);

  /** Whether to show symbols (dots) at each data point. Default: `true`. */
  showSymbol: InputSignal<boolean> = input<boolean>(true);

  chartOptions: Signal<EChartsOption> = computed<EChartsOption>(() => {
    const config = this.radarConfig();

    return {
      animation: this.#chartAnimations.animation(),
      legend: this.#chartLegend.legendConfig(this.series().map(serie => serie.name)),
      radar: {
        center: config.center ?? ['50%', '50%'],
        indicator: this.indicators().map(indicator => ({
          max: indicator.max,
          name: indicator.name,
        })),
        radius: config.radius ?? '75%',
        shape: config.shape ?? 'polygon',
        splitNumber: config.splitNumber ?? 5,
        startAngle: config.startAngle ?? 90,
      },
      series: [
        {
          data: this.#buildSeriesData(this.series(), this.areaOpacity()),
          symbol: this.showSymbol() ? 'circle' : 'none',
          type: 'radar',
        },
      ],
      tooltip: this.#chartTooltip.tooltipConfig('item'),
    };
  });

  #buildSeriesData(series: IgntRadarSeries[], areaOpacity: number): IgntRadarSeriesDataItem[] {
    const useSinglePairColors = series.length === 1;

    return series.map((serie, index) => {
      const colorIndex = useSinglePairColors ? 0 : index + 1;
      const lineColor = this.#chartColors.resolveColor(colorIndex, 'line');
      const areaColor = this.#chartColors.resolveColor(colorIndex, 'area');

      return {
        areaStyle: areaOpacity > 0 ? { color: areaColor, opacity: areaOpacity } : undefined,
        itemStyle: { color: lineColor },
        lineStyle: { color: lineColor, width: serie.lineWidth },
        name: serie.name,
        value: serie.data,
      };
    });
  }
}

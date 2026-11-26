import { ChangeDetectionStrategy, Component, computed, inject, input, InputSignal, Signal } from '@angular/core';

import type { EChartsOption, PieSeriesOption } from 'echarts';
import { PieChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';

import { IgntChartAnimationsDirective, withIgntChartAnimations } from '../../directives/chart-animations/chart-animations.directive';
import { IgntChartColorsDirective, withIgntChartColors } from '../../directives/chart-colors/chart-colors.directive';
import { IgntChartLegendDirective, withIgntChartLegend } from '../../directives/chart-legend/chart-legend.directive';
import {
  IgntChartRadialRadiusDirective,
  withIgntChartRadialRadius,
} from '../../directives/chart-radial-radius/chart-radial-radius.directive';
import { IGNT_CHART_RADIAL_RADIUS_DEFAULT } from '../../directives/chart-radial-radius/chart-radial-radius.token';
import { IgntChartTooltipDirective, withIgntChartTooltip } from '../../directives/chart-tooltip/chart-tooltip.directive';
import type { IgntDoughnutChartDataItem } from '../../models/doughnut-chart';

echarts.use([PieChart, LegendComponent, TooltipComponent, CanvasRenderer]);

/**
 * Proportional doughnut (ring). `radius` matches {@link IgntPieChartComponent}; default ring {@link IgntDoughnutChartComponent.defaultRingRadius}.
 *
 * @example
 * <ignt-doughnut-chart [data]="[{ name: 'A', value: 40 }, { name: 'B', value: 60 }]" />
 *
 * @example
 * <ignt-doughnut-chart [data]="data" [radius]="[25, 75]" />
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    withIgntChartAnimations(),
    withIgntChartColors(),
    withIgntChartLegend(),
    withIgntChartRadialRadius(),
    withIgntChartTooltip(),
  ],
  imports: [NgxEchartsDirective],
  providers: [
    { provide: IGNT_CHART_RADIAL_RADIUS_DEFAULT, useValue: IgntDoughnutChartComponent.defaultRingRadius },
    provideEchartsCore({ echarts }),
  ],
  selector: 'ignt-doughnut-chart',
  standalone: true,
  styleUrl: './doughnut-chart.component.scss',
  templateUrl: './doughnut-chart.component.html',
})
export class IgntDoughnutChartComponent {
  /** Default inner/outer ring as percent of chart area when `radius` is unset. */
  static readonly defaultRingRadius: [number, number] = [40, 70];

  readonly #chartAnimations = inject(IgntChartAnimationsDirective);
  readonly #chartColors = inject(IgntChartColorsDirective);
  readonly #chartLegend = inject(IgntChartLegendDirective);
  readonly #chartRadialRadius = inject(IgntChartRadialRadiusDirective);
  readonly #chartTooltip = inject(IgntChartTooltipDirective);

  data: InputSignal<IgntDoughnutChartDataItem[]> = input<IgntDoughnutChartDataItem[]>([]);

  chartOptions: Signal<EChartsOption> = computed<EChartsOption>(() => {
    const data = this.data();

    return {
      animation: this.#chartAnimations.animation(),
      legend: this.#chartLegend.legendConfig(data.map(item => item.name)),
      series: this.#buildSeries(data),
      tooltip: this.#chartTooltip.tooltipConfig('item'),
    };
  });

  #buildSeries(data: IgntDoughnutChartDataItem[]): PieSeriesOption[] {
    const emptyDataLength = 0;
    if (data.length === emptyDataLength) {
      return [];
    }

    return [
      {
        data: data.map((item, index) => ({
          itemStyle: { color: this.#chartColors.resolveColor(index, 'bar') },
          name: item.name,
          value: item.value,
        })),
        radius: this.#chartRadialRadius.radialExtent(),
        type: 'pie',
      },
    ];
  }
}

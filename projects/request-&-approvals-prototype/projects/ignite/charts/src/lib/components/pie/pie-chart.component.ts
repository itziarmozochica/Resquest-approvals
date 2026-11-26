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
import { IgntChartTooltipDirective, withIgntChartTooltip } from '../../directives/chart-tooltip/chart-tooltip.directive';
import { IgntPieChartDataItem } from '../../models/pie-chart';

echarts.use([PieChart, LegendComponent, TooltipComponent, CanvasRenderer]);

/**
 * Proportional pie or ring. `radius`: one number (full disc, default {@link IgntChartRadialRadiusDirective.defaultRadius}) or `[inner, outer]` percents of chart area ({@link IgntChartRadialRadiusDirective}).
 *
 * @example
 * <ignt-pie-chart [data]="[{ name: 'A', value: 40 }, { name: 'B', value: 60 }]" />
 *
 * @example
 * <ignt-pie-chart [data]="data" [radius]="[40, 70]" />
 *
 * @example
 * <ignt-pie-chart [data]="data" [radius]="55" />
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
  providers: [provideEchartsCore({ echarts })],
  selector: 'ignt-pie-chart',
  standalone: true,
  styleUrl: './pie-chart.component.scss',
  templateUrl: './pie-chart.component.html',
})
export class IgntPieChartComponent {
  readonly #chartAnimations = inject(IgntChartAnimationsDirective);
  readonly #chartColors = inject(IgntChartColorsDirective);
  readonly #chartLegend = inject(IgntChartLegendDirective);
  readonly #chartRadialRadius = inject(IgntChartRadialRadiusDirective);
  readonly #chartTooltip = inject(IgntChartTooltipDirective);

  data: InputSignal<IgntPieChartDataItem[]> = input<IgntPieChartDataItem[]>([]);

  chartOptions: Signal<EChartsOption> = computed<EChartsOption>(() => {
    const data = this.data();

    return {
      animation: this.#chartAnimations.animation(),
      legend: this.#chartLegend.legendConfig(data.map(item => item.name)),
      series: this.#buildSeries(data),
      tooltip: this.#chartTooltip.tooltipConfig('item'),
    };
  });

  #buildSeries(data: IgntPieChartDataItem[]): PieSeriesOption[] {
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

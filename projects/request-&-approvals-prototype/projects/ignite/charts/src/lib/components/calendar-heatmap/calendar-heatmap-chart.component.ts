import { ChangeDetectionStrategy, Component, computed, inject, input, InputSignal, Signal } from '@angular/core';

import type { EChartsOption } from 'echarts';
import { HeatmapChart } from 'echarts/charts';
import { CalendarComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';

import { IgntChartAnimationsDirective, withIgntChartAnimations } from '../../directives/chart-animations/chart-animations.directive';
import { IgntChartColorsDirective, withIgntChartColors } from '../../directives/chart-colors/chart-colors.directive';
import { IgntChartTooltipDirective, withIgntChartTooltip } from '../../directives/chart-tooltip/chart-tooltip.directive';
import {
  IgntCalendarHeatmapCalendarConfig,
  IgntCalendarHeatmapData,
  IgntCalendarHeatmapVisualMapConfig,
} from '../../models/calendar-heatmap-chart';

echarts.use([HeatmapChart, CalendarComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);

/**
 * Calendar heatmap chart component for visualizing time-series data across a calendar year.
 *
 * Shared inputs (animation, tooltip) are provided by chart host directives
 * (see `directives/chart-*`) via `hostDirectives` and are not declared in this class.
 *
 * @example
 * <ignt-calendar-heatmap-chart
 *   [calendarConfig]="{ range: '2017' }"
 *   [data]="[['2017-01-01', 100], ['2017-01-02', 200]]"
 * />
 *
 * @see Storybook: Components / Data Visualization / Charts / Calendar Heatmap
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [withIgntChartAnimations(), withIgntChartColors(), withIgntChartTooltip()],
  imports: [NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  selector: 'ignt-calendar-heatmap-chart',
  standalone: true,
  styleUrl: './calendar-heatmap-chart.component.scss',
  templateUrl: './calendar-heatmap-chart.component.html',
})
export class IgntCalendarHeatmapChartComponent {
  readonly #heatmapOpacities: number[] = [0.2, 0.6, 1.0];

  readonly #chartAnimations = inject(IgntChartAnimationsDirective);
  readonly #chartColors = inject(IgntChartColorsDirective);
  readonly #chartTooltip = inject(IgntChartTooltipDirective);

  /** Calendar configuration including date range and layout options. See {@link IgntCalendarHeatmapCalendarConfig}. */
  calendarConfig: InputSignal<IgntCalendarHeatmapCalendarConfig> = input<IgntCalendarHeatmapCalendarConfig>({
    range: new Date().getFullYear().toString(),
  });

  /** Heatmap data as `[date, value]` tuples. Date format: `YYYY-MM-DD`. See {@link IgntCalendarHeatmapData}. */
  data: InputSignal<IgntCalendarHeatmapData> = input<IgntCalendarHeatmapData>([]);

  /** Default cell size in pixels for square cells. */
  defaultCellSize: InputSignal<number> = input<number>(13);

  /** VisualMap configuration for color gradient min/max and visibility. See {@link IgntCalendarHeatmapVisualMapConfig}. */
  visualMapConfig: InputSignal<IgntCalendarHeatmapVisualMapConfig> = input<IgntCalendarHeatmapVisualMapConfig>({});

  /** Weekday labels array starting from Sunday. Allows i18n customization. */
  weekdayLabels: InputSignal<string[]> = input<string[]>(['S', 'M', 'T', 'W', 'T', 'F', 'S']);

  chartOptions: Signal<EChartsOption> = computed<EChartsOption>(() => {
    const config = this.calendarConfig();
    const visualConfig = this.visualMapConfig();
    const dataValues = this.data().map(item => item[1]);
    const derivedMin = dataValues.length > 0 ? Math.min(...dataValues) : 0;
    const derivedMax = dataValues.length > 0 ? Math.max(...dataValues) : 0;
    const showDayLabel = config.showDayLabel ?? true;
    const cellSize = config.cellSize ?? this.defaultCellSize();
    const gradientColors = this.#chartColors.resolveGradientColors(0, 'area', this.#heatmapOpacities);

    return {
      animation: this.#chartAnimations.animation(),
      calendar: {
        cellSize: [cellSize, cellSize],
        dayLabel: showDayLabel
          ? {
              firstDay: 0,
              nameMap: [...this.weekdayLabels()],
            }
          : { show: false },
        left: 'center',
        range: config.range,
        top: config.top ?? 70,
      },
      series: [
        {
          coordinateSystem: 'calendar',
          data: this.data(),
          type: 'heatmap',
        },
      ],
      tooltip: this.#chartTooltip.tooltipConfig('item'),
      visualMap: {
        inRange: {
          color: gradientColors,
        },
        max: visualConfig.max ?? derivedMax,
        min: visualConfig.min ?? derivedMin,
        show: visualConfig.show ?? true,
      },
    };
  });
}

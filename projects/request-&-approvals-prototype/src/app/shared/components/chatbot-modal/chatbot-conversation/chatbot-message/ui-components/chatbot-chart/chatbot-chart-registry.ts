import { Type } from '@angular/core';

import { ChatbotChartConfig } from '../../../../../../models/chatbot/chatbot.model';
import {
  areaChartAdapter,
  barChartAdapter,
  calendarHeatmapChartAdapter,
  lineChartAdapter,
  radarChartAdapter,
  stackedBarChartAdapter,
} from './chatbot-chart.adapters';

export type ChartInputMapper = (config: ChatbotChartConfig) => Record<string, unknown>;

export type ChartComponentLoader = () => Promise<Type<unknown>>;

export interface ChartRegistryEntry {
  loadComponent: ChartComponentLoader;
  mapInputs: ChartInputMapper;
}

const loadAreaChart: ChartComponentLoader = () =>
  import('../../../../../../../../../projects/ignite/charts/src/lib/components/area/area-chart.component').then(
    m => m.IgntAreaChartComponent,
  );

const loadBarLineChart: ChartComponentLoader = () =>
  import('../../../../../../../../../projects/ignite/charts/src/lib/components/bar-line/bar-line-chart.component').then(
    m => m.IgntBarLineChartComponent,
  );

const areaChartEntry: ChartRegistryEntry = {
  loadComponent: loadAreaChart,
  mapInputs: areaChartAdapter,
};

export const CHART_REGISTRY: Record<string, ChartRegistryEntry> = {
  area: areaChartEntry,
  area_line: areaChartEntry,
  bar: {
    loadComponent: loadBarLineChart,
    mapInputs: barChartAdapter,
  },
  'calendar-heatmap': {
    mapInputs: calendarHeatmapChartAdapter,
    loadComponent: () =>
      import('../../../../../../../../../projects/ignite/charts/src/lib/components/calendar-heatmap/calendar-heatmap-chart.component').then(
        m => m.IgntCalendarHeatmapChartComponent,
      ),
  },
  line: {
    loadComponent: loadBarLineChart,
    mapInputs: lineChartAdapter,
  },
  radar: {
    mapInputs: radarChartAdapter,
    loadComponent: () =>
      import('../../../../../../../../../projects/ignite/charts/src/lib/components/radar-chart/radar-chart.component').then(
        m => m.IgntRadarChartComponent,
      ),
  },
  stacked_bar: {
    mapInputs: stackedBarChartAdapter,
    loadComponent: () =>
      import('../../../../../../../../../projects/ignite/charts/src/lib/components/stacked-bar/stacked-bar-chart.component').then(
        m => m.IgntStackedBarChartComponent,
      ),
  },
};

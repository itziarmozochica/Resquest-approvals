import { ChatbotChartConfig } from '@fz-original/app/shared/models/chatbot/chatbot.model';
import type { IgntAreaSeries, IgntRadarIndicator, IgntStackedBarChartSeries } from '@ignite/charts';

import { StackedBarApiLegend, StackedBarApiSeries, StackedBarApiXAxis } from './chatbot-chart.models';

export function areaChartAdapter(config: ChatbotChartConfig): Record<string, unknown> {
  const xAxis = resolveXAxis(config);
  const categories = xAxis?.data ?? (config.data.xAxisData as string[] | undefined) ?? [];
  const rawSeries = (config.data.series as StackedBarApiSeries[] | undefined) ?? [];

  const series: IgntAreaSeries[] = rawSeries.map(s => ({
    data: Array.isArray(s.data) ? s.data : [],
    name: typeof s.name === 'string' ? s.name : '',
  }));

  return {
    categories,
    series,
    showTooltip: true,
  };
}

export function barChartAdapter(config: ChatbotChartConfig): Record<string, unknown> {
  const xAxis = resolveXAxis(config);
  const xAxisData = xAxis?.data ?? (config.data.xAxisData as string[] | undefined) ?? [];
  const xAxisConfig = xAxis?.name !== undefined ? { name: xAxis.name } : undefined;

  return {
    series: config.data.series,
    showTooltip: true,
    ...(xAxisConfig !== undefined && { xAxisConfig }),
    xAxisData,
  };
}

export function calendarHeatmapChartAdapter(config: ChatbotChartConfig): Record<string, unknown> {
  return {
    calendarConfig: config.data.calendarConfig,
    data: config.data.data,
    visualMapConfig: config.data.visualMapConfig,
  };
}

export function lineChartAdapter(config: ChatbotChartConfig): Record<string, unknown> {
  const xAxis = resolveXAxis(config);
  const xAxisData = xAxis?.data ?? (config.data.xAxisData as string[] | undefined) ?? [];
  const xAxisConfig = xAxis?.name !== undefined ? { name: xAxis.name } : undefined;

  return {
    series: config.data.series,
    showTooltip: true,
    ...(xAxisConfig !== undefined && { xAxisConfig }),
    xAxisData,
  };
}

export function radarChartAdapter(config: ChatbotChartConfig): Record<string, unknown> {
  return {
    areaOpacity: (config.data.areaOpacity as number | undefined) ?? 0.4,
    indicators: (config.data['radar'] as { indicator?: IgntRadarIndicator[] } | undefined)?.indicator ?? [],
    legend: {
      margin: -10,
    },
    series: config.data.series,
  };
}

export function stackedBarChartAdapter(config: ChatbotChartConfig): Record<string, unknown> {
  const xAxis = config.data.xAxis as StackedBarApiXAxis | undefined;
  const categories = xAxis?.data ?? [];
  const rawSeries = (config.data.series as StackedBarApiSeries[] | undefined) ?? [];
  const apiLegend = config.data.legend as StackedBarApiLegend | undefined;

  const series: IgntStackedBarChartSeries[] = rawSeries.map(s => ({
    data: Array.isArray(s.data) ? s.data : [],
    name: typeof s.name === 'string' ? s.name : '',
    ...(s.stack !== undefined && { stack: s.stack }),
  }));

  const showLabels = rawSeries.some(s => (s as { label?: { show?: boolean } }).label?.show === true);
  const showLegend = apiLegend?.show ?? true;

  const legendSelectedMode = mapLegendSelectedMode(apiLegend?.selectedMode);
  const legend = {
    position: apiLegend?.top ?? 'bottom',
    ...(legendSelectedMode !== undefined && { selectedMode: legendSelectedMode }),
  };

  return {
    categories,
    legend,
    series,
    showLabels,
    showLegend,
    tooltipMaxWidth: '20rem',
  };
}

function resolveXAxis(config: ChatbotChartConfig): StackedBarApiXAxis | undefined {
  const raw = config.data.xAxis;
  if (Array.isArray(raw)) {
    return isStackedBarApiXAxis(raw[0]) ? raw[0] : undefined;
  }
  return isStackedBarApiXAxis(raw) ? raw : undefined;
}

function isStackedBarApiXAxis(value: unknown): value is StackedBarApiXAxis {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mapLegendSelectedMode(mode: boolean | 'single' | 'multiple' | undefined): 'multiple' | 'single' | undefined {
  if (mode === true || mode === 'multiple') return 'multiple';
  return mode === 'single' ? 'single' : undefined;
}

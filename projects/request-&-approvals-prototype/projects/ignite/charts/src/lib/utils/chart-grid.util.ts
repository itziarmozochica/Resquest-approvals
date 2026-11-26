import type { GridComponentOption } from 'echarts';

interface BuildChartGridOptions {
  isLegendAtBottom: boolean;
  showLegend: boolean;
}

/**
 * Shared cartesian grid configuration to prevent axis-label clipping and reserve
 * legend space without overlapping the plotting area.
 */
export function chartGrid({ isLegendAtBottom, showLegend }: BuildChartGridOptions): GridComponentOption {
  return {
    bottom: isLegendAtBottom && showLegend ? '15%' : undefined,
    containLabel: true,
    left: '3%',
    right: '3%',
    top: !isLegendAtBottom && showLegend ? '15%' : undefined,
  };
}

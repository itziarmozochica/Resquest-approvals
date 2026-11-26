/** Shared legend configuration across all Ignite chart components. */
export interface IgntChartLegendConfig {
  /** Vertical offset in pixels from the chart edge. Default: `0`. */
  margin?: number;
  /** Legend placement. Default: `'bottom'`. */
  position?: 'bottom' | 'top';
  /** Allows users to toggle series visibility by clicking the legend. */
  selectedMode?: 'multiple' | 'single';
}

/** Resolved legend option passed to eCharts, produced by {@link ChartLegendDirective.legendConfig}. */
export interface IgntChartLegendOption {
  data: string[];
  type: 'scroll';
  bottom?: number;
  selectedMode?: 'multiple' | 'single';
  top?: number;
}

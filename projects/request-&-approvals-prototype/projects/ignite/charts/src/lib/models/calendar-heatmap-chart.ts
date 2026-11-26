/** Single data point for the calendar heatmap: [date in YYYY-MM-DD format, value]. */
export type IgntCalendarHeatmapDataItem = [string, number];

/** Data array for the calendar heatmap chart. */
export type IgntCalendarHeatmapData = IgntCalendarHeatmapDataItem[];

/** Calendar coordinate system configuration. */
export interface IgntCalendarHeatmapCalendarConfig {
  /** Date range: year string (e.g. `'2017'`) or tuple `[start, end]` in `YYYY-MM-DD` format. */
  range: string | [string, string];

  /** Cell size in pixels (single number for square cells). Default: `13`. */
  cellSize?: number;
  /** Whether to show weekday labels (S, M, T, W, T, F, S) on the left. Default: `true`. */
  showDayLabel?: boolean;
  /** Top offset in pixels or percentage. */
  top?: number | string;
}

/** VisualMap configuration for controlling the heatmap color gradient. */
export interface IgntCalendarHeatmapVisualMapConfig {
  /** Maximum value for the color scale. If omitted, derived from data. */
  max?: number;
  /** Minimum value for the color scale. If omitted, derived from data. */
  min?: number;
  /** Whether to show the visualMap legend. Default: `true`. */
  show?: boolean;
}

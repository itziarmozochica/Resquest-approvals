/** Shared base for bar and line series. Not exported — use {@link IgntBarSeriesConfig} or {@link IgntLineSeriesConfig}. */
interface IgntBarLineSeriesBase {
  /** Data values mapped to each category in `xAxisData`, in the same order. `null` leaves a gap (no point drawn). */
  data: (number | null)[];
  /** Series label shown in the legend and tooltip. */
  name: string;
  /** Index of the Y-axis this series is bound to. Defaults to `0` (left axis). */
  yAxisIndex?: number;
}

/**
 * Configuration for a bar series.
 * @see {@link IgntBarLineSeries} for the union type used in component inputs.
 */
export interface IgntBarSeriesConfig extends IgntBarLineSeriesBase {
  /** Discriminant that selects the bar renderer. */
  type: 'bar';
}

/**
 * Configuration for a line series.
 * @see {@link IgntBarLineSeries} for the union type used in component inputs.
 */
export interface IgntLineSeriesConfig extends IgntBarLineSeriesBase {
  /** Discriminant that selects the line renderer. */
  type: 'line';
  /** Whether to render the line with a smooth (bezier) curve. Defaults to `false`. */
  smooth?: boolean;
}

/** Union of all supported series types for {@link IgntBarLineChartComponent}. */
export type IgntBarLineSeries = IgntBarSeriesConfig | IgntLineSeriesConfig;

/**
 * Configuration for a single Y-axis.
 * @see {@link IgntBarLineYAxes} for the tuple type used in component inputs.
 */
export interface IgntBarLineYAxis {
  /** Upper bound of the axis. Omit to scale to the data. Set it with {@link min} to hold a fixed scale, so panels drawn side by side stay comparable. */
  max?: number;
  /** Lower bound of the axis. Omit to scale to the data. */
  min?: number;
  /** Label displayed alongside the axis. */
  name?: string;
  /** Side of the chart where the axis is rendered. Defaults to `'left'`. */
  position?: 'left' | 'right';
}

/** One or two Y-axes. Use two axes for dual-axis charts (e.g. revenue + growth rate). */
export type IgntBarLineYAxes = [IgntBarLineYAxis] | [IgntBarLineYAxis, IgntBarLineYAxis];

/** Configuration for the X-axis labels. */
export interface IgntBarLineXAxisConfig {
  /** Label displayed below the X-axis. */
  name?: string;
  /** Rotation angle in degrees for the axis labels (e.g. `45`). Use when labels are long and overlap. */
  rotate?: number;
}

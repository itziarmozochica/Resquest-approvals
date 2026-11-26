/** One axis/dimension of the radar (e.g. "Attack", "Speed"). Values in {@link IgntRadarSeries}.data map to indicators by index. */
export interface IgntRadarIndicator {
  /** Label shown on the axis. */
  name: string;
  /** Upper bound for this axis. Omit for auto scale. */
  max?: number;
}

/** One data series drawn on the radar (one polygon). Length of `data` must match the number of indicators. */
export interface IgntRadarSeries {
  /** Values per indicator, in the same order as {@link IgntRadarIndicator}[]. */
  data: number[];
  /** Series label shown in the legend and tooltip. */
  name: string;
  /** Line thickness in pixels. */
  lineWidth?: number;
}

/** Resolved data item passed to ECharts for a single series entry. */
export interface IgntRadarSeriesDataItem {
  areaStyle: { color: string | undefined; opacity: number } | undefined;
  itemStyle: { color: string | undefined };
  lineStyle: { color: string | undefined; width: number | undefined };
  name: string;
  value: number[];
}

/** Radar grid layout: shape, size, center and angular options. */
export interface IgntRadarConfig {
  /** Chart center as percentage, e.g. `['50%', '50%']`. */
  center?: [string, string];
  /** Radius as percentage or pixel number, e.g. `'75%'`. */
  radius?: string | number;
  /** Grid shape: polygon (default) or circle. */
  shape?: 'polygon' | 'circle';
  /** Number of concentric grid levels. */
  splitNumber?: number;
  /** Angle in degrees where the first indicator is placed (e.g. 90 = top). */
  startAngle?: number;
}

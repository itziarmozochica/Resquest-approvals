/** Single data series for the stacked bar chart. */
export interface IgntStackedBarChartSeries {
  /** Data values for each category. Length must match categories array. Use `null` for gaps. */
  data: (number | null)[];
  /** Series label shown in legend and tooltip. */
  name: string;
  /** Stack group identifier. Series with same stack value are stacked together. Default: `'total'`. */
  stack?: string;
}

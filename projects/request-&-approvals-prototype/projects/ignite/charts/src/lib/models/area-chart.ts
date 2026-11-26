/** Single data series for the area chart. */
export interface IgntAreaSeries {
  /** Data values for each category. Length must match categories array. Use `null` for gaps. */
  data: (number | null)[];
  /** Series label shown in legend and tooltip. */
  name: string;
}

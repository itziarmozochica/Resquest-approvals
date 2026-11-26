/**
 * One observation in a scatter plot: two numeric measures and an optional label.
 *
 * Consumers work only with this shape; the chart host maps it to the internal
 * drawing representation. The grouped legend caption is supplied separately via the
 * scatter chart `datasetLabel` input (not derived inside the chart model).
 */
export interface IgntScatterChartDataItem {
  /** Optional label used in the tooltip and, when present, as the point name in the legend. */
  name?: string;
  /** Horizontal measure (first continuous variable). */
  x: number;
  /** Vertical measure (second continuous variable). */
  y: number;
}

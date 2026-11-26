/**
 * Radial extent for circular charts, expressed as **percentage of the chart drawing area** (0–100 scale).
 * Use a single number for a full disc (outer edge only) or a tuple `[inner, outer]` for a ring.
 */
export type IgntChartRadialRadiusPercent = number | [number, number];

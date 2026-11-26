import type { IgntChartRadialRadiusPercent } from '../../models/chart-radial-radius.model';

/** Maps chart-area percent(s) to ECharts pie `radius` (percent strings). */
export function resolveIgntChartRadialExtent(value: IgntChartRadialRadiusPercent): string | [string, string] {
  if (Array.isArray(value)) {
    return [`${value[0]}%`, `${value[1]}%`];
  }

  return `${value}%`;
}

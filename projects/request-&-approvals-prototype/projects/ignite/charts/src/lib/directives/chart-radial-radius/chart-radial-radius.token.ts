import { InjectionToken } from '@angular/core';

import type { IgntChartRadialRadiusPercent } from '../../models/chart-radial-radius.model';

/** @internal Optional host fallback when `radius` is unset (e.g. doughnut chart providers). */
export const IGNT_CHART_RADIAL_RADIUS_DEFAULT = new InjectionToken<IgntChartRadialRadiusPercent>('IGNT_CHART_RADIAL_RADIUS_DEFAULT');

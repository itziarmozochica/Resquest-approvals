import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ReportsRealTimeBigLaunchesViewData {
  planCount: number;
  time: string;
}

export const reportsRealTimeBigLaunchesView = defineEvent<ReportsRealTimeBigLaunchesViewData>('reports.real_time.big_launches.view');

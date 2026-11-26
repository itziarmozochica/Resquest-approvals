import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ReportsRealTimeAttendanceViewData {
  planCount: number;
  time: string;
}

export const reportsRealTimeAttendanceView = defineEvent<ReportsRealTimeAttendanceViewData>('reports.real_time.attendance.view');

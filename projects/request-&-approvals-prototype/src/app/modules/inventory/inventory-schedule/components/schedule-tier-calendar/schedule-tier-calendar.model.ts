import { ScheduleDay } from '@fz-original/app/modules/inventory/inventory-schedule/models/schedule-calendar-detail.model';

export interface ScheduleTierCalendarDragPaint {
  capacityTemplateId: string | null;
  columnIndex: number;
  day: ScheduleDay;
  tierId: number | null;
  times: string[];
}

export type ScheduleTierCalendarDayDisabledFn = (day: ScheduleDay) => boolean;

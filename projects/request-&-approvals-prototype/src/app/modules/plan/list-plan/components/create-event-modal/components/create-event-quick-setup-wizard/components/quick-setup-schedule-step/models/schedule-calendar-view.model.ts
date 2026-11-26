import { QuickSetupScheduleColorKey } from '../utils/quick-setup-schedule-color.util';

export interface ScheduleCalendarViewSchedulePill {
  colorKey: QuickSetupScheduleColorKey;
  id: string;
  name: string;
  scheduleIndex: number;
}

export type ScheduleCalendarMonthDayKind = 'active' | 'excluded';

export interface ScheduleCalendarMonthDayMark {
  dominantScheduleIndex: number;
  isActiveSelected: boolean;
  isException: boolean;
  kind: ScheduleCalendarMonthDayKind;
  participatingScheduleIndices: readonly number[];
  ymd: string;
}

export interface ScheduleCalendarMonthCell {
  dayNumber: number;
  mark: ScheduleCalendarMonthDayMark | null;
  ymd: string | null;
}

export type ScheduleCalendarMonthWeeks = readonly (readonly (ScheduleCalendarMonthCell | null)[])[];

export interface ScheduleCalendarMonthDays {
  dayCells: readonly ScheduleCalendarMonthCell[];
  month: string;
}

export interface ScheduleCalendarViewVm {
  months: readonly ScheduleCalendarMonthDays[];
  schedulePills: readonly ScheduleCalendarViewSchedulePill[];
  todayMonth: string | null;
}

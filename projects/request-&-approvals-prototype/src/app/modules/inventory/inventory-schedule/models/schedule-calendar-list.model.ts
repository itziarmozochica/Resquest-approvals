import { ScheduleCalendarDateRangeValue } from './schedule-calendar-detail.model';
import { ScheduleCalendarStatus } from './schedule-calendar-status.enum';

export interface ScheduleCalendarTier {
  name: string;
  color: string;
}

export interface ScheduleCalendarException {
  endDate: string | null;
  specificDays: string[];
  startDate: string | null;
}

export interface ScheduleCalendarListItem {
  dateRanges: ScheduleCalendarDateRangeValue[];
  defaultCapacityTemplateName: string;
  defaultIsVisible: boolean;
  id: string;
  name: string;

  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;

  exceptionCalendars: ScheduleCalendarException[];
  specificDays: string[];
  sessionTypes: string[];
  timeSlots: string[];
  tiers: ScheduleCalendarTier[];
  status: ScheduleCalendarStatus | null;
}

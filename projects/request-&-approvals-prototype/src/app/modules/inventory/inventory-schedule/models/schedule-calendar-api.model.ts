import { ScheduleCalendarStatus } from './schedule-calendar-status.enum';

export interface ScheduleCalendarTierApi {
  name: string;
  color: string;
}

export interface ScheduleCalendarDateRangeApi {
  end_date: string;
  id: string;
  start_date: string;
}

export interface ScheduleCalendarExceptionApi {
  date_ranges: ScheduleCalendarDateRangeApi[];
  specific_days: string[];
}

export interface ScheduleCalendarListApiItem {
  date_ranges: ScheduleCalendarDateRangeApi[];
  default_capacity_template_name: string;
  default_is_visible: boolean;
  id: string;
  name: string;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;

  specific_days: string[];
  session_types: string[];
  time_slots: string[];
  tiers: ScheduleCalendarTierApi[];
  exception_calendars: ScheduleCalendarExceptionApi[];
  status: ScheduleCalendarStatus | null;
}

export interface ScheduleCalendarDeleteApiData {
  job_request_id: string;
}

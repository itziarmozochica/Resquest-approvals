import { ScheduleCalendarStatus } from './schedule-calendar-status.enum';

export enum ScheduleWeekDay {
  Monday = 'monday',
  Tuesday = 'tuesday',
  Wednesday = 'wednesday',
  Thursday = 'thursday',
  Friday = 'friday',
  Saturday = 'saturday',
  Sunday = 'sunday',
}

export interface ScheduleTimeSlot {
  disabled: boolean;
  isVisible: boolean;
  overwrittenCapacityTemplateId: string | null;
  tierId: number | null;
  time: string;
}

export interface ScheduleDay {
  specificDate: string | null;
  timeSlots: ScheduleTimeSlot[];
  weekDayName: ScheduleWeekDay | null;
}

export interface CalendarSalesActivationConfig {
  deltaEnd: number | null;
  deltaEndReference: CalendarSalesActivationDeltaReference | null;
  deltaEndTimeUnit: CalendarSalesActivationTimeUnit | null;
  deltaStart: number | null;
  deltaStartReference: CalendarSalesActivationDeltaReference | null;

  deltaStartTimeUnit: CalendarSalesActivationTimeUnit | null;
  endDatetime: string | null;
  salesActivationEndType: CalendarSalesActivationType | null;
  salesActivationStartType: CalendarSalesActivationType | null;
  startDatetime: string | null;
}

/** Persisted calendar date range; `id` is `null` while the range exists only on the create/edit form. */
export interface ScheduleCalendarDateRangeValue {
  endDate: string;
  id: string | null;
  startDate: string;
}

export type ScheduleCalendarPlanDateRange = Pick<ScheduleCalendarDateRangeValue, 'endDate' | 'startDate'>;

export interface ScheduleCalendar {
  capacityTemplateId: string;
  dateFrequency: CalendarDateFrequency;
  dateRanges: ScheduleCalendarDateRangeValue[];
  durationInMinutes: number;
  endDateConstraint: string | null;
  endTime: string | null;
  exceptionCalendars: ScheduleCalendar[];
  friday: ScheduleDay | null;
  id: string | null;
  localId: string;
  monday: ScheduleDay | null;
  name: string;
  salesActivationConfig: CalendarSalesActivationConfig | null;
  saturday: ScheduleDay | null;
  sessionTypeIds: number[];
  specificDays: ScheduleDay[];
  specificTimeSlots: string[];
  startDateConstraint: string | null;
  startTime: string | null;
  sunday: ScheduleDay | null;
  status: ScheduleCalendarStatus | null;
  thursday: ScheduleDay | null;
  timeFrequencyInMinutes: number | null;
  timeSlotFrequency: CalendarTimeSlotFrequency;
  tuesday: ScheduleDay | null;
  wednesday: ScheduleDay | null;
}

export enum CalendarDateFrequency {
  RecurrentDates = 'recurrentDates',
  SingleDates = 'singleDates',
}

export const CALENDAR_DATE_FREQUENCY_DISPLAY_ORDER: CalendarDateFrequency[] = [
  CalendarDateFrequency.SingleDates,
  CalendarDateFrequency.RecurrentDates,
];

export enum CalendarTimeSlotFrequency {
  RecurrentTimeSlots = 'recurrentTimeSlots',
  SingleTimeSlots = 'singleTimeSlots',
}

export const CALENDAR_TIME_SLOT_FREQUENCY_DISPLAY_ORDER: CalendarTimeSlotFrequency[] = [
  CalendarTimeSlotFrequency.SingleTimeSlots,
  CalendarTimeSlotFrequency.RecurrentTimeSlots,
];

export enum CalendarSalesActivationType {
  FixedDate = 'fixedDate',
  RelativeTo = 'relativeTo',
  SinceCreation = 'sinceCreation',
}

export enum CalendarSalesActivationDeltaReference {
  BeforeEndDate = 'beforeEndDate',
  BeforeStartDate = 'beforeStartDate',
}

export enum CalendarSalesActivationTimeUnit {
  Days = 'days',
  Hours = 'hours',
  Minutes = 'minutes',
  Weeks = 'weeks',
}

export enum CalendarSalesActivationDeltaReferenceDTO {
  BeforeEndDate = 'before_end_date',
  BeforeStartDate = 'before_start_date',
}

export interface CalendarSalesActivationConfigDTO {
  delta_end: number | null;
  delta_end_reference: CalendarSalesActivationDeltaReferenceDTO | null;
  delta_end_time_unit: CalendarSalesActivationTimeUnit | null;
  delta_start: number | null;
  delta_start_reference: CalendarSalesActivationDeltaReferenceDTO | null;
  delta_start_time_unit: CalendarSalesActivationTimeUnit | null;
  end_datetime: string | null;
  start_datetime: string | null;
}

export interface ScheduleDayDTO {
  specific_date: string | null;
  time_slots: ScheduleTimeSlotDTO[];
}

export interface ScheduleTimeSlotDTO {
  is_visible: boolean;
  overwritten_capacity_template_id: string | null;
  tier_id: number | null;
  time: string;
}

export interface ScheduleCalendarDateRangeDTO {
  end_date: string;
  start_date: string;
}

export interface SerializedScheduleCalendarDateRangeDTO extends ScheduleCalendarDateRangeDTO {
  id: string;
}

export interface ScheduleCalendarDTO {
  capacity_template_id: string;
  date_ranges: SerializedScheduleCalendarDateRangeDTO[];
  duration_in_minutes: number;
  end_date_constraint: string | null;
  end_time: string | null;
  exception_calendars: ScheduleCalendarDTO[];
  friday: ScheduleDayDTO | null;
  id: string;
  is_visible: boolean;
  monday: ScheduleDayDTO | null;
  name: string;
  sales_activation_config: CalendarSalesActivationConfigDTO | null;
  saturday: ScheduleDayDTO | null;
  session_type_ids: number[];
  specific_days: ScheduleDayDTO[];
  specific_time_slots: string[] | null;
  start_date_constraint: string | null;
  start_time: string | null;
  status: ScheduleCalendarStatus | null;
  sunday: ScheduleDayDTO | null;
  thursday: ScheduleDayDTO | null;
  time_frequency_in_minutes: number | null;
  tuesday: ScheduleDayDTO | null;
  wednesday: ScheduleDayDTO | null;
}

export interface ScheduleCalendarCreateDTO
  extends Omit<
    ScheduleCalendarDTO,
    'id' | 'date_ranges' | 'exception_calendars' | 'status' | 'start_date_constraint' | 'end_date_constraint'
  > {
  date_ranges: ScheduleCalendarDateRangeDTO[];
  exception_calendars: ScheduleCalendarCreateDTO[];
}

export interface ScheduleCalendarCreateRequestDTO extends ScheduleCalendarCreateDTO {
  draft: boolean;
}

export type ScheduleCalendarNewExceptionDTO = Omit<ScheduleCalendarCreateDTO, 'exception_calendars' | 'sales_activation_config'>;

export interface ScheduleCalendarBulkCreateDTO {
  calendars: ScheduleCalendarCreateDTO[];
}

export interface ScheduleCalendarApiGetResponse {
  data: ScheduleCalendarDTO;
}

export interface CalendarInitialConfiguration {
  defaultCalendarDateFrequency: CalendarDateFrequency;
  defaultTimeSlotFrequency: CalendarTimeSlotFrequency;
  disabledCalendarDateFrequency: boolean;
  disabledExceptions: boolean;
  disabledSalesConfigurationFixedDate: boolean;
  disabledTimeSlotFrequency: boolean;
}

export const EDIT_CALENDAR_CONFIGURATION: CalendarInitialConfiguration = {
  defaultCalendarDateFrequency: CalendarDateFrequency.RecurrentDates,
  defaultTimeSlotFrequency: CalendarTimeSlotFrequency.RecurrentTimeSlots,
  disabledCalendarDateFrequency: true,
  disabledExceptions: false,
  disabledSalesConfigurationFixedDate: false,
  disabledTimeSlotFrequency: true,
};

export const CREATE_CALENDAR_CONFIGURATION: CalendarInitialConfiguration = {
  defaultCalendarDateFrequency: CalendarDateFrequency.SingleDates,
  defaultTimeSlotFrequency: CalendarTimeSlotFrequency.SingleTimeSlots,
  disabledCalendarDateFrequency: false,
  disabledExceptions: false,
  disabledSalesConfigurationFixedDate: false,
  disabledTimeSlotFrequency: false,
};

export const EDIT_DECLARATIVE_INVENTORY_CALENDAR_CONFIGURATION: CalendarInitialConfiguration = {
  ...EDIT_CALENDAR_CONFIGURATION,
  disabledSalesConfigurationFixedDate: true,
};

export const CREATE_DECLARATIVE_INVENTORY_CALENDAR_CONFIGURATION: CalendarInitialConfiguration = {
  ...CREATE_CALENDAR_CONFIGURATION,
  disabledSalesConfigurationFixedDate: true,
};

export interface ScheduleCalendarDateRange {
  endDate: Date;
  startDate: Date;
}

export interface ScheduleCalendarExceptionRange extends ScheduleCalendarDateRange {
  name: string;
}

export interface ScheduleCalendarSpecificException {
  date: Date;
  name: string;
}

export interface ScheduleCalendarFieldsRestrictions {
  exceptionsDateRanges: ScheduleCalendarExceptionRange[];
  exceptionsSpecificDates: ScheduleCalendarSpecificException[];
  /** Coverage windows of the main calendar: its date ranges merged when they overlap or touch. */
  mainDateRanges: ScheduleCalendarDateRange[];
}

export const EMPTY_CALENDAR_RESTRICTIONS: ScheduleCalendarFieldsRestrictions = {
  exceptionsDateRanges: [],
  exceptionsSpecificDates: [],
  mainDateRanges: [],
};

export interface ScheduleCalendarBaseChangesDTO {
  new_calendar_day_time_slots: ScheduleCalendarDayTimeSlotsUpdateDTO[] | null;
  new_end_time: string | null;
  new_name: string | null;
  new_session_type_ids: number[] | null;
  new_specific_days: ScheduleDayDTO[] | null;
  new_specific_time_slots: string[] | null;
  new_start_time: string | null;
}

export interface ScheduleCalendarDayTimeSlotsUpdateDTO {
  specific_date: string | null;
  time_slots: ScheduleTimeSlotDTO[];
  weekday: ScheduleWeekDay | null;
}

export interface ScheduleCalendarChangesDTO extends ScheduleCalendarBaseChangesDTO {
  id: string;
}

export interface ScheduleCalendarPatchDTO extends ScheduleCalendarBaseChangesDTO {
  new_date_ranges: ScheduleCalendarDateRangeDTO[];
  new_exception_calendars: ScheduleCalendarNewExceptionDTO[] | null;
  sessions_hidden: boolean;
  updated_exception_calendars: ScheduleCalendarChangesDTO[] | null;
}

export interface ScheduleCalendarApiPathRequest {
  calendar: ScheduleCalendarPatchDTO;
}

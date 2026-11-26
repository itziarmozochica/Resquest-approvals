import { WeekDay } from '@fz-original/app/shared/components/week-days-selector/week-days-selector.component';

export enum SalesWindowDeltaUnit {
  YEARS = 'years',
  MONTHS = 'months',
  DAYS = 'days',
  HOURS = 'hours',
  MINUTES = 'minutes',
}

export type SalesWindowDeltaUnitType = (typeof SalesWindowDeltaUnit)[keyof typeof SalesWindowDeltaUnit];

export enum SalesWindowReference {
  BEFORE = 'before',
  AFTER = 'after',
}

export type SalesWindowReferenceType = (typeof SalesWindowReference)[keyof typeof SalesWindowReference];

export type BulkEditResponseDTO = { id: string };

export interface BulkEditIncludedDateDTO {
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  weekdays: Array<WeekDay>;
}

export interface BulkEditTimeSlotDTO {
  included_dates: Array<BulkEditIncludedDateDTO> | null;
  excluded_dates: Array<string> | null;
  tier_ids: Array<number> | null;
  timezone: string;
}

export interface BulkEditGroupDTO {
  session_type_group_ids: Array<number> | null;
}

export interface BulkEditSessionDTO {
  session_type_ids: Array<number> | null;
}

export interface BulkEditTimeSlotsChangesDTO {
  tier_id: number | null;
  capacity: number | null;
}

export interface BulkEditGroupsChangesDTO {
  capacity: number | null;
}

export interface BulkEditSalesWindowRelativeDTO {
  delta: number;
  delta_unit: SalesWindowDeltaUnitType;
  reference: SalesWindowReferenceType;
}

export interface BulkEditSalesWindowDTO {
  absolute_date: string | null;
  relative_date: BulkEditSalesWindowRelativeDTO | null;
}

export interface BulkEditChannelExceptionDTO {
  channel_ids: string[];
  sales_end: BulkEditSalesWindowDTO;
  sales_start?: BulkEditSalesWindowDTO;
}

export interface BulkEditSessionsChangesDTO {
  capacity: number | null;
  sold_out: boolean | null;
  is_hidden: boolean | null;
  sales_start: BulkEditSalesWindowDTO | null;
  sales_end: BulkEditSalesWindowDTO | null;
  channel_exceptions?: BulkEditChannelExceptionDTO[];
  duration_minutes: number | null;
}

export interface BulkEditChangesDTO {
  time_slots: BulkEditTimeSlotsChangesDTO;
  groups: BulkEditGroupsChangesDTO;
  sessions: BulkEditSessionsChangesDTO;
}

export interface BulkEditTargetedFiltersDTO {
  time_slots: BulkEditTimeSlotDTO;
  groups: BulkEditGroupDTO;
  sessions: BulkEditSessionDTO;
}

export interface BulkEditDTO {
  target_filters: BulkEditTargetedFiltersDTO;
  changes: BulkEditChangesDTO;
}

export interface BulkEditIncludedDate {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  weekdays: Array<WeekDay>;
}

export interface BulkEditTimeSlot {
  includedDates: Array<BulkEditIncludedDate> | null;
  excludedDates: Array<string> | null;
  tierIds: Array<number> | null;
  timezone: string;
}

export interface BulkEditGroup {
  sessionTypeGroupIds: Array<number> | null;
}

export interface BulkEditSession {
  sessionTypeIds: Array<number> | null;
}

export interface BulkEditTimeSlotsChanges {
  tierId: number | null;
  capacity: number | null;
}

export interface BulkEditGroupsChanges {
  capacity: number | null;
}

export interface BulkEditSalesWindowRelative {
  delta: number;
  deltaUnit: SalesWindowDeltaUnitType;
  reference: SalesWindowReferenceType;
}

export interface BulkEditSalesWindow {
  absoluteDate: string | null;
  relativeDate: BulkEditSalesWindowRelative | null;
}

export interface BulkEditChannelException {
  channelIds: string[];
  salesEnd: BulkEditSalesWindow;
  salesStart: BulkEditSalesWindow | null;
}

export interface BulkEditSessionsChanges {
  capacity: number | null;
  soldOut: boolean | null;
  isHidden: boolean | null;
  salesStart: BulkEditSalesWindow | null;
  salesEnd: BulkEditSalesWindow | null;
  channelExceptions: BulkEditChannelException[] | null;
  durationMinutes: number | null;
}

export interface BulkEditChanges {
  timeSlots: BulkEditTimeSlotsChanges;
  groups: BulkEditGroupsChanges;
  sessions: BulkEditSessionsChanges;
}

export interface BulkEditTargetedFilters {
  timeSlots: BulkEditTimeSlot;
  groups: BulkEditGroup;
  sessions: BulkEditSession;
}

export interface BulkEdit {
  targetFilters: BulkEditTargetedFilters;
  changes: BulkEditChanges;
}

export type BulkEditResponse = BulkEditResponseDTO;

/** Mirrors SCSS $palette-neutral-200 — used for the "closed" tier visual state */
export const CLOSED_TIER_COLOR = '#ccd2d8';

export interface GenericOption {
  color?: string;
  id: number | string;
  title: string;
}

export interface ScheduleCalendarOptions {
  capacityTemplateOptions: GenericOption[];
  sessionTypeOptions: GenericOption[];
  tierOptions: GenericOption[];
}

export interface ScheduleCapacityTemplateOptionDTO {
  id: string;
  name: string;
}

export interface ScheduleSessionTypeOptionDTO {
  id: number;
  label: string;
}

export interface ScheduleTierOptionDTO {
  color: string;
  id: number;
  name: string;
}

export interface ScheduleCalendarOptionsDTO {
  capacity_templates: ScheduleCapacityTemplateOptionDTO[];
  session_types: ScheduleSessionTypeOptionDTO[];
  tiers: ScheduleTierOptionDTO[];
}

export interface ScheduleCalendarOptionsApiGetResponse {
  data: ScheduleCalendarOptionsDTO;
}

import { Injectable } from '@angular/core';

import {
  CalendarDateFrequency,
  CalendarSalesActivationConfig,
  CalendarSalesActivationConfigDTO,
  CalendarSalesActivationDeltaReference,
  CalendarSalesActivationDeltaReferenceDTO,
  CalendarSalesActivationTimeUnit,
  CalendarSalesActivationType,
  CalendarTimeSlotFrequency,
  ScheduleCalendar,
  ScheduleCalendarApiGetResponse,
  ScheduleCalendarDTO,
  ScheduleDay,
  ScheduleDayDTO,
  ScheduleTimeSlot,
  ScheduleTimeSlotDTO,
  ScheduleWeekDay,
} from '../models/schedule-calendar-detail.model';
import { sortDateRanges } from '../utils/schedule-calendar-date-range.util';

@Injectable({ providedIn: 'root' })
export class ScheduleCalendarGetAdapter {
  fromApi(response: ScheduleCalendarApiGetResponse): ScheduleCalendar {
    return this.#parseCalendarFromApi(response.data, false);
  }

  #getSalesActivationStartType(config: CalendarSalesActivationConfigDTO | null | undefined): CalendarSalesActivationType {
    if (!config) {
      return CalendarSalesActivationType.RelativeTo;
    }
    if (config.start_datetime !== null) {
      return CalendarSalesActivationType.FixedDate;
    }
    if (config.delta_start !== null) {
      return CalendarSalesActivationType.RelativeTo;
    }
    return CalendarSalesActivationType.SinceCreation;
  }

  #parseCalendarFromApi(calendar: ScheduleCalendarDTO, isExceptionCalendar: boolean): ScheduleCalendar {
    const specificDays = calendar.specific_days
      .map(day => this.#scheduleDayFromApi(day, null))
      .filter((day): day is ScheduleDay => day !== null);
    const dateFrequency = specificDays.length > 0 ? CalendarDateFrequency.SingleDates : CalendarDateFrequency.RecurrentDates;

    const specificTimeSlots = (calendar.specific_time_slots || []).map(time => this.#normalizeTimeToHHmm(time));
    const timeSlotFrequency =
      specificTimeSlots.length > 0 ? CalendarTimeSlotFrequency.SingleTimeSlots : CalendarTimeSlotFrequency.RecurrentTimeSlots;

    const dateRanges = sortDateRanges(
      calendar.date_ranges.map(dateRange => ({ endDate: dateRange.end_date, id: dateRange.id, startDate: dateRange.start_date })),
    );
    const [exceptionDateRange] = isExceptionCalendar ? dateRanges : [];

    return {
      localId: calendar.id,
      capacityTemplateId: calendar.capacity_template_id,
      id: calendar.id,
      name: calendar.name,
      sessionTypeIds: calendar.session_type_ids,
      dateRanges: isExceptionCalendar ? [] : dateRanges,
      startDateConstraint: exceptionDateRange?.startDate ?? null,
      endDateConstraint: exceptionDateRange?.endDate ?? null,
      startTime: calendar.start_time ? this.#normalizeTimeToHHmm(calendar.start_time) : null,
      endTime: calendar.end_time ? this.#normalizeTimeToHHmm(calendar.end_time) : null,
      timeFrequencyInMinutes: calendar.time_frequency_in_minutes,
      durationInMinutes: calendar.duration_in_minutes,
      dateFrequency,
      monday: this.#scheduleDayFromApi(calendar.monday, ScheduleWeekDay.Monday),
      tuesday: this.#scheduleDayFromApi(calendar.tuesday, ScheduleWeekDay.Tuesday),
      wednesday: this.#scheduleDayFromApi(calendar.wednesday, ScheduleWeekDay.Wednesday),
      thursday: this.#scheduleDayFromApi(calendar.thursday, ScheduleWeekDay.Thursday),
      friday: this.#scheduleDayFromApi(calendar.friday, ScheduleWeekDay.Friday),
      saturday: this.#scheduleDayFromApi(calendar.saturday, ScheduleWeekDay.Saturday),
      sunday: this.#scheduleDayFromApi(calendar.sunday, ScheduleWeekDay.Sunday),
      salesActivationConfig: this.#parseCalendarSalesActivationConfigFromApi(calendar.sales_activation_config),
      specificDays,
      specificTimeSlots,
      timeSlotFrequency,
      exceptionCalendars: (calendar.exception_calendars || []).map(exceptionCalendar =>
        this.#parseCalendarFromApi(exceptionCalendar, true),
      ),
      status: calendar.status ?? null,
    };
  }

  #parseCalendarSalesActivationConfigFromApi(response: CalendarSalesActivationConfigDTO | null | undefined): CalendarSalesActivationConfig {
    return {
      salesActivationStartType: this.#getSalesActivationStartType(response),
      startDatetime: response?.start_datetime ?? null,
      deltaStart: response?.delta_start ?? null,
      deltaStartReference:
        this.#parseDeltaReferenceFromApi(response?.delta_start_reference) ?? CalendarSalesActivationDeltaReference.BeforeStartDate,
      deltaStartTimeUnit: response?.delta_start_time_unit ?? CalendarSalesActivationTimeUnit.Minutes,
      salesActivationEndType: response?.end_datetime ? CalendarSalesActivationType.FixedDate : CalendarSalesActivationType.RelativeTo,
      endDatetime: response?.end_datetime ?? null,
      deltaEnd: response?.delta_end ?? null,
      deltaEndReference:
        this.#parseDeltaReferenceFromApi(response?.delta_end_reference) ?? CalendarSalesActivationDeltaReference.BeforeStartDate,
      deltaEndTimeUnit: response?.delta_end_time_unit ?? CalendarSalesActivationTimeUnit.Minutes,
    };
  }

  #parseDeltaReferenceFromApi(
    response: CalendarSalesActivationDeltaReferenceDTO | null | undefined,
  ): CalendarSalesActivationDeltaReference | null {
    if (!response) {
      return null;
    }
    switch (response) {
      case CalendarSalesActivationDeltaReferenceDTO.BeforeEndDate:
        return CalendarSalesActivationDeltaReference.BeforeEndDate;
      case CalendarSalesActivationDeltaReferenceDTO.BeforeStartDate:
        return CalendarSalesActivationDeltaReference.BeforeStartDate;
      default:
        return null;
    }
  }

  #scheduleDayFromApi(response: ScheduleDayDTO | null, weekDayName: ScheduleWeekDay | null): ScheduleDay | null {
    if (!response) {
      return null;
    }
    return {
      specificDate: response.specific_date,
      weekDayName: weekDayName,
      timeSlots: response.time_slots.map(timeSlot => this.#scheduleTimeSlotFromApi(timeSlot)),
    };
  }

  #scheduleTimeSlotFromApi(response: ScheduleTimeSlotDTO): ScheduleTimeSlot {
    return {
      overwrittenCapacityTemplateId: response.overwritten_capacity_template_id,
      tierId: response.tier_id,
      time: this.#normalizeTimeToHHmm(response.time),
      isVisible: response.is_visible,
      disabled: true,
    };
  }

  #normalizeTimeToHHmm(time: string): string {
    const [hours = '', minutes = ''] = time.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  }
}

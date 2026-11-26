import { Injectable } from '@angular/core';

import {
  CalendarDateFrequency,
  CalendarSalesActivationConfig,
  CalendarSalesActivationConfigDTO,
  CalendarSalesActivationDeltaReference,
  CalendarSalesActivationDeltaReferenceDTO,
  CalendarSalesActivationType,
  ScheduleCalendar,
  ScheduleCalendarCreateDTO,
  ScheduleCalendarNewExceptionDTO,
  ScheduleCalendarPlanDateRange,
  ScheduleDay,
  ScheduleDayDTO,
  ScheduleTimeSlot,
  ScheduleTimeSlotDTO,
} from '../models/schedule-calendar-detail.model';

@Injectable({ providedIn: 'root' })
export class ScheduleCalendarPostAdapter {
  toApi(calendar: ScheduleCalendar): ScheduleCalendarCreateDTO {
    return this.#parseCalendarToApi(calendar, calendar.dateRanges);
  }

  toNewExceptionCalendarPatchApi(exceptionCalendar: ScheduleCalendar): ScheduleCalendarNewExceptionDTO {
    return this.#parseCalendarFieldsToApi(exceptionCalendar, this.#getExceptionCalendarDateRanges(exceptionCalendar));
  }

  #parseCalendarSalesActivationConfigToApi(salesActivationConfig: CalendarSalesActivationConfig | null): CalendarSalesActivationConfigDTO {
    const config: CalendarSalesActivationConfigDTO = {
      start_datetime: null,
      delta_start: null,
      delta_start_reference: null,
      delta_start_time_unit: null,
      end_datetime: null,
      delta_end: null,
      delta_end_reference: null,
      delta_end_time_unit: null,
    };

    if (!salesActivationConfig) {
      return config;
    }

    const isStartRelative = salesActivationConfig.salesActivationStartType === CalendarSalesActivationType.RelativeTo;
    const isEndRelative = salesActivationConfig.salesActivationEndType === CalendarSalesActivationType.RelativeTo;

    if (isStartRelative) {
      config.delta_start_time_unit = salesActivationConfig.deltaStartTimeUnit;
      config.delta_start = salesActivationConfig.deltaStart;
      config.delta_start_reference = this.#parseDeltaReferenceToApi(salesActivationConfig.deltaStartReference);
    } else {
      config.start_datetime = salesActivationConfig.startDatetime;
    }

    if (isEndRelative) {
      config.delta_end_time_unit = salesActivationConfig.deltaEndTimeUnit;
      config.delta_end = salesActivationConfig.deltaEnd;
      config.delta_end_reference = this.#parseDeltaReferenceToApi(salesActivationConfig.deltaEndReference);
    } else {
      config.end_datetime = salesActivationConfig.endDatetime;
    }

    return config;
  }

  #parseCalendarToApi(calendar: ScheduleCalendar, dateRanges: ScheduleCalendarPlanDateRange[]): ScheduleCalendarCreateDTO {
    return {
      ...this.#parseCalendarFieldsToApi(calendar, dateRanges),
      sales_activation_config: this.#parseCalendarSalesActivationConfigToApi(calendar.salesActivationConfig),
      exception_calendars:
        calendar.dateFrequency === CalendarDateFrequency.RecurrentDates
          ? calendar.exceptionCalendars.map(exceptionCalendar =>
              this.#parseCalendarToApi(exceptionCalendar, this.#getExceptionCalendarDateRanges(exceptionCalendar)),
            )
          : [],
    };
  }

  #parseCalendarFieldsToApi(calendar: ScheduleCalendar, dateRanges: ScheduleCalendarPlanDateRange[]): ScheduleCalendarNewExceptionDTO {
    return {
      capacity_template_id: calendar.capacityTemplateId,
      name: calendar.name,
      session_type_ids: calendar.sessionTypeIds,
      is_visible: true,
      duration_in_minutes: calendar.durationInMinutes,
      monday: calendar.monday ? this.#parseScheduleDayToApi(calendar.monday) : null,
      tuesday: calendar.tuesday ? this.#parseScheduleDayToApi(calendar.tuesday) : null,
      wednesday: calendar.wednesday ? this.#parseScheduleDayToApi(calendar.wednesday) : null,
      thursday: calendar.thursday ? this.#parseScheduleDayToApi(calendar.thursday) : null,
      friday: calendar.friday ? this.#parseScheduleDayToApi(calendar.friday) : null,
      saturday: calendar.saturday ? this.#parseScheduleDayToApi(calendar.saturday) : null,
      sunday: calendar.sunday ? this.#parseScheduleDayToApi(calendar.sunday) : null,
      ...this.#parseScheduleCalendarDates(calendar, dateRanges),
    } as ScheduleCalendarNewExceptionDTO;
  }

  #getExceptionCalendarDateRanges(exceptionCalendar: ScheduleCalendar): ScheduleCalendarPlanDateRange[] {
    const { endDateConstraint, startDateConstraint } = exceptionCalendar;
    return startDateConstraint && endDateConstraint ? [{ endDate: endDateConstraint, startDate: startDateConstraint }] : [];
  }

  #parseDeltaReferenceToApi(response: CalendarSalesActivationDeltaReference | null): CalendarSalesActivationDeltaReferenceDTO | null {
    if (!response) {
      return null;
    }
    switch (response) {
      case CalendarSalesActivationDeltaReference.BeforeEndDate:
        return CalendarSalesActivationDeltaReferenceDTO.BeforeEndDate;
      case CalendarSalesActivationDeltaReference.BeforeStartDate:
        return CalendarSalesActivationDeltaReferenceDTO.BeforeStartDate;
      default:
        return null;
    }
  }

  #parseScheduleCalendarDates(calendar: ScheduleCalendar, dateRanges: ScheduleCalendarPlanDateRange[]) {
    const calendarDates: Partial<ScheduleCalendarCreateDTO> = {
      date_ranges: [],
      specific_days: [],
      start_time: null,
      end_time: null,
      time_frequency_in_minutes: null,
      specific_time_slots: null,
    };

    if (calendar.dateFrequency === CalendarDateFrequency.SingleDates) {
      calendarDates.specific_days = calendar.specificDays.map(day => this.#parseScheduleDayToApi(day));
    } else {
      calendarDates.date_ranges = dateRanges.map(dateRange => ({ end_date: dateRange.endDate, start_date: dateRange.startDate }));
    }

    if (calendar.specificTimeSlots.length > 0) {
      calendarDates.specific_time_slots = calendar.specificTimeSlots;
    } else {
      calendarDates.start_time = calendar.startTime;
      calendarDates.end_time = calendar.endTime;
      calendarDates.time_frequency_in_minutes = calendar.timeFrequencyInMinutes;
    }

    return calendarDates;
  }

  #parseScheduleDayToApi(scheduleDay: ScheduleDay): ScheduleDayDTO {
    return {
      specific_date: scheduleDay.specificDate,
      time_slots: scheduleDay.timeSlots.map(timeSlot => this.#parseScheduleTimeSlotToApi(timeSlot)),
    };
  }

  #parseScheduleTimeSlotToApi(timeSlot: ScheduleTimeSlot): ScheduleTimeSlotDTO {
    return {
      overwritten_capacity_template_id: timeSlot.overwrittenCapacityTemplateId,
      tier_id: timeSlot.tierId,
      time: timeSlot.time,
      is_visible: timeSlot.isVisible,
    };
  }
}

import { inject, Injectable } from '@angular/core';

import { ScheduleCalendarPostAdapter } from '@fz-original/app/modules/inventory/inventory-schedule/services/schedule-calendar-post.adapter';

import {
  CalendarDateFrequency,
  CalendarTimeSlotFrequency,
  ScheduleCalendar,
  ScheduleCalendarApiPathRequest,
  ScheduleCalendarBaseChangesDTO,
  ScheduleCalendarChangesDTO,
  ScheduleCalendarDayTimeSlotsUpdateDTO,
  ScheduleDay,
  ScheduleDayDTO,
  ScheduleTimeSlot,
  ScheduleTimeSlotDTO,
  ScheduleWeekDay,
} from '../models/schedule-calendar-detail.model';

type ScheduleWeekDayKey = keyof Pick<ScheduleCalendar, 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'>;

@Injectable({ providedIn: 'root' })
export class ScheduleCalendarPatchAdapter {
  readonly #postAdapter = inject(ScheduleCalendarPostAdapter);

  readonly #weekDayKeys: ScheduleWeekDayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  readonly #weekDayNameByKey: Record<ScheduleWeekDayKey, ScheduleWeekDay> = {
    monday: ScheduleWeekDay.Monday,
    tuesday: ScheduleWeekDay.Tuesday,
    wednesday: ScheduleWeekDay.Wednesday,
    thursday: ScheduleWeekDay.Thursday,
    friday: ScheduleWeekDay.Friday,
    saturday: ScheduleWeekDay.Saturday,
    sunday: ScheduleWeekDay.Sunday,
  };

  toApi(oldCalendar: ScheduleCalendar, newCalendar: ScheduleCalendar, sessionsHidden: boolean): ScheduleCalendarApiPathRequest {
    const mainChanges = this.#getCalendarChanges(oldCalendar, newCalendar);
    return {
      calendar: {
        ...mainChanges,
        new_date_ranges: newCalendar.dateRanges
          .filter(dateRange => dateRange.id === null)
          .map(dateRange => ({ end_date: dateRange.endDate, start_date: dateRange.startDate })),
        new_exception_calendars: newCalendar.exceptionCalendars
          .filter(calendar => !calendar.id)
          .map(exceptionCalendar => this.#postAdapter.toNewExceptionCalendarPatchApi(exceptionCalendar)),
        sessions_hidden: sessionsHidden,
        updated_exception_calendars: this.#getUpdatedExceptionCalendars(oldCalendar, newCalendar),
      },
    };
  }

  #getCalendarChanges(oldCalendar: ScheduleCalendar, newCalendar: ScheduleCalendar): ScheduleCalendarBaseChangesDTO {
    const existingSpecificDates = new Set(oldCalendar.specificDays.map(day => day.specificDate));
    const existingSessionTypeIds = new Set(oldCalendar.sessionTypeIds);
    const existingSpecificTimeSlots = new Set(oldCalendar.specificTimeSlots);

    const newName = oldCalendar.name !== newCalendar.name ? newCalendar.name : null;
    const newSessionTypeIds = newCalendar.sessionTypeIds.filter(sessionTypeId => !existingSessionTypeIds.has(sessionTypeId));
    const newSpecificDayCandidates = newCalendar.specificDays
      .filter(day => !existingSpecificDates.has(day.specificDate))
      .map(day => this.#parseScheduleDayToApi(day));
    const newSpecificDays = newSpecificDayCandidates.length > 0 ? newSpecificDayCandidates : existingSpecificDates.size > 0 ? [] : null;
    const newStartTime =
      oldCalendar.timeSlotFrequency === CalendarTimeSlotFrequency.RecurrentTimeSlots && oldCalendar.startTime !== newCalendar.startTime
        ? newCalendar.startTime
        : null;
    const newEndTime =
      oldCalendar.timeSlotFrequency === CalendarTimeSlotFrequency.RecurrentTimeSlots && oldCalendar.endTime !== newCalendar.endTime
        ? newCalendar.endTime
        : null;
    const newSpecificTimeSlots =
      newCalendar.timeSlotFrequency === CalendarTimeSlotFrequency.SingleTimeSlots
        ? newCalendar.specificTimeSlots.filter(time => !existingSpecificTimeSlots.has(time))
        : null;
    const newCalendarDayTimeSlots = this.#getNewCalendarDayTimeSlots(oldCalendar, newCalendar);

    return {
      new_calendar_day_time_slots: newCalendarDayTimeSlots.length > 0 ? newCalendarDayTimeSlots : null,
      new_end_time: newEndTime,
      new_name: newName,
      new_session_type_ids: newSessionTypeIds.length > 0 ? newSessionTypeIds : null,
      new_specific_days: newSpecificDays,
      new_specific_time_slots: newSpecificTimeSlots !== null && newSpecificTimeSlots.length > 0 ? newSpecificTimeSlots : null,
      new_start_time: newStartTime,
    };
  }

  #getUpdatedExceptionCalendars(oldCalendar: ScheduleCalendar, newCalendar: ScheduleCalendar): ScheduleCalendarChangesDTO[] | null {
    const updatedCalendars: ScheduleCalendarChangesDTO[] = [];

    const oldExceptionCalendarsMap = new Map<string, ScheduleCalendar>();
    oldCalendar.exceptionCalendars.forEach(calendar => {
      if (calendar.id) {
        oldExceptionCalendarsMap.set(calendar.id, calendar);
      }
    });

    newCalendar.exceptionCalendars.forEach(newExceptionCalendar => {
      if (!newExceptionCalendar.id) {
        return;
      }
      const oldExceptionCalendar = oldExceptionCalendarsMap.get(newExceptionCalendar.id);
      if (!oldExceptionCalendar) {
        return;
      }
      const changes = this.#getCalendarChanges(oldExceptionCalendar, newExceptionCalendar);
      const hasChanges =
        changes.new_name !== null ||
        (changes.new_session_type_ids !== null && changes.new_session_type_ids.length > 0) ||
        (changes.new_specific_days !== null && changes.new_specific_days.length > 0) ||
        changes.new_start_time !== null ||
        changes.new_end_time !== null ||
        (changes.new_specific_time_slots !== null && changes.new_specific_time_slots.length > 0) ||
        (changes.new_calendar_day_time_slots !== null && changes.new_calendar_day_time_slots.length > 0);

      if (hasChanges) {
        updatedCalendars.push({ ...changes, id: newExceptionCalendar.id! });
      }
    });

    return updatedCalendars.length > 0 ? updatedCalendars : null;
  }

  #getNewCalendarDayTimeSlots(oldCalendar: ScheduleCalendar, newCalendar: ScheduleCalendar): ScheduleCalendarDayTimeSlotsUpdateDTO[] {
    const updates: ScheduleCalendarDayTimeSlotsUpdateDTO[] = [];

    if (newCalendar.dateFrequency === CalendarDateFrequency.RecurrentDates) {
      for (const weekDayKey of this.#weekDayKeys) {
        const oldDay = oldCalendar[weekDayKey];
        if (!oldDay) {
          continue;
        }

        const newDay = newCalendar[weekDayKey];
        if (!newDay) {
          continue;
        }

        const existingTimesOnDay = new Set(oldDay.timeSlots.map(timeSlot => timeSlot.time));
        const newTimeSlots = newDay.timeSlots.filter(timeSlot => !existingTimesOnDay.has(timeSlot.time));
        if (newTimeSlots.length === 0) {
          continue;
        }

        updates.push({
          weekday: this.#weekDayNameByKey[weekDayKey],
          specific_date: null,
          time_slots: newTimeSlots.map(timeSlot => this.#parseScheduleTimeSlotToApi(timeSlot)),
        });
      }
    }

    const oldSpecificDaysByDate = new Map(oldCalendar.specificDays.map(day => [day.specificDate, day]));
    for (const specificDay of newCalendar.specificDays) {
      const oldDay = oldSpecificDaysByDate.get(specificDay.specificDate);
      if (!oldDay) {
        continue;
      }

      const existingTimesOnDay = new Set(oldDay.timeSlots.map(timeSlot => timeSlot.time));
      const newTimeSlots = specificDay.timeSlots.filter(timeSlot => !existingTimesOnDay.has(timeSlot.time));
      if (newTimeSlots.length === 0) {
        continue;
      }

      updates.push({
        weekday: null,
        specific_date: specificDay.specificDate,
        time_slots: newTimeSlots.map(timeSlot => this.#parseScheduleTimeSlotToApi(timeSlot)),
      });
    }

    return updates;
  }

  #parseScheduleDayToApi(scheduleDay: ScheduleDay): ScheduleDayDTO {
    return {
      specific_date: scheduleDay.specificDate,
      time_slots: scheduleDay.timeSlots.map(timeSlot => this.#parseScheduleTimeSlotToApi(timeSlot)),
    };
  }

  #parseScheduleTimeSlotToApi(timeSlot: ScheduleTimeSlot): ScheduleTimeSlotDTO {
    return {
      is_visible: timeSlot.isVisible,
      overwritten_capacity_template_id: timeSlot.overwrittenCapacityTemplateId,
      tier_id: timeSlot.tierId,
      time: timeSlot.time,
    };
  }
}

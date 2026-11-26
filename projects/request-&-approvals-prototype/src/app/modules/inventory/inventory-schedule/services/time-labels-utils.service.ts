import { DatePipe } from '@angular/common';
import { inject, Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { getTimeFormatForLocale } from '../../../../shared/utils/time-format.util';
import { ScheduleTimeSlot } from '../models/schedule-calendar-detail.model';

@Injectable({ providedIn: 'root' })
export class TimeLabelsUtilsService {
  readonly #datePipe = inject(DatePipe);
  readonly #translateService = inject(TranslateService);

  buildLocalizedTimeRange(duration: number, startTime: string, endTime: string, timeFormat?: string, locale?: string): string[] {
    if (duration <= 0) {
      return [];
    }

    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes) || startMinutes > endMinutes) {
      return [];
    }

    const format = this.#resolveTimeFormat(timeFormat, locale);
    const times: string[] = [];
    for (let current = startMinutes; current <= endMinutes; current += duration) {
      times.push(this.#minutesToTime(current, format));
    }
    return times;
  }

  localizeTime(time: string, format?: string, locale?: string): string {
    return this.#minutesToTime(this.timeToMinutes(time), this.#resolveTimeFormat(format, locale));
  }

  localizeTimes(times: string[], format?: string, locale?: string): string[] {
    const resolvedFormat = this.#resolveTimeFormat(format, locale);
    return times.map(time => this.#minutesToTime(this.timeToMinutes(time), resolvedFormat));
  }

  migrateTimeSlots(slotMap: Map<string, ScheduleTimeSlot>, timeLabels: string[]): ScheduleTimeSlot[] | null {
    const sortedSlots = [...slotMap.entries()].sort(([a], [b]) => this.timeToMinutes(a) - this.timeToMinutes(b));
    if (sortedSlots.length === 0) return null;

    const timeLabelSet = new Set(timeLabels);
    const hasStaleSlots = [...slotMap.keys()].some(key => !timeLabelSet.has(key));

    const newTimeSlots: ScheduleTimeSlot[] = [];
    let hasInheritedSlots = false;

    for (const time of timeLabels) {
      const existing = slotMap.get(time);
      if (existing) {
        newTimeSlots.push(existing);
      } else {
        const inherited = this.#inheritFromNearestSlot(time, sortedSlots);
        if (inherited) {
          newTimeSlots.push(inherited);
          hasInheritedSlots = true;
        }
      }
    }

    if (!(hasInheritedSlots || hasStaleSlots)) {
      return null;
    }

    return newTimeSlots;
  }

  timeToMinutes(value: string): number {
    const [hoursPart, minutesPart] = value.split(':');
    const hours = Number(hoursPart);
    const minutes = Number(minutesPart);
    return hours * 60 + minutes;
  }

  #inheritFromNearestSlot(timeValue: string, sortedExistingSlots: Array<[string, ScheduleTimeSlot]>): ScheduleTimeSlot | null {
    const currentMinutes = this.timeToMinutes(timeValue);
    let nearestSlot: ScheduleTimeSlot | null = null;
    for (const [slotTime, slot] of sortedExistingSlots) {
      if (this.timeToMinutes(slotTime) <= currentMinutes) {
        nearestSlot = slot;
      } else {
        break;
      }
    }
    if (!nearestSlot && sortedExistingSlots.length > 0) {
      nearestSlot = sortedExistingSlots[0][1];
    }
    if (nearestSlot) {
      return { ...nearestSlot, time: timeValue, disabled: false };
    }
    return null;
  }

  #minutesToTime(totalMinutes: number, format: string): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const now = new Date();
    now.setHours(hours, minutes, 0, 0);
    return this.#datePipe.transform(now, format)!;
  }

  #resolveTimeFormat(format?: string, locale?: string): string {
    if (format === 'shortTime') {
      const effectiveLocale = locale ?? this.#translateService.currentLang ?? 'en';
      return getTimeFormatForLocale(effectiveLocale);
    }
    return format ?? 'HH:mm';
  }
}

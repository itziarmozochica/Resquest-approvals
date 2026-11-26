import { AbstractControl, ValidationErrors } from '@angular/forms';

import { ReminderFrequency } from '../models/alert-config.model';

export function customDaysRequiredWhenCustom(group: AbstractControl): ValidationErrors | null {
  const frequency = group.get('frequency')?.value as ReminderFrequency | undefined;
  const days = group.get('customReminderIntervalDays')?.value as number | null | undefined;
  if (frequency !== 'custom') {
    return null;
  }
  if (days == null || days < 1 || days > 60) {
    return { customDaysRange: true };
  }
  return null;
}

export function timezoneAndHourRequired(group: AbstractControl): ValidationErrors | null {
  const alertsEnabled = group.get('alertsEnabled')?.value as boolean | undefined;
  if (alertsEnabled === false) {
    return null;
  }
  const tz = group.get('reminderTimezone')?.value as string | null | undefined;
  const hour = group.get('reminderLocalHour')?.value as number | null | undefined;
  if (!tz?.trim() || hour == null) {
    return { tzAndHourPaired: true };
  }
  return null;
}

export function buildTimezoneOptions(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  if (typeof intl.supportedValuesOf === 'function') {
    return intl.supportedValuesOf('timeZone');
  }
  return ['UTC', 'Europe/Madrid', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'America/Sao_Paulo', 'Asia/Tokyo'];
}

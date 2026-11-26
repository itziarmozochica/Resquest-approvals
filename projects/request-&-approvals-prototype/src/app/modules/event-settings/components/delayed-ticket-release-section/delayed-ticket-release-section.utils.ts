import { FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import { DurationUnit } from '@fz-original/app/shared/ticket-delivery-settings/models/duration-unit.enum';
import { ReleaseFrequency } from '@fz-original/app/shared/ticket-delivery-settings/models/release-frequency.enum';
import {
  TicketDeliverySettingsRule,
  TicketReminderSettings,
} from '@fz-original/app/shared/ticket-delivery-settings/models/ticket-delivery-settings.model';
import {
  durationTriggerInFutureValidator,
  getMinDateFromSlots,
  getTimezoneFromRule,
} from '@fz-original/app/shared/ticket-delivery-settings/ticket-delivery-settings.utils';
import * as moment from 'moment-timezone';

import { DelayedTicketReleaseFormGroup, DelayedTicketReleaseFormValue } from './delayed-ticket-release-section.types';

export function createDelayedTicketReleaseFormGroup(): DelayedTicketReleaseFormGroup {
  return new FormGroup({
    durationAmount: new FormControl<number | null>(null),
    durationUnit: new FormControl<DurationUnit>(DurationUnit.HOURS, { nonNullable: true }),
    enabled: new FormControl<boolean>(false, { nonNullable: true }),
    isSeatingBlocked: new FormControl<boolean>(false, { nonNullable: true }),
    releaseDatetime: new FormControl<string>('', { nonNullable: true }),
    releaseMode: new FormControl<'ONE_TIME' | 'PER_TIME_SLOT'>('ONE_TIME', { nonNullable: true }),
    releaseTimingEnabled: new FormControl<boolean>(true, { nonNullable: true }),
    ruleName: new FormControl<string>('', { nonNullable: true }),
    settingsId: new FormControl<string | null>(null),
  });
}

export function patchDelayedTicketReleaseFromRule(
  formGroup: DelayedTicketReleaseFormGroup,
  rule: TicketDeliverySettingsRule,
  fallbackTimezone: string,
): void {
  const release = rule.ticketReleaseSettings;
  const planTimezone = getTimezoneFromRule(rule, fallbackTimezone);
  if (!release) {
    formGroup.reset();
    formGroup.controls.settingsId.setValue(rule.ticketDeliverySettings.id);
    formGroup.controls.ruleName.setValue(rule.ticketDeliverySettings.name);
    return;
  }

  const releaseMode = getReleaseModeFromFrequency(release.releaseFrequency);
  const releaseTimingEnabled = getReleaseTimingEnabledFromFrequency(release.releaseFrequency);

  let releaseDatetime = '';
  if (releaseMode === 'ONE_TIME' && release.releaseAt && planTimezone) {
    releaseDatetime = moment.utc(release.releaseAt).tz(planTimezone).format('YYYY-MM-DDTHH:mm');
  }

  formGroup.patchValue({
    durationAmount: release.durationBeforeTimeSlot?.amount ?? null,
    durationUnit: release.durationBeforeTimeSlot?.unit ?? DurationUnit.HOURS,
    enabled: true,
    isSeatingBlocked: release.isSeatingBlocked,
    releaseDatetime,
    releaseMode,
    releaseTimingEnabled,
    ruleName: rule.ticketDeliverySettings.name,
    settingsId: rule.ticketDeliverySettings.id,
  });
}

export function syncDelayedTicketReleaseValidators(
  formGroup: DelayedTicketReleaseFormGroup,
  rule: TicketDeliverySettingsRule | null,
  fallbackTimezone: string,
  fallbackFirstActiveTimeSlot: string | null,
): void {
  const { durationAmount, enabled, releaseDatetime, releaseMode, releaseTimingEnabled } = formGroup.controls;

  releaseDatetime.clearValidators();
  durationAmount.clearValidators();

  if (enabled.value && releaseTimingEnabled.value) {
    const tz = getTimezoneFromRule(rule, fallbackTimezone);
    const ruleSlots = rule?.ticketDeliverySettings.mainPlans.map(p => p.firstActiveTimeSlot) ?? [];
    const firstSlot = ruleSlots.length > 0 ? getMinDateFromSlots(ruleSlots) : fallbackFirstActiveTimeSlot;
    const reminderSettings = rule?.ticketReminderSettings ?? null;

    if (releaseMode.value === 'ONE_TIME') {
      releaseDatetime.setValidators([
        Validators.required,
        releaseDatetimeBeforeFirstTimeSlotValidator(tz, firstSlot),
        releaseDatetimeInFutureValidator(tz),
        releaseBeforeReminderDatetimeValidator(tz, firstSlot, reminderSettings),
      ]);
    } else {
      durationAmount.setValidators([
        Validators.required,
        Validators.min(1),
        durationTriggerInFutureValidator(formGroup.controls.durationUnit, firstSlot),
        releaseBeforeReminderDurationValidator(formGroup.controls.durationUnit, firstSlot, reminderSettings),
      ]);
    }
  }

  releaseDatetime.updateValueAndValidity({ emitEvent: false });
  durationAmount.updateValueAndValidity({ emitEvent: false });
}

export function buildReleaseFrequencyFromForm(formValue: DelayedTicketReleaseFormValue): ReleaseFrequency {
  if (!formValue.releaseTimingEnabled) {
    return ReleaseFrequency.BLOCKED;
  }
  return formValue.releaseMode === 'ONE_TIME' ? ReleaseFrequency.ONE_TIME : ReleaseFrequency.PER_TIME_SLOT;
}

export function buildReleaseAtUtc(formValue: DelayedTicketReleaseFormValue, planTimezone: string): string | null {
  if (!formValue.releaseTimingEnabled || formValue.releaseMode !== 'ONE_TIME') {
    return null;
  }
  if (!formValue.releaseDatetime) {
    return null;
  }
  return moment.tz(formValue.releaseDatetime, planTimezone).utc().toISOString();
}

export function buildDurationBeforeTimeSlot(formValue: DelayedTicketReleaseFormValue): { amount: number; unit: string } | null {
  if (!formValue.releaseTimingEnabled || formValue.releaseMode !== 'PER_TIME_SLOT') {
    return null;
  }
  if (formValue.durationAmount == null || formValue.durationAmount <= 0) {
    return null;
  }
  return { amount: formValue.durationAmount, unit: formValue.durationUnit };
}

export function releaseDatetimeBeforeFirstTimeSlotValidator(planTimezone: string, firstActiveTimeSlot: string | null): ValidatorFn {
  return (control: FormControl<string>): ValidationErrors | null => {
    if (!firstActiveTimeSlot) {
      return { noActiveTimeSlot: true };
    }
    const datetime = control.value;
    if (!datetime || !planTimezone) {
      return null;
    }

    const releaseAtUtc = moment.tz(datetime, planTimezone).utc();
    return releaseAtUtc.isBefore(moment.utc(firstActiveTimeSlot)) ? null : { releaseBeforeEvent: true };
  };
}

export function releaseDatetimeInFutureValidator(planTimezone: string): ValidatorFn {
  return (control: FormControl<string>): ValidationErrors | null => {
    const datetime = control.value;
    if (!datetime || !planTimezone) {
      return null;
    }

    const releaseAtUtc = moment.tz(datetime, planTimezone).utc();
    return releaseAtUtc.isAfter(moment.utc()) ? null : { pastTrigger: true };
  };
}

function getReleaseModeFromFrequency(frequency: ReleaseFrequency): 'ONE_TIME' | 'PER_TIME_SLOT' {
  return frequency === ReleaseFrequency.PER_TIME_SLOT ? 'PER_TIME_SLOT' : 'ONE_TIME';
}

function getReleaseTimingEnabledFromFrequency(frequency: ReleaseFrequency): boolean {
  return frequency !== ReleaseFrequency.BLOCKED;
}

function getReminderTriggerDate(firstActiveTimeSlot: string, reminderSettings: TicketReminderSettings): moment.Moment {
  const { amount, unit } = reminderSettings.durationBeforeTimeSlot;
  return moment.utc(firstActiveTimeSlot).subtract(amount, unit as moment.unitOfTime.DurationConstructor);
}

export function releaseBeforeReminderDatetimeValidator(
  planTimezone: string,
  firstActiveTimeSlot: string | null,
  reminderSettings: TicketReminderSettings | null,
): ValidatorFn {
  return (control: FormControl<string>): ValidationErrors | null => {
    if (!firstActiveTimeSlot) {
      return { noActiveTimeSlot: true };
    }
    const datetime = control.value;
    if (!datetime || !planTimezone || !reminderSettings) {
      return null;
    }

    const releaseTrigger = moment.tz(datetime, planTimezone).utc();
    const reminderTrigger = getReminderTriggerDate(firstActiveTimeSlot, reminderSettings);
    return releaseTrigger.isBefore(reminderTrigger) ? null : { releaseBeforeReminder: true };
  };
}

export function releaseBeforeReminderDurationValidator(
  durationUnitControl: FormControl<DurationUnit>,
  firstActiveTimeSlot: string | null,
  reminderSettings: TicketReminderSettings | null,
): ValidatorFn {
  return (control: FormControl<number | null>): ValidationErrors | null => {
    if (!firstActiveTimeSlot) {
      return { noActiveTimeSlot: true };
    }
    const amount = control.value;
    if (amount == null || amount <= 0 || !reminderSettings) {
      return null;
    }

    const unit = durationUnitControl.value as moment.unitOfTime.DurationConstructor;
    const releaseTrigger = moment.utc(firstActiveTimeSlot).subtract(amount, unit);
    const reminderTrigger = getReminderTriggerDate(firstActiveTimeSlot, reminderSettings);
    return releaseTrigger.isBefore(reminderTrigger) ? null : { releaseBeforeReminder: true };
  };
}

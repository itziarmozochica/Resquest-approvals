import { FormControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import * as moment from 'moment-timezone';

import { DurationUnit } from './models/duration-unit.enum';
import { TicketDeliverySettingsRule } from './models/ticket-delivery-settings.model';

export function getTimezoneFromRule(rule: TicketDeliverySettingsRule | null, fallback: string): string {
  return rule?.ticketDeliverySettings.mainPlans[0]?.timezone ?? fallback;
}

export function getMinDateFromSlots(slots: (string | null | undefined)[]): string | null {
  if (!slots.length || slots.some(s => !s)) {
    return null;
  }
  return (slots as string[]).reduce((min, s) => (s < min ? s : min));
}

export function resolveMainPlanIds(
  groupingFormValue: { groupAcrossPlans: boolean; mainPlanIds: number[] },
  fallbackMainPlanId: number,
): number[] {
  if (groupingFormValue.groupAcrossPlans && groupingFormValue.mainPlanIds.length > 0) {
    return groupingFormValue.mainPlanIds;
  }
  return [fallbackMainPlanId];
}

export function durationTriggerInFutureValidator(
  durationUnitControl: FormControl<DurationUnit>,
  firstActiveTimeSlot: string | null,
): ValidatorFn {
  return (control: FormControl<number | null>): ValidationErrors | null => {
    if (!firstActiveTimeSlot) {
      return { noActiveTimeSlot: true };
    }
    const amount = control.value;
    if (amount == null || amount <= 0) {
      return null;
    }

    const unit = durationUnitControl.value as moment.unitOfTime.DurationConstructor;
    const triggerDate = moment.utc(firstActiveTimeSlot).subtract(amount, unit);
    return triggerDate.isAfter(moment.utc()) ? null : { pastTrigger: true };
  };
}

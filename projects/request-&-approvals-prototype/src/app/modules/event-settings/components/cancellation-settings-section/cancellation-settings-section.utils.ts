import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

import {
  CANCELLATION_HOURS_ERRORS_BY_PRIORITY,
  CANCELLATION_HOURS_MAX,
  CANCELLATION_HOURS_MIN,
  CANCELLATION_SETTINGS_CONTROL_NAMES,
} from './cancellation-settings-section.constants';
import {
  CancellationHoursError,
  CancellationSettingsFormControls,
  CancellationSettingsFormGroup,
  CancellationSettingsFormHost,
  CancellationSettingsFormValue,
} from './cancellation-settings-section.types';

export function createCancellationSettingsControls(value: CancellationSettingsFormValue): CancellationSettingsFormControls {
  const allowTicketCancellations = new FormControl<boolean>(value.allowTicketCancellations, { nonNullable: true });
  const hoursBeforeSessionCancellationNotAllowed = new FormControl<number | null>(value.hoursBeforeSessionCancellationNotAllowed, {
    validators: [createCancellationHoursWhenAllowedValidator(allowTicketCancellations)],
  });

  allowTicketCancellations.valueChanges.subscribe(() => {
    hoursBeforeSessionCancellationNotAllowed.updateValueAndValidity();
  });

  return { allowTicketCancellations, hoursBeforeSessionCancellationNotAllowed };
}

export function createCancellationSettingsFormGroup(value: CancellationSettingsFormValue): CancellationSettingsFormGroup {
  return new FormGroup(createCancellationSettingsControls(value));
}

export function createCancellationHoursWhenAllowedValidator(allowTicketCancellations: AbstractControl<boolean>): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    allowTicketCancellations.value === true ? validateCancellationHours(control) : null;
}

export function getCancellationHoursError(errors: ValidationErrors | null): CancellationHoursError | null {
  if (errors === null) {
    return null;
  }
  return CANCELLATION_HOURS_ERRORS_BY_PRIORITY.find((error: CancellationHoursError) => errors[error] === true) ?? null;
}

export function isCancellationSettingsFormHost(form: FormGroup): form is FormGroup & CancellationSettingsFormHost {
  return CANCELLATION_SETTINGS_CONTROL_NAMES.every((name: keyof CancellationSettingsFormControls) => form.get(name) instanceof FormControl);
}

export function toCancellationHours(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string' && value.trim().length === 0) {
    return null;
  }
  return Number(value);
}

export function validateCancellationHours(control: AbstractControl): ValidationErrors | null {
  const hours = toCancellationHours(control.value);
  if (hours === null) {
    return { hoursRequired: true };
  }
  if (!Number.isInteger(hours)) {
    return { hoursInteger: true };
  }
  if (hours < CANCELLATION_HOURS_MIN || hours > CANCELLATION_HOURS_MAX) {
    return { hoursRange: true };
  }
  return null;
}

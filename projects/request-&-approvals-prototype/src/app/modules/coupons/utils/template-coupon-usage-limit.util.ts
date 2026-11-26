import { AbstractControl, ValidationErrors } from '@angular/forms';

import { inputIntegerOptionalGreaterThanZero } from '@fz-original/app/shared/validators/input-integer-optional-greater-than-zero';

export function usageLimitValidator(control: AbstractControl): ValidationErrors | null {
  if (Number.isNaN(control.value) || inputIntegerOptionalGreaterThanZero(control) === null) {
    return null;
  }
  return { positiveInteger: true };
}

export function toUsageLimitValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function formatUsageLimit(value: number | null): string {
  return value === null ? '∞' : String(value);
}

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Stricter than fever2's NumberValidator on purpose: `float(value)` there also accepts surrounding spaces and `1_000`,
// which are rejected here. Like fever2, a non-finite result (`1e999`) is rejected. Keep it stricter, not equal.
const NUMBER_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

export const numberTypeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value: unknown = control.value;

  if (value === null || value === undefined || value === '') {
    return null;
  }

  const text = String(value);

  return NUMBER_PATTERN.test(text) && Number.isFinite(Number(text)) ? null : { number: true };
};

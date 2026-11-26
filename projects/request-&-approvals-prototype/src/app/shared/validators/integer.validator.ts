import { AbstractControl, ValidationErrors } from '@angular/forms';

export function integerValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = Number(value);
  if (Number.isNaN(num) || !Number.isInteger(num)) {
    return { integer: true };
  }
  return null;
}

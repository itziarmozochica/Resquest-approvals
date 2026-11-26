import { AbstractControl, ValidationErrors } from '@angular/forms';

import { coercePositiveIntegerOrNull } from '../utils/number.util';

export function inputIntegerOptionalGreaterThanZero(control: AbstractControl): ValidationErrors | null {
  if (control.value === null || control.value === '' || control.value === undefined) {
    return null;
  }

  return coercePositiveIntegerOrNull(Number(control.value)) === null ? { invalidNumber: true } : null;
}

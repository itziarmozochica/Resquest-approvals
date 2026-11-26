import { ValidatorFn } from '@angular/forms';

import { SelectOption } from '../../../../../shared/layout/filters/select/select.interface';

export function maxArrayLengthValidator(max: number): ValidatorFn {
  return control => {
    const value = control.value as SelectOption[];
    return Array.isArray(value) && value.length > max ? { maxLength: true } : null;
  };
}

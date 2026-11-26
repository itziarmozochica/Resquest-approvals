import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { outflowConstraints } from './outflow.constants';

export function outflowValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const controlValue = control.value;
    const isEmpty = controlValue === null || controlValue === undefined || controlValue === '';
    if (isEmpty && !control.touched) return null;
    if (isEmpty) return { invalidOutflow: true };
    const numericOutflow = Number(controlValue);
    if (!Number.isFinite(numericOutflow) || numericOutflow < outflowConstraints.min) {
      return { invalidOutflow: true };
    }
    if (numericOutflow > outflowConstraints.max) {
      return { maxOutflowExceeded: true };
    }
    return null;
  };
}

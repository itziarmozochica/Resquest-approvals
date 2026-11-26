import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function checkboxRequiredValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    return control.value === 'true' || control.value === null ? null : { invalidValue: true };
  };
}

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function multipleChoiceRequiredValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control || !control.value || control.value.length === 0) {
      return { required: true };
    }

    return null;
  };
}

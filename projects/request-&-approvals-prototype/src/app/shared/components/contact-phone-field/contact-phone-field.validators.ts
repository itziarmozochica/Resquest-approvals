import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import { isValidPhoneNumber } from 'libphonenumber-js';
import { merge } from 'rxjs';

export function phoneRequiredValidator(): ValidatorFn {
  return (control: AbstractControl<string | null>): ValidationErrors | null => (control.value ? null : { required: true });
}

export function phoneFormatValidator(): ValidatorFn {
  return (control: AbstractControl<string | null>): ValidationErrors | null =>
    control.value && !isValidPhoneNumber(control.value) ? { tel: true } : null;
}

export function requireEmailOrPhone(
  emailControl: AbstractControl<string | null>,
  phoneControl: AbstractControl<string | null>,
  emailValidators: ValidatorFn[],
  destroyRef: DestroyRef,
): void {
  let isUpdating = false;
  const updateValidators = (): void => {
    if (isUpdating) {
      return;
    }
    isUpdating = true;
    const isEmailEmpty = !emailControl.value || emailControl.value.trim() === '';
    const isPhoneEmpty = !phoneControl.value;
    emailControl.setValidators(isPhoneEmpty ? [Validators.required, ...emailValidators] : [...emailValidators]);
    phoneControl.setValidators(isEmailEmpty ? [phoneRequiredValidator(), phoneFormatValidator()] : [phoneFormatValidator()]);
    emailControl.updateValueAndValidity({ emitEvent: emailControl.touched });
    phoneControl.updateValueAndValidity({ emitEvent: phoneControl.touched });
    isUpdating = false;
  };
  merge(emailControl.valueChanges, phoneControl.valueChanges).pipe(takeUntilDestroyed(destroyRef)).subscribe(updateValidators);
}

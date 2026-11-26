import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function emailValidator(message?: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const local = "(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*)";
    const domain = '(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])+)';
    const email_regexp = new RegExp(`^${local}@${domain}$`, 'i');

    const emailValidated = email_regexp.test(control.value);
    return emailValidated || control.value == '' ? null : { emailValidator: { value: control.value, message } };
  };
}

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string;

    if (!value) {
      return null;
    }

    if (!value.startsWith('+')) {
      return { phone: { error: 'mustStartWithPlus', value } };
    }

    const firstDigitMatch = value.match(/^\+(\d)/);
    if (!firstDigitMatch || firstDigitMatch[1] === '0') {
      return { phone: { error: 'firstDigitInvalid', value } };
    }

    if (!/^\+[1-9][\d\s\-()]*$/.test(value)) {
      return { phone: { error: 'invalidCharacters', value } };
    }

    if (value.length < 8) {
      return { phone: { error: 'tooShort', value, minLength: 8 } };
    }

    const digitsOnly = value.replace(/[^\d]/g, '');
    if (digitsOnly.length > 14) {
      return { phone: { error: 'tooManyDigits', value, actual: digitsOnly.length, max: 14 } };
    }

    return null;
  };
}

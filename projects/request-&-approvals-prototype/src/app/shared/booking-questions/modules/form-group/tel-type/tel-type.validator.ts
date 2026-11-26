import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { CountryCode as LibPhoneNumberCountryCode, parsePhoneNumberWithError, PhoneNumber } from 'libphonenumber-js';

import { TelTypeValue } from '../../../models';

export function telRequiredValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as TelTypeValue;

    if (!value || !value.phone) {
      return { required: true };
    }

    return null;
  };
}

export function telFormatValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as TelTypeValue;
    let phone: PhoneNumber;

    if (value && value.phone && value.country) {
      try {
        phone = parsePhoneNumberWithError(value.phone, value.country.toUpperCase() as LibPhoneNumberCountryCode);
      } catch (e) {
        return { tel: true };
      }

      if (!phone.isValid()) {
        return { tel: true };
      }
    }

    return null;
  };
}

export function countryValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as TelTypeValue;
    if (value && value.phone && (!value.country || !value.prefix)) {
      return { country: true };
    }

    return null;
  };
}

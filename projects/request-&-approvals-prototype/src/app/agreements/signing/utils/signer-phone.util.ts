import { TelTypeValue } from '@fz-original/app/shared/booking-questions/models';
import { CountryCode, parsePhoneNumberWithError } from 'libphonenumber-js';

export function toE164PhoneNumber(value: TelTypeValue | null): string | null {
  if (value === null || value.phone === null || value.phone.length === 0 || value.country === null) {
    return null;
  }
  try {
    return parsePhoneNumberWithError(value.phone, value.country.toUpperCase() as CountryCode).number; // the country comes from the phone component's own country list
  } catch {
    return null;
  }
}

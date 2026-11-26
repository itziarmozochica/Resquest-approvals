import { CountryCode } from 'libphonenumber-js';

export interface PhoneFieldState {
  country: CountryCode | null;
  nationalNumber: string;
  value: string;
}

export interface PhoneFieldCountryOption {
  callingCode: string;
  country: CountryCode;
  flag: string;
  label: string;
  searchText: string;
}

export const PHONE_FIELD_INTERNATIONAL_PREFIX = '+';
export const PHONE_FIELD_INTERNATIONAL_DIALING_PREFIX = '00';

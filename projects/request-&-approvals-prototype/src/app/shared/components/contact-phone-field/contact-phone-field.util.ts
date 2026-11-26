import {
  AsYouType,
  CountryCode,
  getCountryCallingCode,
  getExampleNumber,
  isSupportedCountry,
  parsePhoneNumberFromString,
  PhoneNumber,
} from 'libphonenumber-js';
import metadata from 'libphonenumber-js/metadata.min.json';
import examples from 'libphonenumber-js/mobile/examples';

import { TelTypeCountryCode } from '../../booking-questions/models/tel-type-country-code';
import {
  PHONE_FIELD_INTERNATIONAL_DIALING_PREFIX,
  PHONE_FIELD_INTERNATIONAL_PREFIX,
  PhoneFieldCountryOption,
  PhoneFieldState,
} from './contact-phone-field.model';

const REGIONAL_INDICATOR_A = 0x1f1e6;
const LATIN_A = 'A'.charCodeAt(0);
const COUNTRIES_BY_CALLING_CODE: Record<string, string[] | undefined> = metadata.country_calling_codes;
const CALLING_CODE_QUERY = /^\+?\d+$/;
const COUNTRY_CODE_ALIASES: Readonly<Record<string, string | undefined>> = { UK: 'GB' };
const DIACRITICS = /[̀-ͯ]/g;

export function toCountryCode(iso: string | null | undefined): CountryCode | null {
  const upperIso = (iso ?? '').toUpperCase();
  const isoCode = COUNTRY_CODE_ALIASES[upperIso] ?? upperIso;
  return isSupportedCountry(isoCode) ? isoCode : null;
}

export function toFlagEmoji(country: CountryCode): string {
  return String.fromCodePoint(...[...country].map(letter => REGIONAL_INDICATOR_A + letter.charCodeAt(0) - LATIN_A));
}

export function toCountryOptions(countryCodes: TelTypeCountryCode[]): PhoneFieldCountryOption[] {
  return countryCodes.flatMap(countryCode => {
    const country = toCountryCode(countryCode.id);
    if (country === null) {
      return [];
    }
    return [
      {
        callingCode: getCountryCallingCode(country),
        country,
        flag: toFlagEmoji(country),
        label: countryCode.countryName,
        searchText: toSearchText(`${countryCode.countryName} ${country}`),
      },
    ];
  });
}

export function filterCountryOptions(options: PhoneFieldCountryOption[], query: string): PhoneFieldCountryOption[] {
  const trimmedQuery = query.trim();
  if (trimmedQuery === '') {
    return options;
  }
  if (CALLING_CODE_QUERY.test(trimmedQuery)) {
    const callingCode = trimmedQuery.replace(PHONE_FIELD_INTERNATIONAL_PREFIX, '');
    return options.filter(option => option.callingCode.startsWith(callingCode));
  }

  const searchText = toSearchText(trimmedQuery);
  return options.filter(option => option.searchText.includes(searchText));
}

export function toPrefixLabel(option: PhoneFieldCountryOption | null): string {
  return option === null ? '' : `${option.flag} ${PHONE_FIELD_INTERNATIONAL_PREFIX}${option.callingCode}`;
}

export function toExampleNationalNumber(country: CountryCode | null): string {
  return country === null ? '' : (getExampleNumber(country, examples)?.formatNational() ?? '');
}

export function toPhoneDisplay(value: string): string {
  return parsePhoneNumberFromString(value)?.formatInternational() ?? value;
}

export function emptyPhoneFieldState(country: CountryCode | null): PhoneFieldState {
  return { country, nationalNumber: '', value: '' };
}

export function toPhoneFieldState(value: string | null | undefined, fallbackCountry: CountryCode | null): PhoneFieldState {
  if (!value) {
    return emptyPhoneFieldState(fallbackCountry);
  }

  const phoneNumber = parsePhoneNumberFromString(value);
  if (phoneNumber === undefined) {
    return { country: fallbackCountry, nationalNumber: value, value };
  }

  return {
    country: phoneNumber.country ?? toMainCountry(phoneNumber.countryCallingCode) ?? fallbackCountry,
    nationalNumber: toNationalDisplay(phoneNumber),
    value,
  };
}

export function readPhoneInput(text: string, currentCountry: CountryCode | null): PhoneFieldState {
  const digits = text.replace(/\D/g, '');
  const trimmedText = text.trim();
  if (digits === '') {
    return { ...emptyPhoneFieldState(currentCountry), nationalNumber: trimmedText === PHONE_FIELD_INTERNATIONAL_PREFIX ? trimmedText : '' };
  }

  if (trimmedText.startsWith(PHONE_FIELD_INTERNATIONAL_PREFIX)) {
    return readInternationalNumber(digits, currentCountry, trimmedText);
  }
  if (trimmedText.startsWith(PHONE_FIELD_INTERNATIONAL_DIALING_PREFIX)) {
    return readInternationalNumber(digits.slice(PHONE_FIELD_INTERNATIONAL_DIALING_PREFIX.length), currentCountry, trimmedText);
  }
  return readNationalNumber(digits, currentCountry);
}

export function changePhoneCountry(state: PhoneFieldState, nextCountry: CountryCode): PhoneFieldState {
  if (state.value === '') {
    return emptyPhoneFieldState(nextCountry);
  }
  return readNationalNumber(state.nationalNumber.replace(/\D/g, ''), nextCountry);
}

export function toInternationalPhoneNumber(text: string, currentValue: string, defaultCountry: string | null): string {
  const currentCountry = toPhoneFieldState(currentValue, toCountryCode(defaultCountry)).country;
  return readPhoneInput(text.trim(), currentCountry).value;
}

function readNationalNumber(digits: string, country: CountryCode | null): PhoneFieldState {
  if (digits === '') {
    return emptyPhoneFieldState(country);
  }
  if (country === null) {
    return { country, nationalNumber: digits, value: `${PHONE_FIELD_INTERNATIONAL_PREFIX}${digits}` };
  }

  const asYouType = new AsYouType(country);
  const typedNationalNumber = asYouType.input(digits);
  const phoneNumber = asYouType.getNumber();
  return {
    country,
    nationalNumber: phoneNumber?.isPossible() ? toNationalDisplay(phoneNumber) : typedNationalNumber,
    value: phoneNumber?.number ?? `${PHONE_FIELD_INTERNATIONAL_PREFIX}${getCountryCallingCode(country)}${digits}`,
  };
}

function readInternationalNumber(digits: string, currentCountry: CountryCode | null, typedText: string): PhoneFieldState {
  const asYouType = new AsYouType();
  asYouType.input(`${PHONE_FIELD_INTERNATIONAL_PREFIX}${digits}`);
  const callingCode = asYouType.getCallingCode();
  const country = resolveCountry(asYouType.getCountry(), callingCode, currentCountry);
  const state = readNationalNumber(callingCode === undefined ? '' : asYouType.getNationalNumber(), country);
  return state.value === '' ? { ...state, nationalNumber: typedText } : state;
}

function resolveCountry(
  detected: CountryCode | undefined,
  callingCode: string | undefined,
  current: CountryCode | null,
): CountryCode | null {
  if (detected !== undefined) {
    return detected;
  }
  if (callingCode === undefined || (current !== null && getCountryCallingCode(current) === callingCode)) {
    return current;
  }
  return toMainCountry(callingCode) ?? current;
}

function toMainCountry(callingCode: string): CountryCode | null {
  return toCountryCode(COUNTRIES_BY_CALLING_CODE[callingCode]?.[0]);
}

function toNationalDisplay(phoneNumber: PhoneNumber): string {
  const callingCodePrefix = `${PHONE_FIELD_INTERNATIONAL_PREFIX}${phoneNumber.countryCallingCode}`;
  return phoneNumber.formatInternational().replace(callingCodePrefix, '').trim();
}

function toSearchText(text: string): string {
  return text.normalize('NFD').replace(DIACRITICS, '').toLowerCase();
}

import { CountryCode, parsePhoneNumberWithError } from 'libphonenumber-js';

const prefixSeparator = '|';

export interface TelAnswer {
  country: string;
  national: string;
  prefix: string;
}

/** A tel answer travels as `['{prefix}|{national}', '{country}']`, the encoding the checkout produces. */
export function parseTelAnswer(value: string[]): TelAnswer | null {
  const [prefixed, country] = value;
  if (!prefixed) {
    return null;
  }

  const separatorIndex = prefixed.indexOf(prefixSeparator);
  if (separatorIndex === -1) {
    return null;
  }

  return { country: country ?? '', national: prefixed.slice(separatorIndex + 1), prefix: prefixed.slice(0, separatorIndex) };
}

export function toTelInput(value: string[]): string {
  const tel = parseTelAnswer(value);

  return tel ? `${tel.prefix}${tel.national}` : (value[0] ?? '');
}

export function formatTelAnswer(value: string[]): string {
  const tel = parseTelAnswer(value);
  if (!tel) {
    return value.join(', ');
  }

  try {
    return parsePhoneNumberWithError(`${tel.prefix}${tel.national}`).formatInternational();
  } catch {
    return `${tel.prefix} ${tel.national}`;
  }
}

export function toTelAnswerValue(input: string, fallbackCountry: string): string[] | null {
  const trimmed = input.trim();
  if (trimmed === '') {
    return null;
  }

  try {
    // Safe: an unknown code only makes the parser throw, which the catch below already answers for.
    const parsed = parsePhoneNumberWithError(trimmed, (fallbackCountry.toUpperCase() || undefined) as CountryCode | undefined);
    if (!parsed.isValid()) {
      return null;
    }

    return [`+${parsed.countryCallingCode}${prefixSeparator}${parsed.nationalNumber}`, parsed.country ?? fallbackCountry];
  } catch {
    return null;
  }
}

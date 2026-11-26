const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HAS_OFFSET_PATTERN = /(?:Z|[+-]\d{2}:\d{2})$/;

export function toOffsetDateTime(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  if (HAS_OFFSET_PATTERN.test(value)) {
    return value;
  }
  if (DATE_ONLY_PATTERN.test(value)) {
    return `${value}T00:00:00${localOffset(localMidnight(value))}`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return `${value}${localOffset(parsed)}`;
}

export function toDateInputValue(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  if (DATE_ONLY_PATTERN.test(value)) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return localDateParts(parsed);
}

export function todayInputValue(): string {
  return localDateParts(new Date());
}

export function parseAgreementDateTime(value: string): Date | null {
  const parsed = DATE_ONLY_PATTERN.test(value) ? localMidnight(value) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function localDateParts(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function localMidnight(dateOnly: string): Date {
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function localOffset(date: Date): string {
  const totalMinutes = -date.getTimezoneOffset();
  const sign = totalMinutes < 0 ? '-' : '+';
  const absolute = Math.abs(totalMinutes);
  return `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

const INTEGER_PATTERN = /^-?\d+$/;

export function toNullableInteger(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) ? value : null;
  }
  return parseSafeInteger(value);
}

function parseSafeInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!INTEGER_PATTERN.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

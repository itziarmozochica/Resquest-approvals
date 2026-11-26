const REDACTED = '[redacted]';
const REDACTED_KEYS: readonly string[] = ['ctx', 'input'];

export function redactValidationErrorValues(payload: unknown): unknown {
  if (!isRecord(payload) || !Array.isArray(payload.detail)) {
    return payload;
  }

  return { ...payload, detail: payload.detail.map(redactDetailEntry) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function redactDetailEntry(entry: unknown): unknown {
  if (!isRecord(entry)) {
    return entry;
  }

  return Object.fromEntries(Object.entries(entry).map(([key, value]) => [key, REDACTED_KEYS.includes(key) ? REDACTED : value]));
}

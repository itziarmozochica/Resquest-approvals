// Runtime-defensive primitives shared by the per-block DTO codecs: the wire
// payload is a JSONField the backend does not validate structurally, so every
// scalar read falls back to a per-type neutral default.

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function asNonEmptyString(value: unknown, fallback: () => string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback();
}

export function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

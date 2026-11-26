import type { VersionJson } from './version-check.model';

export function isVersionJson(value: unknown): value is VersionJson {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    typeof value.version === 'string' &&
    'hash' in value &&
    typeof value.hash === 'string' &&
    'autosync' in value &&
    typeof value.autosync === 'boolean'
  );
}

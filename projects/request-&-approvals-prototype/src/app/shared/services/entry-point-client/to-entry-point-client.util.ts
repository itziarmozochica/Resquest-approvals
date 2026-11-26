import { EntryPointClient } from '@fz-original/app/app/enums/entry-point-client.enum';

const ENTRY_POINT_CLIENTS: readonly string[] = Object.values(EntryPointClient);

function isEntryPointClient(value: unknown): value is EntryPointClient {
  return typeof value === 'string' && ENTRY_POINT_CLIENTS.includes(value);
}

/** Narrows a value the native app sent to a known {@link EntryPointClient}, or `null` for anything else. */
export function toEntryPointClient(value: unknown): EntryPointClient | null {
  return isEntryPointClient(value) ? value : null;
}

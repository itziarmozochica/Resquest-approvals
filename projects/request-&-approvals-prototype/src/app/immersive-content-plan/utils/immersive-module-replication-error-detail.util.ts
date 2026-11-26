import type { ReplicationItemError } from '../models/immersive-module-replication.model';

// An item error explains itself in one of two shapes: a translation gap (`locale`, `key`) or a
// schema violation (`path`, `message`). Either is shown as it came.
export function formatReplicationErrorDetail(error: ReplicationItemError): string {
  if (error.locale !== undefined || error.key !== undefined) {
    return `${error.locale ?? '—'} · ${error.key ?? '—'}`;
  }
  return [error.path, error.message].filter(part => part !== undefined && part !== '').join(': ');
}

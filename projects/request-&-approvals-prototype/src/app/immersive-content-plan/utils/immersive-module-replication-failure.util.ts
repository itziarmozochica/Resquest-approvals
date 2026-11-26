import { HttpErrorResponse } from '@angular/common/http';

import { TimeoutError } from 'rxjs';

import type { ReplicationItemError } from '../models/immersive-module-replication.model';
import type { ModuleReplicationFailure } from '../models/store/immersive-module-replication-store.model';

const KEY_PREFIX = 'planEdition.immersiveContentPlan.replication.';

export const GENERIC_FAILURE: ModuleReplicationFailure = { errors: [], messageKey: `${KEY_PREFIX}errorDescription` };

const ITEM_ERROR_FIELDS = ['key', 'locale', 'message', 'path'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// The body is server data and other layers answer a 422 in their own shape, so anything that is not
// the documented `{ detail: { errors: [...] } }` yields no details instead of throwing.
function itemErrorsOf(body: unknown): ReplicationItemError[] {
  const errors = isRecord(body) && isRecord(body['detail']) ? body['detail']['errors'] : undefined;
  if (!Array.isArray(errors)) {
    return [];
  }
  return errors.filter(isRecord).flatMap(item => {
    const known: ReplicationItemError = {};
    for (const field of ITEM_ERROR_FIELDS) {
      const value = item[field];
      if (typeof value === 'string') {
        known[field] = value;
      }
    }
    return Object.keys(known).length > 0 ? [known] : [];
  });
}

// Why a module-level request failed, for everything but a 403 (the store handles that one on its own).
export function failureFromError(error: unknown): ModuleReplicationFailure {
  if (error instanceof TimeoutError) {
    return { errors: [], messageKey: `${KEY_PREFIX}timeoutDescription` };
  }
  if (error instanceof HttpErrorResponse && error.status === 422) {
    return { errors: itemErrorsOf(error.error), messageKey: `${KEY_PREFIX}rejectedDescription` };
  }
  return GENERIC_FAILURE;
}

import { normalizeError, type BaseResponse } from '@fz/http-models';

import type { AgreementPermission, AgreementPermissionsApi } from '../models/agreement-permissions.model';

/**
 * The `data === null` / `data !== null` distinction is load-bearing and must survive the mapping:
 * an **empty array is an answer** ("the engine resolved nothing for this pair"), while `null` means
 * *no answer at all*. Collapsing the missing answer to `[]` would make a failed request look like a
 * clean refusal.
 */
export function adaptAgreementPermissions(response: BaseResponse<AgreementPermissionsApi>): BaseResponse<AgreementPermission[]> {
  return { data: adaptPermissions(response.data), error: normalizeError(response.error) };
}

function adaptPermissions(data: AgreementPermissionsApi | null | undefined): AgreementPermission[] | null {
  if (data === null || data === undefined) {
    return null;
  }
  return data.permissions ?? null;
}

import { normalizeError, type BaseResponse } from '@fz/http-models';

import type { MfaRecovery, MfaRecoveryApi } from '../models/mfa-recovery.model';

export function adaptMfaRecovery(response: BaseResponse<MfaRecoveryApi>): BaseResponse<MfaRecovery> {
  return { data: adaptMfaRecoveryData(response.data), error: normalizeError(response.error) };
}

function adaptMfaRecoveryData(data: MfaRecoveryApi | null | undefined): MfaRecovery | null {
  if (data === null || data === undefined) {
    return null;
  }
  return { token: data.token, userId: data.user_id };
}

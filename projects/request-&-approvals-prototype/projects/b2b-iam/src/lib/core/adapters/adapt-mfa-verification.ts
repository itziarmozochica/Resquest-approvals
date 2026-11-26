import { normalizeError, type BaseResponse } from '@fz/http-models';

import type { MfaVerification, MfaVerificationApi } from '../models/mfa-verification.model';

export function adaptMfaVerification(response: BaseResponse<MfaVerificationApi>): BaseResponse<MfaVerification> {
  return { data: adaptMfaVerificationData(response.data), error: normalizeError(response.error) };
}

function adaptMfaVerificationData(data: MfaVerificationApi | null | undefined): MfaVerification | null {
  if (data === null || data === undefined) {
    return null;
  }
  return { recoveryCodes: data.recovery_codes ?? null, token: data.token, userId: data.user_id };
}

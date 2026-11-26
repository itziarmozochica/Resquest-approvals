import { normalizeError, type BaseResponse } from '@fz/http-models';

import type { MfaEnrollment, MfaEnrollmentApi } from '../models/mfa-enrollment.model';

export function adaptMfaEnrollment(response: BaseResponse<MfaEnrollmentApi>): BaseResponse<MfaEnrollment> {
  return { data: adaptMfaEnrollmentData(response.data), error: normalizeError(response.error) };
}

function adaptMfaEnrollmentData(data: MfaEnrollmentApi | null | undefined): MfaEnrollment | null {
  if (data === null || data === undefined) {
    return null;
  }
  return { enrollmentId: data.enrollment_id, secret: data.secret, uri: data.uri };
}

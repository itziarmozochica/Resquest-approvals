import { normalizeError, type BaseResponse } from '@fz/http-models';

import type { Login, LoginApi } from '../models/login.model';

export function adaptLogin(response: BaseResponse<LoginApi>): BaseResponse<Login> {
  return { data: adaptLoginData(response.data), error: normalizeError(response.error) };
}

function adaptLoginData(data: LoginApi | null | undefined): Login | null {
  if (data === null || data === undefined) {
    return null;
  }
  return {
    enrollmentId: data.enrollment_id,
    nextStep: data.next_step,
    token: data.token,
    userId: data.user_id,
  };
}

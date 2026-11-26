import { normalizeError, type BaseResponse } from '@fz/http-models';

import type { OneboxLogin, OneboxLoginApi } from '../models/onebox-login.model';

export function adaptOneboxLogin(response: BaseResponse<OneboxLoginApi>): BaseResponse<OneboxLogin> {
  return { data: adaptOneboxLoginData(response.data), error: normalizeError(response.error) };
}

function adaptOneboxLoginData(data: OneboxLoginApi | null | undefined): OneboxLogin | null {
  if (data === null || data === undefined) {
    return null;
  }
  return { organizationId: data.organization_id, token: data.token, userId: data.user_id };
}

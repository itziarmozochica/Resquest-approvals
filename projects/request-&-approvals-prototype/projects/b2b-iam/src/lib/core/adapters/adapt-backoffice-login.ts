import { normalizeError, type BaseResponse } from '@fz/http-models';

import type { BackofficeLogin, BackofficeLoginApi } from '../models/backoffice-login.model';

export function adaptBackofficeLogin(response: BaseResponse<BackofficeLoginApi>): BaseResponse<BackofficeLogin> {
  return { data: adaptBackofficeLoginData(response.data), error: normalizeError(response.error) };
}

function adaptBackofficeLoginData(data: BackofficeLoginApi | null | undefined): BackofficeLogin | null {
  if (data === null || data === undefined) {
    return null;
  }
  return { token: data.token, userId: data.user_id };
}

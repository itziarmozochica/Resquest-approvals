import { normalizeError, type BaseResponse } from '@fz/http-models';

import type { SsoLogin, SsoLoginApi } from '../models/sso-login.model';

export function adaptSsoLogin(response: BaseResponse<SsoLoginApi>): BaseResponse<SsoLogin> {
  return { data: adaptSsoLoginData(response.data), error: normalizeError(response.error) };
}

function adaptSsoLoginData(data: SsoLoginApi | null | undefined): SsoLogin | null {
  if (data === null || data === undefined) {
    return null;
  }
  return { redirectTo: data.redirect_to };
}

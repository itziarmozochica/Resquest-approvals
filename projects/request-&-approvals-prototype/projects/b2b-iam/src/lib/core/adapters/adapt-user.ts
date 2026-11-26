import { normalizeError, type BaseResponse } from '@fz/http-models';

import type { User, UserApi, UserBusiness, UserBusinessApi } from '../models/user.model';

export function adaptUser(response: BaseResponse<UserApi>): BaseResponse<User> {
  return { data: adaptUserData(response.data), error: normalizeError(response.error) };
}

function adaptUserData(data: UserApi | null | undefined): User | null {
  if (data === null || data === undefined) {
    return null;
  }
  return {
    business: adaptBusiness(data.business),
    email: data.email,
    id: data.id,
    isTestAccount: data.is_test_account ?? false,
    name: data.name,
    username: data.username,
  };
}

function adaptBusiness(business: UserBusinessApi | null | undefined): UserBusiness | null {
  if (business === null || business === undefined) {
    return null;
  }
  return { email: business.email, id: business.id, name: business.name };
}

import { mapUserMfaStatusFromApi, UserMfaStatus } from './user-mfa.model';
import { UserData } from './user.model';

export interface UserSecuritySnapshot {
  readonly mfa: UserMfaStatus | null;
  readonly ssoEnabled: boolean;
}

export function mapSsoEnabledFromApi(data: Pick<UserData, 'sso_enabled'> | null | undefined): boolean {
  return data?.sso_enabled === true;
}

export function mapUserSecurityFromApi(data: UserData | null | undefined): UserSecuritySnapshot {
  return {
    mfa: data?.mfa == null ? null : mapUserMfaStatusFromApi(data.mfa),
    ssoEnabled: mapSsoEnabledFromApi(data),
  };
}

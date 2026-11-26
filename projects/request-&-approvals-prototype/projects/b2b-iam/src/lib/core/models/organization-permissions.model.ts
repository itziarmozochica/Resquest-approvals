import type { AgreementPermission } from './agreement-permissions.model';

export interface OrganizationPermissionsApi {
  permissions?: OrganizationPermission[];
}

export type OrganizationPermission = AgreementPermission;

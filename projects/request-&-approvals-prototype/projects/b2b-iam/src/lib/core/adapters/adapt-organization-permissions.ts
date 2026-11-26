import { normalizeError, type BaseResponse } from '@fz/http-models';

import type { OrganizationPermission, OrganizationPermissionsApi } from '../models/organization-permissions.model';

export function adaptOrganizationPermissions(response: BaseResponse<OrganizationPermissionsApi>): BaseResponse<OrganizationPermission[]> {
  return { data: adaptPermissions(response.data), error: normalizeError(response.error) };
}

function adaptPermissions(data: OrganizationPermissionsApi | null | undefined): OrganizationPermission[] | null {
  if (data === null || data === undefined) {
    return null;
  }
  return data.permissions ?? null;
}

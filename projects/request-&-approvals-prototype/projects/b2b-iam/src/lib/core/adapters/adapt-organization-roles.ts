import { normalizeError, type BaseResponse } from '@fz/http-models';

import type { OrganizationRole, OrganizationRoleApi, OrganizationRolesApi } from '../models/organization-role.model';

/** Maps the roles listing to the domain shape. A body without `roles` is no answer, not an empty set. */
export function adaptOrganizationRoles(response: BaseResponse<OrganizationRolesApi>): BaseResponse<OrganizationRole[]> {
  return { data: adaptRoles(response.data), error: normalizeError(response.error) };
}

function adaptRoles(data: OrganizationRolesApi | null | undefined): OrganizationRole[] | null {
  if (data?.roles === undefined) {
    return null;
  }
  return data.roles.map(adaptRole);
}

function adaptRole(role: OrganizationRoleApi): OrganizationRole {
  return {
    id: role.id,
    label: role.label,
    ...(typeof role.description === 'string' && role.description !== '' ? { description: role.description } : {}),
  };
}

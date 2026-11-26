import type {
  CreateOrganizationUser,
  CreateOrganizationUserRequest,
  UpdateOrganizationUser,
  UpdateOrganizationUserRequest,
} from '../models/organization-user.model';

/**
 * Maps a new member to the wire body. Always grants every resource: scoping a member to some plans or
 * venues is not something this client offers.
 */
export function toCreateOrganizationUserRequest(user: CreateOrganizationUser): CreateOrganizationUserRequest {
  return { email: user.email.trim(), name: user.name.trim(), resource_access_type: 'all-resources', role_id: user.roleId };
}

/** Maps a member update to the wire body. A blank name is left out, so the stored one stays. */
export function toUpdateOrganizationUserRequest(user: UpdateOrganizationUser): UpdateOrganizationUserRequest {
  const name = user.name.trim();
  return {
    ...(name === '' ? {} : { name }),
    plan_ids: null,
    resource_access_type: user.resourceAccessType,
    role_id: user.roleId,
    venue_ids: null,
  };
}

import { normalizeError, type BaseResponse } from '@fz/http-models';

import type {
  CreatedOrganizationUser,
  CreatedOrganizationUserApi,
  OrganizationUser,
  OrganizationUserApi,
  OrganizationUsersApi,
  OrganizationUsersPage,
  OrganizationUserStatus,
} from '../models/organization-user.model';

/** Maps the members listing to the domain shape. A body without `users` is no answer, not an empty page. */
export function adaptOrganizationUsers(response: BaseResponse<OrganizationUsersApi>): BaseResponse<OrganizationUsersPage> {
  return { data: adaptOrganizationUsersData(response.data), error: normalizeError(response.error) };
}

/** Maps the create reply, which carries the new member's id either wrapped or bare. */
export function adaptCreatedOrganizationUser(response: BaseResponse<CreatedOrganizationUserApi>): BaseResponse<CreatedOrganizationUser> {
  return { data: adaptCreatedData(response.data), error: normalizeError(response.error) };
}

function adaptOrganizationUsersData(data: OrganizationUsersApi | null | undefined): OrganizationUsersPage | null {
  if (data?.users === undefined) {
    return null;
  }
  return { total: data.count, users: data.users.map(adaptOrganizationUser) };
}

function adaptOrganizationUser(user: OrganizationUserApi): OrganizationUser {
  return {
    email: user.email,
    id: user.id,
    joinedAt: user.joined_at ?? null,
    name: user.name,
    resourceAccessType: user.resource_access_type,
    roleId: user.role_id,
    status: adaptStatus(user.status_in_organization),
  };
}

/** Anything but `active` reads as inactive: a member the client cannot classify must not look able to sign in. */
function adaptStatus(status: string): OrganizationUserStatus {
  return status === 'active' ? 'active' : 'inactive';
}

function adaptCreatedData(data: CreatedOrganizationUserApi | null | undefined): CreatedOrganizationUser | null {
  if (typeof data === 'number') {
    return { userId: data };
  }
  if (data === null || data === undefined || typeof data.user_id !== 'number') {
    return null;
  }
  return { userId: data.user_id };
}

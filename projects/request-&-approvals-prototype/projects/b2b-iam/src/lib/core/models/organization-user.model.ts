/** Whether a member can sign in to the organization. */
export type OrganizationUserStatus = 'active' | 'inactive';

/** The resource scope a member's role applies to, in the wire vocabulary. */
export type OrganizationUserResourceAccessType = 'all-resources' | 'specific-plan' | 'specific-venue';

/** Raw payload of one `users[]` entry of `GET /1.0/organizations/{organization_id}/users`, snake_case. */
export interface OrganizationUserApi {
  email: string;
  id: number;
  name: string;
  resource_access_type: string;
  role_id: string;
  status_in_organization: string;
  joined_at?: string | null;
}

/** Raw payload of `GET /1.0/organizations/{organization_id}/users`, snake_case. */
export interface OrganizationUsersApi {
  count: number;
  users?: OrganizationUserApi[];
}

/** Raw payload of `POST /1.0/organizations/{organization_id}/users`: older replies answer the bare id. */
export type CreatedOrganizationUserApi = { user_id: number } | number;

/** One member of an organization. */
export interface OrganizationUser {
  readonly email: string;
  readonly id: number;
  /** When the member joined the organization, ISO 8601 with offset; `null` when b2b-iam does not know. */
  readonly joinedAt: string | null;
  readonly name: string;
  readonly resourceAccessType: string;
  readonly roleId: string;
  readonly status: OrganizationUserStatus;
}

/** One page of an organization's members, with the total across every page. */
export interface OrganizationUsersPage {
  readonly total: number;
  readonly users: readonly OrganizationUser[];
}

/** Paging and narrowing for `GET /1.0/organizations/{organization_id}/users`, 1-based. */
export interface OrganizationUsersQuery {
  readonly itemsPerPage?: number;
  readonly page?: number;
  /** Matches the member's name or email. */
  readonly search?: string;
  readonly status?: OrganizationUserStatus;
}

/** A member to add to an organization, with access to all of its resources. */
export interface CreateOrganizationUser {
  readonly email: string;
  readonly name: string;
  readonly roleId: string;
}

/** The member a create answered with. */
export interface CreatedOrganizationUser {
  readonly userId: number;
}

/** A member's new name and role, keeping the resource scope the member already has. */
export interface UpdateOrganizationUser {
  readonly name: string;
  readonly resourceAccessType: string;
  readonly roleId: string;
}

/** Body of `POST /1.0/organizations/{organization_id}/users`. Wire format, snake_case. */
export interface CreateOrganizationUserRequest {
  readonly email: string;
  readonly name: string;
  readonly resource_access_type: OrganizationUserResourceAccessType;
  readonly role_id: string;
}

/** Body of `PUT /1.0/organizations/{organization_id}/users/{user_id}`. Wire format, snake_case. */
export interface UpdateOrganizationUserRequest {
  /** Required by b2b-iam even when null. Null lists no plans, which only an `all-resources` member may send. */
  readonly plan_ids: readonly number[] | null;
  readonly resource_access_type: string;
  readonly role_id: string;
  /** Required by b2b-iam even when null. Null lists no venues, which only an `all-resources` member may send. */
  readonly venue_ids: readonly number[] | null;
  readonly name?: string;
}

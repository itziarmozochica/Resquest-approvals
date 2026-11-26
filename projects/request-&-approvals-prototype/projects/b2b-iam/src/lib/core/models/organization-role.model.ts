/** Raw payload of one `roles[]` entry of `GET /1.0/organizations/{organization_id}/roles`, snake_case. */
export interface OrganizationRoleApi {
  id: string;
  label: string;
  description?: string | null;
  is_public?: boolean;
}

/** Raw payload of `GET /1.0/organizations/{organization_id}/roles`, snake_case. */
export interface OrganizationRolesApi {
  roles?: OrganizationRoleApi[];
}

/** A role an organization can assign, keyed by its stable `label` (e.g. `distributor_admin`). */
export interface OrganizationRole {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
}

/** Filters for `GET /1.0/organizations/{organization_id}/roles`. */
export interface OrganizationRolesQuery {
  /** Also list roles the organization does not offer for assignment. */
  readonly includeHidden?: boolean;
}

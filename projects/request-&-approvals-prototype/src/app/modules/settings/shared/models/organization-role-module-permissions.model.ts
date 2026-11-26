/**
 * IAM response for `GET .../organizations/{id}/roles/{roleId}/modules/permissions`.
 * Used by Role Management v2 when wiring real permission data (dependencies drive UX warnings).
 */
export interface OrganizationRoleModulePermission {
  readonly dependencies: string[];
  readonly enabled: boolean;
  readonly id: string;
  readonly is_managed_by_fever: boolean;
}

export interface OrganizationRoleModule {
  readonly module: string;
  readonly permissions: OrganizationRoleModulePermission[];
}

export interface OrganizationRoleModulesPermissionsPayload {
  readonly modules: OrganizationRoleModule[];
}

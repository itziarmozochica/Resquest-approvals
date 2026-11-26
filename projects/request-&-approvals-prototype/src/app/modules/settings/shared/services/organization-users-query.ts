export interface OrganizationUsersQuery {
  organizationId: number;
  itemsPerPage?: number;
  page?: number;
  search?: string;
  status?: string;
  roleIds?: string[];
}

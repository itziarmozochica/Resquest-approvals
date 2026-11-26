import type { UserOrganizationCategory, UserOrganizationOperatingPlatform } from '@fz/b2b-iam';

export interface UserOrganizationQuery {
  includeRole?: boolean;
  itemsPerPage?: number;
  omitPagination?: boolean;
  operatingPlatform?: UserOrganizationOperatingPlatform;
  organizationCategory?: UserOrganizationCategory;
  organizationIds?: number[];
  page?: number;
  search?: string | null;
  showDeleted?: boolean;
  showBookingAgents?: boolean;
  strictMembership?: boolean;
  userId: number;
  withPermission?: string;
}

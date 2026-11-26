import { normalizeError, type BaseResponse } from '@fz/http-models';

import type { UserOrganization, UserOrganizationListing, UserOrganizationsApi } from '../models/user-organization.model';

export function adaptUserOrganizations(response: BaseResponse<UserOrganizationsApi>): BaseResponse<UserOrganization[]> {
  return { data: adaptOrganizations(response.data), error: normalizeError(response.error) };
}

export function adaptUserOrganizationListing(response: BaseResponse<UserOrganizationsApi>): BaseResponse<UserOrganizationListing> {
  const organizations = adaptOrganizations(response.data);
  const data = organizations === null ? null : { organizations, otherOperatingPlatforms: response.data?.other_operating_platforms ?? [] };

  return { data, error: normalizeError(response.error) };
}

function adaptOrganizations(data: UserOrganizationsApi | null | undefined): UserOrganization[] | null {
  if (data === null || data === undefined) {
    return null;
  }
  return (data.organizations ?? []).map(organization => ({
    category: organization.category,
    id: organization.id,
    name: organization.name,
    ...(organization.partner_organization_ids === undefined ? {} : { partnerOrganizationIds: organization.partner_organization_ids }),
  }));
}

import type { UserOrganizationOperatingPlatform } from '@fz/b2b-iam';

import { Organization, OrganizationData } from './organization.model';

export interface OrganizationSummaryData {
  count: number;
  organizations: OrganizationData[];
  other_operating_platforms?: UserOrganizationOperatingPlatform[];
}

export class OrganizationSummary {
  constructor(
    public total: number,
    public organizations: Organization[],
    public otherOperatingPlatforms: UserOrganizationOperatingPlatform[] = [],
  ) {}
}

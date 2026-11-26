import type { UserOrganizationCategory } from '@fz/b2b-iam';

import { NameData } from '../data/data.model';
import { OrganizationTypeEnum } from '../partner/organization-type.enum';

export interface OrganizationData extends NameData<number> {
  category?: UserOrganizationCategory;
  city_code: number;
  country_code: string;
  deleted_at?: string | null;
  partner_organization_ids?: number[];
  type: OrganizationTypeEnum;
  user_role_in_organization?: string | null;
}

export class Organization {
  constructor(
    public id: number,
    public name: string,
    public countryCode: string,
    public cityCode: number,
    public type: OrganizationTypeEnum,
    public deletedAt?: string | null,
    public userRoleInOrganization?: string | null,
    public category?: UserOrganizationCategory,
    public partnerOrganizationIds?: number[],
  ) {}

  isDeleted(): boolean {
    return this.deletedAt !== null && this.deletedAt !== undefined;
  }
}

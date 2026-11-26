import { OrganizationUserResourceAccessTypeEnum } from './organization-user-resource-access-type.enum';
import { OrganizationUserStatusEnum } from './organization-user-status.enum';
import { OrganizationUserTypeEnum } from './organization-user-type.enum';
import { OrganizationUserWhitelabelResource } from './organization-user-whitelabel-resource.model';

export interface OrganizationUserData {
  count: number;
  users: {
    id: number;
    name: string;
    email: string;
    status_in_organization: OrganizationUserStatusEnum;
    role_id: string;
    resource_access_type: OrganizationUserResourceAccessTypeEnum;
    venue_ids: number[] | null;
    plan_ids: number[] | null;
    whitelabel_resources?: { whitelabel_id: string; whitelabel_role: string }[] | null;
    type: OrganizationUserTypeEnum;
    joined_at?: string | null;
  }[];
}

export class OrganizationUser {
  constructor(
    public id: number,
    public name: string,
    public email: string,
    public status: OrganizationUserStatusEnum,
    public roleId: string,
    public resourceAccessType: OrganizationUserResourceAccessTypeEnum,
    public placeIds?: number[] | null,
    public planIds?: number[] | null,
    public apiKey?: string | null,
    public hasExistingApiKey?: boolean,
    public whitelabelResources: OrganizationUserWhitelabelResource[] = [],
    public type: OrganizationUserTypeEnum = OrganizationUserTypeEnum.REGULAR,
    public joinedAt: string | null = null,
  ) {}

  isActive(): boolean {
    return this.status === OrganizationUserStatusEnum.ACTIVE;
  }

  isOriginal(): boolean {
    return this.type === OrganizationUserTypeEnum.ORIGINAL;
  }
}

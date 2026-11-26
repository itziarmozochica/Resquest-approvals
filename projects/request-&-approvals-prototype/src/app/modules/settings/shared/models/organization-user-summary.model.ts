import { OrganizationUser } from './organization-user.model';

export class OrganizationUserSummary {
  constructor(
    public total: number,
    public users: OrganizationUser[],
  ) {}
}

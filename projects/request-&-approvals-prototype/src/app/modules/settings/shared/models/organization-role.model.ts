export interface OrganizationRoleData {
  roles: {
    id: string;
    is_public: boolean;
    label: string;
    active_users_count?: number;
    description?: string;
    is_custom_role?: boolean;
  }[];
}

export class OrganizationRole {
  constructor(
    public id: string,
    public label: string,
    public isPublic?: boolean,
    public activeUserCount?: number,
    public isCustomRole?: boolean,
    public description?: string,
  ) {}
}

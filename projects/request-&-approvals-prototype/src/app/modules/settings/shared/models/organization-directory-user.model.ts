export interface OrganizationDirectoryUserDto {
  id: number;
  name: string;
  email: string;
}

export interface OrganizationDirectoryUserData {
  count: number;
  users: OrganizationDirectoryUserDto[];
}

export class OrganizationDirectoryUser {
  constructor(
    public id: number,
    public name: string,
    public email: string,
  ) {}
}

export class OrganizationDirectoryUserSummary {
  constructor(
    public total: number,
    public users: OrganizationDirectoryUser[],
  ) {}
}

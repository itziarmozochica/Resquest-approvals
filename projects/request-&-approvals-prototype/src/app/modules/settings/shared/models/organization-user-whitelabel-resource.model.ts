export const WHITELABEL_CONTENT_MANAGER_ROLE = 'whitelabel_content_manager';

export interface OrganizationUserWhitelabelResourceData {
  whitelabel_id: string;
  whitelabel_role: string;
}

export class OrganizationUserWhitelabelResource {
  constructor(
    public whitelabelId: string,
    public whitelabelRole: string = WHITELABEL_CONTENT_MANAGER_ROLE,
  ) {}
}

/*  eslint-disable @typescript-eslint/naming-convention */
import { OrganizationTypeEnum } from '../../../../shared/models/partner/organization-type.enum';

export class MixpanelIdentifyData {
  constructor(
    public partner_id: number,
    public partner_country: string,
    public partner_name: string,
    public user_id: number,
    public user_name: string,
    public user_email: string,
    public device: string,
    public device_type: string,
    public email_staff: string,
    public organization_type: OrganizationTypeEnum,
  ) {}
}

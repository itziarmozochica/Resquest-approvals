/* eslint-disable @typescript-eslint/naming-convention */
import { Partner } from '../../../models/partner/partner.model';

export class VisitorTraits {
  email: string;
  first_name: string;
  country: string;
  partner_id: number;

  constructor(
    public user_id: number,
    partner: Partner,
  ) {
    this.email = partner.email;
    this.first_name = partner.name;
    this.country = partner.countryCode;
    this.partner_id = partner.id;
  }
}

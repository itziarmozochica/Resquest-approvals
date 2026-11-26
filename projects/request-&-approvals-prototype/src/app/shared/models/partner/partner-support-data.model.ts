export type PartnerSupportDataInterface = {
  officeHoursBegin?: Date;
  officeHoursEnd?: Date;
  phone?: string;
  guideLinkLanguage?: string;
  whatsapp?: string;
  contactLink?: string;
  contactEmailLink?: string;
};

export class PartnerSupportData implements PartnerSupportDataInterface {
  constructor(
    public officeHoursBegin?: Date,
    public officeHoursEnd?: Date,
    public guideLinkLanguage?: string,
    public phone?: string,
    public whatsapp?: string,
    public contactLink?: string,
    public contactEmailLink?: string,
    public guideLink?: string,
  ) {}
}

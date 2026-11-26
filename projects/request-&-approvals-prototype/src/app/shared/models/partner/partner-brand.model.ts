export interface PartnerBrandData {
  kiosk_logo_header: string;
  feverzone_logo_header: string;
}

export class PartnerBrand {
  constructor(
    public kioskLogoHeader: string,
    public feverzoneLogoHeader: string,
  ) {}
}

import { Injectable } from '@angular/core';

import { Partner } from '../../models/partner/partner.model';
import { DEFAULT_PARTNER_LOGO, PARTNER_LOGO_BY_COUNTRY } from './partner-logo.constants';

@Injectable({ providedIn: 'root' })
export class PartnerLogoService {
  /** The partner's brand logo first; a country logo (India's) only replaces Fever's own default. */
  resolvePartnerLogo(partner: Partner | null): string {
    const countryLogo = partner?.countryCode ? PARTNER_LOGO_BY_COUNTRY.get(partner.countryCode) : undefined;
    return partner?.brand?.feverzoneLogoHeader || countryLogo || DEFAULT_PARTNER_LOGO;
  }
}

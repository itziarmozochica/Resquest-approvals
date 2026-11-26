import { Injectable } from '@angular/core';

import { getSharedCookieDomain } from '@fz-original/app/shared/utils/cookie-domain.util';

import { RealTimeFiltersEmbeddedSelection } from '../models/real-time-embedded-selection.model';

@Injectable()
export class RealTimeFiltersCookieService {
  static readonly cookieKey = 'real_time_reports_selection';

  saveSelection(selection: RealTimeFiltersEmbeddedSelection): void {
    const value = encodeURIComponent(JSON.stringify(selection));
    document.cookie = this.#buildCookieString(value);
  }

  #buildCookieString(value: string): string {
    const segments: Array<string> = [`${RealTimeFiltersCookieService.cookieKey}=${value}`, 'Path=/', 'SameSite=Lax'];

    const domain = getSharedCookieDomain();
    if (domain !== null) {
      segments.push(`Domain=${domain}`);
    }

    if (window.location.protocol === 'https:') {
      segments.push('Secure');
    }

    return segments.join('; ');
  }
}

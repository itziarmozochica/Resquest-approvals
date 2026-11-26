import { Injectable } from '@angular/core';

import { getSharedCookieDomain } from '../../shared/utils/cookie-domain.util';

/**
 * Owns the only cookie that ever carries the session bearer token: `b2b_embedded_auth_token`,
 * which is how the Insights Portal iframe authenticates against the Insights API (B2BP-105).
 *
 * The cookie has to be readable by JavaScript on a sibling subdomain, so it can be neither
 * `HttpOnly` nor host-only — it is scoped to the whole registrable domain
 * (see {@link getSharedCookieDomain}). Everything else about it is therefore kept as tight as the
 * portal contract allows:
 *
 * - `SameSite=Strict` — the portal is embedded from a page on the same registrable domain, so the
 *   iframe and its own requests stay same-site and still receive the cookie. What `Strict` does
 *   drop is the cookie on **cross-site top-level navigations** into any host of that domain, which
 *   is what the SSO redirect and the Odoo POS hand-off perform.
 * - no `Max-Age` on write — a browser-session cookie, never persisted to disk.
 * - deleted from a single place, so the session layer can revoke it on logout instead of depending
 *   on a component's `ngOnDestroy` running.
 *
 * Lives in `core/authentication` rather than next to the embed because the token's lifetime belongs
 * to the session, not to the reporting feature: `AuthenticationService.clearData()` clears this on
 * every logout, expiry and reset.
 */
@Injectable({
  providedIn: 'root',
})
export class SessionTokenCookieStore {
  static readonly cookieKey = 'b2b_embedded_auth_token';

  clear(): void {
    document.cookie = this.#buildCookieString('', { expire: true });
  }

  save(token: string): void {
    document.cookie = this.#buildCookieString(encodeURIComponent(token));
  }

  #buildCookieString(value: string, options: { expire?: boolean } = {}): string {
    const segments: Array<string> = [`${SessionTokenCookieStore.cookieKey}=${value}`, 'Path=/', 'SameSite=Strict'];

    const domain = getSharedCookieDomain();
    if (domain !== null) {
      segments.push(`Domain=${domain}`);
    }

    if (window.location.protocol === 'https:') {
      segments.push('Secure');
    }

    if (options.expire === true) {
      segments.push('Max-Age=0');
    }

    return segments.join('; ');
  }
}

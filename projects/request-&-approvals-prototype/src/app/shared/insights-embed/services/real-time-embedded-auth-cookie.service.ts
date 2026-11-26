import { inject, Injectable, OnDestroy } from '@angular/core';

import { AuthenticationService } from '@fz-original/app/core/authentication/authentication.service';
import { SessionTokenCookieStore } from '@fz-original/app/core/authentication/session-token-cookie.store';

/**
 * Publishes the session token to the embed cookie for as long as a Real Time surface is mounted.
 *
 * The cookie itself is owned by {@link SessionTokenCookieStore}, so the session layer can revoke it
 * on logout without knowing this surface exists. This service only decides *when* the token is
 * published: page-scoped, cleared when the page that provides it is destroyed.
 */
@Injectable()
export class RealTimeEmbeddedAuthCookieService implements OnDestroy {
  static readonly cookieKey = SessionTokenCookieStore.cookieKey;

  readonly #authenticationService = inject(AuthenticationService);
  readonly #cookieStore = inject(SessionTokenCookieStore);

  clearToken(): void {
    this.#cookieStore.clear();
  }

  ngOnDestroy(): void {
    this.clearToken();
  }

  saveToken(): void {
    const token = this.#authenticationService.getToken();
    if (token === null) {
      this.clearToken();
      return;
    }
    this.#cookieStore.save(token);
  }
}

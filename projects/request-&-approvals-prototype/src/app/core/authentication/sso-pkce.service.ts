import { inject, Injectable } from '@angular/core';

import { StorageKey } from '@fz-original/app/app/enums/storage.enum';
import { STORAGE_SERVICE } from '@fz/storage';

import { SsoPkceCodes } from './sso-pkce-codes.model';

const CODE_VERIFIER_BYTES = 32;

/**
 * Mints the PKCE pair for the SSO login (RFC 7636) and keeps the verifier alive across the
 * redirect to the identity provider.
 *
 * The verifier goes to `STORAGE_SERVICE`, the same store that already holds the session token,
 * and it is single-use: `consume` deletes it, and a login that starts without PKCE clears it. Two
 * tabs starting SSO at the same time would share one entry and the older tab's callback would
 * fail, which costs a retry on a flow that redirects the tab it runs in.
 *
 * `store` reads back what it wrote and says whether it stuck, because a browser with storage
 * blocked (Firefox ETP strict, private windows, partitioned frames — FEVERZONE-1B0) makes the
 * write a silent no-op. The caller needs that answer *before* it sends a challenge, since a
 * challenge with no verifier to redeem it is a login that cannot complete.
 *
 * The verifier is 32 random bytes in base64url, which lands on 43 characters of the unreserved
 * set — the shortest length RFC 7636 allows and the only shape b2b-iam accepts.
 */
@Injectable({
  providedIn: 'root',
})
export class SsoPkceService {
  readonly #storage = inject(STORAGE_SERVICE);

  consume(): string | null {
    const codeVerifier = this.#storage.get<string>(StorageKey.ssoCodeVerifier);
    this.forget();
    return codeVerifier;
  }

  forget(): void {
    this.#storage.remove(StorageKey.ssoCodeVerifier);
  }

  async generate(): Promise<SsoPkceCodes> {
    const codeVerifier = this.#randomCodeVerifier();
    return { codeChallenge: await this.#challengeFor(codeVerifier), codeVerifier };
  }

  store(codeVerifier: string): boolean {
    this.#storage.set(StorageKey.ssoCodeVerifier, codeVerifier);
    return this.#storage.get<string>(StorageKey.ssoCodeVerifier) === codeVerifier;
  }

  async #challengeFor(codeVerifier: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
    return this.#toBase64Url(new Uint8Array(digest));
  }

  #randomCodeVerifier(): string {
    const bytes = new Uint8Array(CODE_VERIFIER_BYTES);
    crypto.getRandomValues(bytes);
    return this.#toBase64Url(bytes);
  }

  #toBase64Url(bytes: Uint8Array): string {
    const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
}

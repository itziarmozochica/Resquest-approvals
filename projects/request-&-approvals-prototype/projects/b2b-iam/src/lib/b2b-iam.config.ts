import { InjectionToken } from '@angular/core';

export interface B2bIamConfig {
  /** b2b-iam base URL (e.g. `environment.apiIamBaseUrl`), prepended to every request path. */
  baseUrl: string;
  /**
   * Sent as the `X-Client-Version` header on every request. b2b-iam enforces a minimum
   * client version and rejects a missing one with `MIN_VERSION_REQUIREMENT`.
   *
   * The prefix is the consumer's, and it decides which app b2b-iam thinks it is talking
   * to and which floor applies: FeverZone sends `w.<version>` and B2BM sends
   * `d.<version>`, each with its own minimum on the b2b-iam side. The library only
   * forwards the string.
   */
  clientVersion: string;
  /**
   * Storage key the auth token is persisted under. Consumer-owned so B2BM never
   * collides with FeverZone's `'token'`.
   */
  tokenKey: string;
}

export const B2B_IAM_CONFIG = new InjectionToken<B2bIamConfig>('B2B_IAM_CONFIG');

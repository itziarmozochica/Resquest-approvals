import type { Provider } from '@angular/core';

import { B2bIamAuthClient } from './b2b-iam-auth-client.service';
import { B2B_IAM_CONFIG, type B2bIamConfig } from './b2b-iam.config';

/**
 * Root providers for `@fz/b2b-iam`.
 *
 * Registers the {@link B2bIamAuthClient} facade and the {@link B2B_IAM_CONFIG}
 * value. Consumers must also provide `HttpClient` (e.g. `provideHttpClient()`).
 *
 * @example
 * ```ts
 * providers: [
 *   provideHttpClient(),
 *   provideB2bIam({ baseUrl: environment.apiIamBaseUrl, tokenKey: 'b2bm.token' }),
 * ]
 * ```
 */
export function provideB2bIam(config: B2bIamConfig): Provider[] {
  return [B2bIamAuthClient, { provide: B2B_IAM_CONFIG, useValue: config }];
}

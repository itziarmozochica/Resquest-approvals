import type { Provider } from '@angular/core';

import { provideB2bIam } from '@fz/b2b-iam';

import packageJson from '../../../../../package.json';
import { environment } from '../../../../environments/environment';
import { BusinessInitializationService } from './business-initialization.service';
import { DISTRIBUTOR_SESSION_CAPABLE } from './distributor-session-capable.token';

export function provideBusinessInitialization(): Provider[] {
  return [
    ...provideB2bIam({
      baseUrl: environment.apiIamBaseUrl,
      clientVersion: `w.${packageJson.version}`,
      tokenKey: 'token',
    }),
    BusinessInitializationService,
    { provide: DISTRIBUTOR_SESSION_CAPABLE, useValue: true },
  ];
}

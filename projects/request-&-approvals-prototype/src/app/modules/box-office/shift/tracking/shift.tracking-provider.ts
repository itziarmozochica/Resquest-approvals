import { type Provider } from '@angular/core';

import { feverzoneContextFactory } from '@fz-original/app/core/factories/feverzone-context.factory';
import { provideTracking, withContext, withMixpanel } from '@fz/fz-tracking/src/public-api';

import { shiftMixpanelMappers } from './shift.mixpanel.mappers';

export const shiftTrackingProvider = (): Provider[] =>
  provideTracking(withContext(feverzoneContextFactory), withMixpanel(shiftMixpanelMappers));

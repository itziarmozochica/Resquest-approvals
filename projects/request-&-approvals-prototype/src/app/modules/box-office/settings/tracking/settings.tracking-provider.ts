import { type Provider } from '@angular/core';

import { feverzoneContextFactory } from '@fz-original/app/core/factories/feverzone-context.factory';
import { provideTracking, withContext, withMixpanel } from '@fz/fz-tracking/src/public-api';

import { settingsMixpanelMappers } from './settings.mixpanel.mappers';

export const settingsTrackingProvider = (): Provider[] =>
  provideTracking(withContext(feverzoneContextFactory), withMixpanel(settingsMixpanelMappers));

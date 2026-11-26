import { type Provider } from '@angular/core';

import { feverzoneContextFactory } from '@fz-original/app/core/factories/feverzone-context.factory';
import { provideTracking, withContext, withMixpanel } from '@fz/fz-tracking/src/public-api';

import { contentPlanTranslationsMixpanelMappers } from './content-plan-translations.mixpanel.mappers';

export const contentPlanTranslationsTrackingProvider = (): Provider[] =>
  provideTracking(withContext(feverzoneContextFactory), withMixpanel(contentPlanTranslationsMixpanelMappers));

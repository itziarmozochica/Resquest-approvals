import { type Provider } from '@angular/core';

import { feverzoneContextFactory } from '@fz-original/app/core/factories/feverzone-context.factory';
import { dynamicFieldsMixpanelMappers } from '@fz-original/app/shared/dynamic-fields/tracking/dynamic-fields.mixpanel.mappers';
import { provideTracking, withContext, withMixpanel } from '@fz/fz-tracking/src/public-api';

import { planMixpanelMappers } from './plan.mixpanel.mappers';

export const planTrackingProvider = (): Provider[] =>
  provideTracking(withContext(feverzoneContextFactory), withMixpanel([...planMixpanelMappers, ...dynamicFieldsMixpanelMappers]));

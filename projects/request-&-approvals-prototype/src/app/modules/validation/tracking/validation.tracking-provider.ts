import { type Provider } from '@angular/core';

import { provideTracking, withMixpanel } from '@fz/fz-tracking/src/public-api';

import { validationMixpanelMappers } from './validation.mixpanel.mappers';

export const validationTrackingProvider = (): Provider[] => provideTracking(withMixpanel(validationMixpanelMappers));

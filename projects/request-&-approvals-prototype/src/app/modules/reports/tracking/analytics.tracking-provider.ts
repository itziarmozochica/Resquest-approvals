import { type Provider } from '@angular/core';

import { provideTracking, withMixpanel } from '@fz/fz-tracking/src/public-api';

import { reportsMixpanelMappers } from './reports.mixpanel.mappers';

export const analyticsTrackingProvider = (): Provider[] => provideTracking(withMixpanel(reportsMixpanelMappers));

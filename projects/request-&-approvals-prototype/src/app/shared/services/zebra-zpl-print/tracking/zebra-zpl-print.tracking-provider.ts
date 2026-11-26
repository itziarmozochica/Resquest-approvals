import { type Provider } from '@angular/core';

import { provideTracking, withMixpanel } from '@fz/fz-tracking/src/public-api';

import { zebraZplPrintMixpanelMappers } from './zebra-zpl-print.mixpanel.mappers';

export const zebraZplPrintTrackingProvider = (): Provider[] => provideTracking(withMixpanel(zebraZplPrintMixpanelMappers));

import { createEnvironmentInjector, EnvironmentInjector, inject, InjectionToken } from '@angular/core';

import { FzTrackingService } from '@fz/fz-tracking/src/public-api';

import { zebraZplPrintTrackingProvider } from '../tracking/zebra-zpl-print.tracking-provider';

export const ZEBRA_ZPL_PRINT_TRACKING = new InjectionToken<FzTrackingService>('ZEBRA_ZPL_PRINT_TRACKING', {
  providedIn: 'root',
  factory: () => createEnvironmentInjector(zebraZplPrintTrackingProvider(), inject(EnvironmentInjector)).get(FzTrackingService),
});

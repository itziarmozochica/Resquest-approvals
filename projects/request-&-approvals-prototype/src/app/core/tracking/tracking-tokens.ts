import { InjectionToken } from '@angular/core';

import { TrackingProvider } from './tracking-provider';

export const TRACKERS = new InjectionToken<Array<TrackingProvider>>('TRACKERS', { factory: () => [] });
export const TRACKING_ENABLED = new InjectionToken<boolean>('TRACKING_ENABLED', { factory: () => true });

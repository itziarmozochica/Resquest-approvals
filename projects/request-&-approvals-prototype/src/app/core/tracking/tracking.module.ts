import { ModuleWithProviders, NgModule } from '@angular/core';

import { TRACKING_ENABLED } from './tracking-tokens';
import { TrackingService } from './tracking.service';

export interface TrackingModuleOptions {
  enabled?: boolean;
}

@NgModule({
  providers: [TrackingService],
})
export class TrackingModule {
  static configure(options?: TrackingModuleOptions): ModuleWithProviders<TrackingModule> {
    return {
      ngModule: TrackingModule,
      providers: [{ provide: TRACKING_ENABLED, useValue: options && typeof options.enabled === 'boolean' ? options.enabled : true }],
    };
  }
}

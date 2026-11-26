import { NgModule } from '@angular/core';

import { TRACKERS } from '../../tracking-tokens';
import { MixpanelTrackingProvider } from './mixpanel-tracking.provider';

@NgModule({
  providers: [MixpanelTrackingProvider, { provide: TRACKERS, useExisting: MixpanelTrackingProvider, multi: true }],
})
export class MixpanelTrackingModule {}

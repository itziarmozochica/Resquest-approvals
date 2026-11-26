import { InjectionToken } from '@angular/core';

export interface FztOnsiteSetupTracker {
  trackSetupChanged: (fromSetupId: string | null, toSetupId: string) => void;
}

export const FZT_ONSITE_SETUP_TRACKER = new InjectionToken<FztOnsiteSetupTracker>('FZT_ONSITE_SETUP_TRACKER');

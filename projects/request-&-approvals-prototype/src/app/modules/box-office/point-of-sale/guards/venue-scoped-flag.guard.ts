import { inject } from '@angular/core';
import { Router, type CanMatchFn } from '@angular/router';

import { type OptimizelyFeatureKeyDef } from '@fz-original/app/shared/optimizely/optimizely-feature-key';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { venueAttributes } from '@fz-original/app/shared/optimizely/venue-attributes.util';

import { OnsiteSetupsStorageService } from '../../shared/services/onsite-setups/onsite-setups-storage.service';

export const KEEP_VENUE_DECISION = 'keepVenueDecision';

interface VenueDecision {
  isEnabled: boolean;
  partnerId: string;
  userId: string;
  venueId: string;
}

export function venueScopedFlagGuard(flag: OptimizelyFeatureKeyDef): CanMatchFn {
  let lastDecision: VenueDecision | null = null;

  return (): boolean => {
    const optimizely = inject(OptimizelyService);
    const navigation = inject(Router).currentNavigation();
    const queryParamMap = navigation?.extractedUrl.queryParamMap;
    const storedSetup = inject(OnsiteSetupsStorageService).getConfiguration();
    const urlSetupId = queryParamMap?.get('onsiteSetupId');
    const opensAnotherSetup = Boolean(urlSetupId) && urlSetupId !== storedSetup?.id;
    const venueId = opensAnotherSetup
      ? (queryParamMap?.get('venueId') ?? '')
      : String(storedSetup?.place?.id ?? storedSetup?.place_id ?? '');
    const partnerId = optimizely.getPartnerId();
    const userId = optimizely.getUserId();
    const keepsDecision = navigation?.trigger === 'imperative' && navigation.extras.state?.[KEEP_VENUE_DECISION] === true;

    const previous = lastDecision;
    if (
      previous !== null &&
      (keepsDecision || (previous.partnerId === partnerId && previous.userId === userId && previous.venueId === venueId))
    ) {
      return previous.isEnabled;
    }

    const isEnabled = optimizely.isFeatureEnabled(flag, venueAttributes(venueId)) === true;
    lastDecision = { isEnabled, partnerId, userId, venueId };

    return isEnabled;
  };
}

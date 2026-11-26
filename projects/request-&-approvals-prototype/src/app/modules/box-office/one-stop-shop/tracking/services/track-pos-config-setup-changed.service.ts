import { inject, Injectable } from '@angular/core';

import { FzTrackingService } from '@fz/fz-tracking/src/public-api';

import { posConfigSetupChanged } from '../events/pos-config-setup-changed.event';

@Injectable()
export class TrackPosConfigSetupChangedService {
  readonly #fzTracking = inject(FzTrackingService);

  trackSetupChanged(fromSetupId: string | null, toSetupId: string | number): void {
    const normalizedToSetupId = String(toSetupId);

    if (fromSetupId === normalizedToSetupId) {
      return;
    }

    this.#fzTracking.track(
      posConfigSetupChanged({
        fromSetupId,
        toSetupId: normalizedToSetupId,
      }),
    );
  }
}

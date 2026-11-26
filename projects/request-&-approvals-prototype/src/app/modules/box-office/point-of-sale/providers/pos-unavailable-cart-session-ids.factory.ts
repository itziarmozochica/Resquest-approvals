import { computed, inject, type Signal } from '@angular/core';

import { PosFlexibleBundleService } from '../services/flexible-bundle/pos-flexible-bundle.service';
import { PosViewUpdateService } from '../services/pos-view-update/pos-view-update.service';

export function posUnavailableCartSessionIdsFactory(): Signal<ReadonlySet<number>> {
  const flexibleBundle = inject(PosFlexibleBundleService);
  const viewUpdate = inject(PosViewUpdateService);

  return computed(() => {
    // The cart is a plain field on the legacy state; `viewVersion` is the bridge every cart writer ends on.
    viewUpdate.viewVersion();

    return flexibleBundle.unavailableCartSessionIds();
  });
}

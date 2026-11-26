import { inject, Injectable } from '@angular/core';

import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';

import { fitKioskImageUrl, toKioskImageBox } from '../../utils/kiosk-image-url.util';

@Injectable({ providedIn: 'root' })
export class KioskImageService {
  readonly #optimizelyService = inject(OptimizelyService);

  fit(url: string, cssWidthPx: number, cssHeightPx: number, scale: number = 1): string {
    if (url === '' || !this.isSlotCropEnabled()) {
      return url;
    }
    const box = toKioskImageBox(cssWidthPx * scale, cssHeightPx * scale, window.devicePixelRatio);
    return box === null ? url : fitKioskImageUrl(url, box);
  }

  isSlotCropEnabled(): boolean {
    return (
      this.#optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.KIOSK_IMAGE_SLOT_CROP,
        team: 'b2b-onsite',
      }) === true
    );
  }
}

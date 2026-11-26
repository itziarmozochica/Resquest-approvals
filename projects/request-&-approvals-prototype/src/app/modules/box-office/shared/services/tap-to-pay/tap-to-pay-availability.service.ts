import { inject, Injectable } from '@angular/core';

import { isSemanticVersionGreaterOrEqual } from '@fz-original/app/app/utils/version.util';
import {
  CHECKOUT_TAP_TO_PAY_APP_UPDATE_REQUIRED_REASON,
  CHECKOUT_TAP_TO_PAY_NOT_READY_REASON,
} from '@fz-original/app/modules/checkout/checkout-modal/models/checkout-payment-failure-reason.model';
import { TapToPayUnavailableError } from '@fz-original/app/payments/models/tap-to-pay.model';
import { TapToPayInstallationService } from '@fz-original/app/payments/services/tap-to-pay-installation.service';
import { DualScreenStorageService } from '@fz-original/app/shared/services/dual-screen/dual-screen-storage.service';
import { catchError, Observable, throwError } from 'rxjs';

import { isTapToPayEnabled } from '../../utils/tap-to-pay.util';
import { OnsiteSetupsStorageService } from '../onsite-setups/onsite-setups-storage.service';
import { TapToPaySessionRelayService } from './tap-to-pay-session-relay.service';

@Injectable({
  providedIn: 'root',
})
export class TapToPayAvailabilityService {
  static readonly minAppVersion = '1.18.0';

  readonly #dualScreenStorageService = inject(DualScreenStorageService);
  readonly #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  readonly #tapToPayInstallationService = inject(TapToPayInstallationService);
  readonly #tapToPaySessionRelayService = inject(TapToPaySessionRelayService);

  isSupportedByApp(): boolean {
    const versionApp: string | undefined = this.#dualScreenStorageService.getData()?.versionApp;
    return versionApp !== undefined && isSemanticVersionGreaterOrEqual(versionApp, TapToPayAvailabilityService.minAppVersion);
  }

  requestDeviceId(): Observable<string> {
    if (!this.isSupportedByApp()) {
      return throwError(() => new TapToPayUnavailableError(CHECKOUT_TAP_TO_PAY_APP_UPDATE_REQUIRED_REASON));
    }
    this.#tapToPaySessionRelayService.start();
    return this.#tapToPayInstallationService
      .requestInstallationId()
      .pipe(catchError(() => throwError(() => new TapToPayUnavailableError(CHECKOUT_TAP_TO_PAY_NOT_READY_REASON))));
  }

  warmUp(): void {
    if (!this.isSupportedByApp() || !isTapToPayEnabled(this.#onsiteSetupsStorageService.getConfiguration())) {
      return;
    }
    this.#tapToPaySessionRelayService.start();
    this.#tapToPayInstallationService.requestInstallationId().subscribe({ error: () => undefined });
  }
}

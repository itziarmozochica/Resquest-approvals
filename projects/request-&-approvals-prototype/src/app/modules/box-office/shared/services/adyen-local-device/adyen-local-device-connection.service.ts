import { inject, Injectable } from '@angular/core';

import { forkJoin, map, Observable, switchMap } from 'rxjs';

import { AdyenLocalIdentifiedTerminal, AdyenLocalStoredTerminalKey } from '../../models/adyen-local-device';
import { AdyenLocalDeviceBridgeService } from './adyen-local-device-bridge.service';
import { AdyenLocalDeviceEnrolmentService } from './adyen-local-device-enrolment.service';

export interface AdyenLocalConnectedDevice {
  ipAddress: string;
  storedKey: AdyenLocalStoredTerminalKey;
  terminal: AdyenLocalIdentifiedTerminal;
}

/**
 * The four steps that pair a Box Office with its terminal, in the only order they work: the device
 * key and the terminal identity first, because partners needs both to seal the venue key, and the
 * storing last, because only the device can open what comes back.
 *
 * It lives outside the component so the dialog can run it after a save without owning the sequence.
 */
@Injectable({
  providedIn: 'root',
})
export class AdyenLocalDeviceConnectionService {
  readonly #bridgeService = inject(AdyenLocalDeviceBridgeService);
  readonly #enrolmentService = inject(AdyenLocalDeviceEnrolmentService);

  connect(configurationId: string, ipAddress: string): Observable<AdyenLocalConnectedDevice> {
    return forkJoin({
      publicKey: this.#bridgeService.requestPublicKey(),
      terminal: this.#bridgeService.identifyTerminal(ipAddress),
    }).pipe(
      map(({ publicKey, terminal }) => ({ publicKey: publicKey.publicKey, terminal })),
      switchMap(({ publicKey, terminal }) =>
        this.#enrolmentService
          .connectDevice(configurationId, {
            devicePublicKey: publicKey,
            terminalExternalId: terminal.poiId,
            terminalIpAddress: ipAddress,
          })
          // The certificate's lower-case POIID is refused by the terminal; partners' spelling is not.
          .pipe(map(sealedKey => ({ sealedKey, terminal: { poiId: sealedKey.deviceSerialNumber ?? terminal.poiId } }))),
      ),
      switchMap(({ sealedKey, terminal }) =>
        this.#bridgeService.storeTerminalKey(sealedKey).pipe(map(storedKey => ({ ipAddress, storedKey, terminal }))),
      ),
    );
  }
}

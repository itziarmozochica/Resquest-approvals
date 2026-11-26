import { Injectable } from '@angular/core';

import { StorageKey } from '@fz-original/app/app/enums/storage.enum';
import { AdyenConfiguration } from '@fz-original/app/app/models/payment-checkout-adyen.model';
import { PayhereConfiguration } from '@fz-original/app/app/models/payment-checkout-payhere.model';
import { SquareConfiguration } from '@fz-original/app/app/models/payment-checkout-square.model';
import { AdyenLocalConfiguration } from '@fz-original/app/payments/models/local-terminal-payment.model';
import { fromEvent, Observable } from 'rxjs';
import { distinctUntilChanged, filter, map, startWith } from 'rxjs/operators';

import { PaymentConfiguration } from '../payment-configuration.model';

export const SQUARE_LOCAL_STORAGE_KEY = 'square_config'; //old key for square configuration

interface OldSquareConfiguration {
  applicationId: string;
  deviceId: string;
  locationId: string;
}

@Injectable({
  providedIn: 'root',
})
export class PaymentConfigStorageService {
  readonly PAYMENT_CONFIG_KEY = StorageKey.paymentConfig;
  readonly SQUARE_CONFIG_KEY = SQUARE_LOCAL_STORAGE_KEY;

  getConfiguration(): PaymentConfiguration | undefined {
    const mobilePostSerial = this.getMobilePosSerial();
    if (mobilePostSerial) {
      const config = new PaymentConfiguration(
        new AdyenConfiguration([mobilePostSerial]),
        undefined,
        undefined,
        undefined,
        mobilePostSerial,
      );
      this.#writePaymentConfigToLocalStorage(config);
      return config;
    }

    this.updateOldConfiguration();
    const configString = localStorage.getItem(this.PAYMENT_CONFIG_KEY);
    return configString ? this.parsePaymentConfig(configString) : undefined;
  }

  private updateOldConfiguration(): void {
    const oldConfigStringStored = localStorage.getItem(this.SQUARE_CONFIG_KEY);
    if (oldConfigStringStored === null) {
      return;
    }

    try {
      const oldConfig: OldSquareConfiguration = JSON.parse(oldConfigStringStored);
      const deviceId: string | undefined = oldConfig.deviceId === null ? undefined : oldConfig.deviceId;
      const newConfig = new PaymentConfiguration(
        undefined,
        new SquareConfiguration(oldConfig.locationId, oldConfig.applicationId),
        undefined,
        undefined,
        deviceId,
      );
      const newValue: string = JSON.stringify(newConfig);
      localStorage.setItem(this.PAYMENT_CONFIG_KEY, newValue);
      localStorage.removeItem(this.SQUARE_CONFIG_KEY);
    } catch {
      localStorage.removeItem(this.SQUARE_CONFIG_KEY);
      return;
    }
  }

  setConfiguration(config: PaymentConfiguration): void {
    const newValue = this.#writePaymentConfigToLocalStorage(config);
    this.#dispatchStorageEvent(newValue);
  }

  removeConfiguration(): void {
    if (this.isMobilePos() || !localStorage.getItem(this.PAYMENT_CONFIG_KEY)) {
      return;
    }
    localStorage.removeItem(this.PAYMENT_CONFIG_KEY);
    this.#dispatchStorageEvent(null);
  }

  #dispatchStorageEvent(newValue: string | null): void {
    window.dispatchEvent(new StorageEvent('storage', { key: this.PAYMENT_CONFIG_KEY, newValue }));
  }

  #writePaymentConfigToLocalStorage(config: PaymentConfiguration): string {
    const newValue: string = JSON.stringify(config);
    localStorage.setItem(this.PAYMENT_CONFIG_KEY, newValue);
    return newValue;
  }

  private parsePaymentConfig(config: string | undefined): PaymentConfiguration | undefined {
    try {
      if (!config) {
        this.removeConfiguration();
        return undefined;
      }

      const object: PaymentConfiguration = JSON.parse(config);
      return new PaymentConfiguration(
        object.adyenConfiguration ? new AdyenConfiguration(object.adyenConfiguration.devicesIds) : undefined,
        object.squareConfiguration
          ? new SquareConfiguration(object.squareConfiguration.locationId, object.squareConfiguration.applicationId)
          : undefined,
        object.razorpayConfiguration ? { devicesIds: object.razorpayConfiguration.devicesIds } : undefined,
        object.payhereConfiguration ? new PayhereConfiguration(object.payhereConfiguration.devicesIds) : undefined,
        object.deviceId,
        object.adyenLocalConfiguration
          ? new AdyenLocalConfiguration(
              object.adyenLocalConfiguration.devicesIds,
              object.adyenLocalConfiguration.ipAddresses,
              object.adyenLocalConfiguration.paymentConfigurationId,
            )
          : undefined,
      );
    } catch {
      this.removeConfiguration();
      return undefined;
    }
  }

  listenStorage(): Observable<PaymentConfiguration | undefined> {
    const fromWindowStorage$ = fromEvent<StorageEvent>(window, 'storage').pipe(
      filter((event: StorageEvent) => event.key === this.PAYMENT_CONFIG_KEY),
      map((e: StorageEvent) => e.newValue ?? undefined),
      map((config: string | undefined) => this.parsePaymentConfig(config)),
    );
    return fromWindowStorage$.pipe(
      startWith(this.getConfiguration()),
      distinctUntilChanged<PaymentConfiguration | undefined>((a, b) => {
        if (a === undefined && b === undefined) {
          return true;
        }
        if (a === undefined || b === undefined) {
          return false;
        }
        return a.isEqual(b);
      }),
    );
  }

  isMobilePos(): boolean {
    return !!localStorage.getItem(StorageKey.adyenMobilePosSerial);
  }

  getMobilePosSerial(): string | null {
    return localStorage.getItem(StorageKey.adyenMobilePosSerial);
  }
}

import { inject, Injectable } from '@angular/core';

import { StorageKey } from '@fz-original/app/app/enums/storage.enum';
import { STORAGE_SERVICE } from '@fz/storage';
import { BehaviorSubject, Observable } from 'rxjs';

import { OSSConfig } from '../models/oss-config.model';

@Injectable({
  providedIn: 'root',
})
export class OSSConfigStorageService {
  readonly #storage = inject(STORAGE_SERVICE);
  readonly OSS_CONFIG = StorageKey.ossConfig;
  #ossSetup = new BehaviorSubject<OSSConfig | null>(this.getConfiguration());

  getConfiguration(): OSSConfig | null {
    const config = this.#storage.get<OSSConfig>(this.OSS_CONFIG);
    return config && typeof config === 'object' ? config : null;
  }

  observeConfiguration(): Observable<OSSConfig | null> {
    return this.#ossSetup.asObservable();
  }

  removeConfiguration(): void {
    if (!this.#storage.get(this.OSS_CONFIG)) {
      return;
    }
    this.#storage.remove(this.OSS_CONFIG);
    this.#ossSetup.next(null);
    window.dispatchEvent(new StorageEvent('storage', { key: this.OSS_CONFIG, newValue: null }));
  }

  setConfiguration(config: OSSConfig): void {
    const stampedConfig: OSSConfig = { ...config, partnerId: this.#getActivePartnerId() ?? config.partnerId };
    this.#storage.set(this.OSS_CONFIG, stampedConfig);
    this.#ossSetup.next(stampedConfig);
    window.dispatchEvent(new StorageEvent('storage', { key: this.OSS_CONFIG, newValue: JSON.stringify(stampedConfig) }));
  }

  /**
   * Reads the partner that `PartnerService` persists under `StorageKey.partner`. The key is read
   * through `STORAGE_SERVICE` here while `PartnerService` writes it via raw `localStorage`
   * (injecting `PartnerService` would create a DI cycle: it already depends on this service).
   * Both paths must resolve to the same physical store — if `STORAGE_SERVICE` is ever backed by
   * something other than `localStorage`, this lookup returns `null` and configs are stored
   * unstamped, silently disabling the cross-partner guard in the shift widgets.
   */
  #getActivePartnerId(): number | null {
    return this.#storage.get<{ id?: number }>(StorageKey.partner)?.id ?? null;
  }
}

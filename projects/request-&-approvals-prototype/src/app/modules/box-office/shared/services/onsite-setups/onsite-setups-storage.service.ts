import { Injectable, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { StorageKey } from '@fz-original/app/app/enums/storage.enum';
import { fromEvent } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { OboPrinterTypeEnum, OnsiteSetup } from '../../models/onsite-setup';

/** The setup as it is stored: the deprecated zebra printer becomes no printer. */
export function toStoredOnsiteSetup(onsiteSetup: OnsiteSetup): OnsiteSetup {
  if (onsiteSetup?.obo_printer_type !== OboPrinterTypeEnum.zebra_printer) {
    return onsiteSetup;
  }

  return { ...onsiteSetup, obo_printer_type: OboPrinterTypeEnum.no_printer };
}

@Injectable({
  providedIn: 'root',
})
export class OnsiteSetupsStorageService {
  readonly ONSITE_SETUP_CONFIG = StorageKey.onsiteSetupConfig;

  readonly onsiteSetup: Signal<OnsiteSetup | null> = toSignal(
    fromEvent<StorageEvent>(window, 'storage').pipe(
      filter((event: StorageEvent) => event.key === this.ONSITE_SETUP_CONFIG),
      map(() => this.getConfiguration()),
    ),
    { initialValue: this.getConfiguration() },
  );

  getConfiguration(): OnsiteSetup | null {
    const configString = localStorage.getItem(this.ONSITE_SETUP_CONFIG);
    if (!configString) {
      return null;
    }

    let config: OnsiteSetup;
    try {
      config = JSON.parse(configString) as OnsiteSetup;
    } catch {
      return null;
    }
    return toStoredOnsiteSetup(config);
  }

  setConfiguration(config: OnsiteSetup): void {
    if (config) {
      Object.assign(config, toStoredOnsiteSetup(config));
    }

    const newValue: string = JSON.stringify(config);
    localStorage.setItem(this.ONSITE_SETUP_CONFIG, newValue);
    window.dispatchEvent(new StorageEvent('storage', { key: this.ONSITE_SETUP_CONFIG, newValue }));
  }

  removeConfiguration(): void {
    if (!localStorage.getItem(this.ONSITE_SETUP_CONFIG)) {
      return;
    }
    localStorage.removeItem(this.ONSITE_SETUP_CONFIG);
    window.dispatchEvent(new StorageEvent('storage', { key: this.ONSITE_SETUP_CONFIG, newValue: null }));
  }
}

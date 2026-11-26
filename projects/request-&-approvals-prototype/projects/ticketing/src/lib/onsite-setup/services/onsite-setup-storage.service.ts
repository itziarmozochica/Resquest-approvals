import { DOCUMENT, inject, Injectable } from '@angular/core';

import { STORAGE_SERVICE } from '@fz/storage';

import type { OnsiteSetup } from '../models/api/onsite-setup.api';
import { OBO_PRINTER_TYPE_NONE, OBO_PRINTER_TYPE_ZEBRA } from '../models/api/onsite-setup.literals';

export const ONSITE_SETUP_CONFIG_STORAGE_KEY = 'onsite_setup_config';

@Injectable()
export class TicketingOnsiteSetupStorageService {
  readonly #document = inject(DOCUMENT);
  readonly #storage = inject(STORAGE_SERVICE);

  getOnsiteSetupConfig(): OnsiteSetup | null {
    const stored = this.#storage.get<unknown>(ONSITE_SETUP_CONFIG_STORAGE_KEY);

    if (typeof stored !== 'object' || stored === null) {
      return null;
    }

    return withoutZebraPrinter(stored as OnsiteSetup);
  }

  removeOnsiteSetupConfig(): void {
    if (this.#storage.get(ONSITE_SETUP_CONFIG_STORAGE_KEY) === null) {
      return;
    }

    this.#storage.remove(ONSITE_SETUP_CONFIG_STORAGE_KEY);
    this.#dispatch(null);
  }

  setOnsiteSetupConfig(setup: OnsiteSetup): void {
    const migrated = withoutZebraPrinter(setup);

    this.#storage.set(ONSITE_SETUP_CONFIG_STORAGE_KEY, migrated);
    this.#dispatch(JSON.stringify(migrated));
  }

  #dispatch(newValue: string | null): void {
    this.#document.defaultView?.dispatchEvent(new StorageEvent('storage', { key: ONSITE_SETUP_CONFIG_STORAGE_KEY, newValue }));
  }
}

function withoutZebraPrinter(setup: OnsiteSetup): OnsiteSetup {
  return setup.obo_printer_type === OBO_PRINTER_TYPE_ZEBRA ? { ...setup, obo_printer_type: OBO_PRINTER_TYPE_NONE } : setup;
}

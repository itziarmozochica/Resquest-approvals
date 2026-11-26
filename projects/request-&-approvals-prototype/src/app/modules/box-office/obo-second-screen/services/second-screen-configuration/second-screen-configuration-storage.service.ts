import { inject, Injectable } from '@angular/core';

import { StorageKey } from '@fz-original/app/app/enums/storage.enum';
import { SecondScreenConfiguration } from '@fz-original/app/modules/box-office/shared/models/second-screen-configuration';
import { STORAGE_SERVICE } from '@fz/storage';
import { fromEvent, Observable } from 'rxjs';
import { filter, map, startWith } from 'rxjs/operators';

import { isSecondScreenConfiguration } from '../../utils/second-screen-configuration.util';

/**
 * The second screen configuration the POS tab stored for the second screen tab (B2BS-2115).
 * Written by the POS, read by the second screen on start and on every cross-tab storage event for the key.
 */
@Injectable({
  providedIn: 'root',
})
export class SecondScreenConfigurationStorageService {
  readonly #storage = inject(STORAGE_SERVICE);

  getSecondScreenConfiguration(): SecondScreenConfiguration | null {
    const stored: unknown = this.#storage.get<unknown>(StorageKey.secondScreenConfiguration);
    return isSecondScreenConfiguration(stored) ? stored : null;
  }

  observeSecondScreenConfiguration(): Observable<SecondScreenConfiguration | null> {
    return fromEvent<StorageEvent>(window, 'storage').pipe(
      filter(event => event.key === StorageKey.secondScreenConfiguration),
      map(() => this.getSecondScreenConfiguration()),
      startWith(this.getSecondScreenConfiguration()),
    );
  }

  removeSecondScreenConfiguration(): void {
    this.#storage.remove(StorageKey.secondScreenConfiguration);
  }

  setSecondScreenConfiguration(configuration: SecondScreenConfiguration): void {
    this.#storage.set(StorageKey.secondScreenConfiguration, configuration);
  }
}

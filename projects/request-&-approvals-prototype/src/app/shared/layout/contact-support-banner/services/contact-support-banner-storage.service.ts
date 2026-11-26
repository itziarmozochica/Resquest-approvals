import { inject, Injectable } from '@angular/core';

import { StorageKey } from '@fz-original/app/app/enums/storage.enum';
import { STORAGE_SERVICE } from '@fz/storage';

@Injectable({
  providedIn: 'root',
})
export class ContactSupportBannerStorageService {
  readonly #storage = inject(STORAGE_SERVICE);

  isDismissed(): boolean {
    return this.#storage.get<boolean>(StorageKey.contactSupportBannerDismissed) === true;
  }

  markDismissed(): void {
    this.#storage.set(StorageKey.contactSupportBannerDismissed, true);
  }
}

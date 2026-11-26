import { Injectable } from '@angular/core';

import { StorageKey } from '@fz-original/app/app/enums/storage.enum';

@Injectable({
  providedIn: 'root',
})
export class SecondScreenLoggedOutBannerStorageService {
  getSecondScreenLoggedOutBannerText(): string | null {
    return this.#normalize(localStorage.getItem(StorageKey.secondScreenCustomTextForLoggedOutBanner));
  }

  removeSecondScreenLoggedOutBannerText(): void {
    localStorage.removeItem(StorageKey.secondScreenCustomTextForLoggedOutBanner);
  }

  setSecondScreenLoggedOutBannerText(value: string): void {
    localStorage.setItem(StorageKey.secondScreenCustomTextForLoggedOutBanner, value);
  }

  #normalize(value: string | null): string | null {
    return value !== null && value.length > 0 ? value : null;
  }
}

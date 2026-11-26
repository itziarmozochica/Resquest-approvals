import { Injectable } from '@angular/core';

import { StorageKey } from '@fz-original/app/app/enums/storage.enum';
import { DualScreenData } from '@fz-original/app/app/models/dual-screen-data.model';
import { fromEvent, Observable } from 'rxjs';
import { filter, map, startWith } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DualScreenStorageService {
  containsData(): boolean {
    return Boolean(localStorage.getItem(StorageKey.dualScreen));
  }

  getData(): DualScreenData | null {
    const data: string | null = this.#readData();
    if (!data) return null;
    try {
      const dualScreenData = JSON.parse(data) as DualScreenData | null;
      return dualScreenData?.versionApp !== undefined ? dualScreenData : null;
    } catch {
      return null;
    }
  }

  observeContainsData(): Observable<boolean> {
    return fromEvent<StorageEvent>(window, 'storage').pipe(
      filter(event => event.key === StorageKey.dualScreen),
      map(() => this.containsData()),
      startWith(this.containsData()),
    );
  }

  #readData(): string | null {
    try {
      return localStorage.getItem(StorageKey.dualScreen);
    } catch {
      return null;
    }
  }
}

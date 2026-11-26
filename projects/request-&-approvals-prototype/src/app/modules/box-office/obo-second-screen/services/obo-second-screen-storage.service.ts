import { Injectable } from '@angular/core';

import { StorageKey } from '@fz-original/app/app/enums/storage.enum';
import { fromEvent, Observable } from 'rxjs';
import { filter, map, startWith } from 'rxjs/operators';

import { OboSecondScreenDataChange } from '../models/obo-second-screen-data-change.model';
import { OboSecondScreenData } from '../models/obo-second-screen-data.model';

@Injectable({
  providedIn: 'root',
})
export class OboSecondScreenStorageService {
  getData(): OboSecondScreenData | null {
    return this.#parse(localStorage.getItem(StorageKey.dualScreenSecondScreenData));
  }

  observeExternalChanges(): Observable<OboSecondScreenDataChange> {
    return this.#observeStorageEvents().pipe(
      filter(event => event.storageArea !== null),
      map(event => ({ current: this.#parse(event.newValue), previous: this.#parse(event.oldValue) })),
    );
  }

  observeData(): Observable<OboSecondScreenData | null> {
    return this.#observeStorageEvents().pipe(
      map(event => this.#parse(event.newValue)),
      startWith(this.getData()),
    );
  }

  setData(data: OboSecondScreenData): void {
    const newValue = JSON.stringify(data);
    localStorage.setItem(StorageKey.dualScreenSecondScreenData, newValue);
    window.dispatchEvent(new StorageEvent('storage', { key: StorageKey.dualScreenSecondScreenData, newValue }));
  }

  #observeStorageEvents(): Observable<StorageEvent> {
    return fromEvent<StorageEvent>(window, 'storage').pipe(filter(event => event.key === StorageKey.dualScreenSecondScreenData));
  }

  #parse(value: string | null): OboSecondScreenData | null {
    if (!value) {
      return null;
    }

    try {
      return OboSecondScreenData.from(JSON.parse(value));
    } catch {
      return null;
    }
  }
}

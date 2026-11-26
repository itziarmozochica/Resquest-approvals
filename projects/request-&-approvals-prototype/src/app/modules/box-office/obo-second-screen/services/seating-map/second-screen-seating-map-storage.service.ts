import { Injectable } from '@angular/core';

import { StorageKey } from '@fz-original/app/app/enums/storage.enum';
import { SecondScreenSeatingMapStorage } from '@fz-original/app/shared/models/seating-map/second-screen-seating-map-storage.model';
import { fromEvent, Observable } from 'rxjs';
import { filter, map, startWith } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class SecondScreenSeatingMapStorageService {
  getSecondScreenSeatingMapHighlightedSeats(eventKey: string | undefined): string[] | null {
    if (!eventKey) {
      return null;
    }

    const parsed = this.getSecondScreenSeatingMapStoragePayload();
    if (!parsed || parsed.eventKey !== eventKey || !Array.isArray(parsed.seats)) {
      return null;
    }

    return parsed.seats.filter((seat): seat is string => typeof seat === 'string');
  }

  getSecondScreenSeatingMapStoragePayload(): Partial<SecondScreenSeatingMapStorage> | null {
    const localStorageValue = localStorage.getItem(StorageKey.secondScreenSeatingMap);
    if (!localStorageValue) {
      return null;
    }

    try {
      return JSON.parse(localStorageValue) as Partial<SecondScreenSeatingMapStorage>;
    } catch {
      return null;
    }
  }

  observeSecondScreenSeatingMapStorage(): Observable<Partial<SecondScreenSeatingMapStorage> | null> {
    return fromEvent<StorageEvent>(window, 'storage').pipe(
      filter(event => event.key === StorageKey.secondScreenSeatingMap),
      map(event => {
        if (!event.newValue) {
          return null;
        }
        try {
          return JSON.parse(event.newValue) as Partial<SecondScreenSeatingMapStorage>;
        } catch {
          return null;
        }
      }),
      startWith(this.getSecondScreenSeatingMapStoragePayload()),
    );
  }

  removeSecondScreenSeatingMapStorage(): void {
    localStorage.removeItem(StorageKey.secondScreenSeatingMap);
  }

  setSecondScreenSeatingMapStoragePayload(payload: SecondScreenSeatingMapStorage): void {
    localStorage.setItem(StorageKey.secondScreenSeatingMap, JSON.stringify(payload));
  }
}

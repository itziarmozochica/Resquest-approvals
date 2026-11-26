import { Injectable } from '@angular/core';

import { StorageKey } from '@fz-original/app/app/enums/storage.enum';

export interface ShiftListPreferences {
  showCashRegisterColumn: boolean;
  showOnsiteSetupColumn: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ShiftListStorageService {
  readonly #SHIFT_LIST_PREFERENCES_KEY = StorageKey.shiftListPreferences;

  getShiftListPreferences(): ShiftListPreferences | null {
    try {
      const preferencesString = localStorage.getItem(this.#SHIFT_LIST_PREFERENCES_KEY);
      return preferencesString !== null ? (JSON.parse(preferencesString) as ShiftListPreferences) : null;
    } catch (e) {
      return null;
    }
  }

  removeShiftListPreferences(): void {
    if (!localStorage.getItem(this.#SHIFT_LIST_PREFERENCES_KEY)) {
      return;
    }
    localStorage.removeItem(this.#SHIFT_LIST_PREFERENCES_KEY);
    window.dispatchEvent(new StorageEvent('storage', { key: this.#SHIFT_LIST_PREFERENCES_KEY, newValue: null }));
  }

  setShiftListPreferences(preferences: ShiftListPreferences): void {
    const newValue: string = JSON.stringify(preferences);
    localStorage.setItem(this.#SHIFT_LIST_PREFERENCES_KEY, newValue);
    window.dispatchEvent(new StorageEvent('storage', { key: this.#SHIFT_LIST_PREFERENCES_KEY, newValue }));
  }
}

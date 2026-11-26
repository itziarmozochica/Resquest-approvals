import { Injectable } from '@angular/core';

import { Shift } from '../../../shared/models/shifts.model';

export const OPENED_SHIFT_KEY = 'opened_shift';

@Injectable({
  providedIn: 'root',
})
export class UserShiftStorageService {
  readonly OPENED_SHIFT_KEY = OPENED_SHIFT_KEY;

  getOpenedShift(): Shift | null {
    try {
      const configString = localStorage.getItem(this.OPENED_SHIFT_KEY);
      return configString ? (JSON.parse(configString) as Shift) : null;
    } catch (e) {
      return null;
    }
  }

  setOpenedShift(shift: Shift): void {
    const newValue: string = JSON.stringify(shift);
    localStorage.setItem(this.OPENED_SHIFT_KEY, newValue);
    window.dispatchEvent(new StorageEvent('storage', { key: this.OPENED_SHIFT_KEY, newValue }));
  }

  removeOpenedShift(): void {
    if (!localStorage.getItem(this.OPENED_SHIFT_KEY)) {
      return;
    }
    localStorage.removeItem(this.OPENED_SHIFT_KEY);
    window.dispatchEvent(new StorageEvent('storage', { key: this.OPENED_SHIFT_KEY, newValue: null }));
  }
}

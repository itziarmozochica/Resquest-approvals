import { Injectable } from '@angular/core';

const STORAGE_KEY = 'efsta_registered_orders';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

@Injectable({
  providedIn: 'root',
})
export class EfstaRegistrationTrackerService {
  isOrderRegistered(orderId: number): boolean {
    const entries = this.#readEntries();
    return orderId in entries;
  }

  markOrderRegistered(orderId: number): void {
    const entries = this.#readEntries();
    entries[orderId] = Date.now();
    this.#purgeExpired(entries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  #readEntries(): Record<string, number> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {};
      }
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return {};
      }
      return parsed as Record<string, number>;
    } catch {
      return {};
    }
  }

  #purgeExpired(entries: Record<string, number>): void {
    const now = Date.now();
    for (const key of Object.keys(entries)) {
      if (now - entries[key] > MAX_AGE_MS) {
        delete entries[key];
      }
    }
  }
}

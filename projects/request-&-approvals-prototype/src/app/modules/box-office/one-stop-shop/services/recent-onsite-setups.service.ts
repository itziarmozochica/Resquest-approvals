import { inject, Injectable } from '@angular/core';

import { StorageKey } from '@fz-original/app/app/enums/storage.enum';
import { STORAGE_SERVICE } from '@fz/storage';

export interface RecentOnsiteSetup {
  id: string;
  lastSelectedAt: string;
}

interface RecentOnsiteSetupsStorage {
  [partnerId: string]: RecentOnsiteSetup[];
}

@Injectable({
  providedIn: 'root',
})
export class RecentOnsiteSetupsService {
  static readonly maxRecentAgeMs = 60 * 24 * 60 * 60 * 1000;
  static readonly maxRecentOnsiteSetups = 10;

  readonly #storage = inject(STORAGE_SERVICE);

  addRecentOnsiteSetup(partnerId: number, setupId: string): void {
    if (typeof setupId !== 'string' || setupId === '') {
      return;
    }

    const entry: RecentOnsiteSetup = {
      id: setupId,
      lastSelectedAt: new Date().toISOString(),
    };
    const storage = this.#readStorage();
    const key = this.#buildKey(partnerId);
    const current = this.#normalizeEntries(storage[key] ?? []);
    const deduped = current.filter(item => item.id !== entry.id);
    const updated = [entry, ...deduped].slice(0, RecentOnsiteSetupsService.maxRecentOnsiteSetups);

    storage[key] = updated;
    this.#writeStorage(storage);
  }

  getRecentOnsiteSetups(partnerId: number): RecentOnsiteSetup[] {
    const storage = this.#readStorage();
    const key = this.#buildKey(partnerId);
    const entries = storage[key] ?? [];
    const now = Date.now();
    const valid = this.#normalizeEntries(entries)
      .filter(item => now - this.#parseLastSelectedAt(item.lastSelectedAt) <= RecentOnsiteSetupsService.maxRecentAgeMs)
      .sort((a, b) => this.#parseLastSelectedAt(b.lastSelectedAt) - this.#parseLastSelectedAt(a.lastSelectedAt));

    if (valid.length !== entries.length) {
      storage[key] = valid;
      this.#writeStorage(storage);
    }

    return valid;
  }

  removeRecentOnsiteSetup(partnerId: number, setupId: string): void {
    const storage = this.#readStorage();
    const key = this.#buildKey(partnerId);
    const current = this.#normalizeEntries(storage[key] ?? []);
    const updated = current.filter(item => item.id !== setupId);

    if (updated.length === current.length) {
      return;
    }

    storage[key] = updated;
    this.#writeStorage(storage);
  }

  /**
   * Prunes stored recents for the partner, keeping only the ids still present in the
   * onsite setups summary, and persists the cleaned list.
   */
  retainRecentOnsiteSetups(partnerId: number, validSetupIds: readonly string[]): RecentOnsiteSetup[] {
    const current = this.getRecentOnsiteSetups(partnerId);
    const validIds = new Set(validSetupIds);
    const retained = current.filter(item => validIds.has(item.id));

    if (retained.length !== current.length) {
      const storage = this.#readStorage();
      storage[this.#buildKey(partnerId)] = retained;
      this.#writeStorage(storage);
    }

    return retained;
  }

  #buildKey(partnerId: number): string {
    return String(partnerId);
  }

  #isValidId(entry: unknown): entry is Pick<RecentOnsiteSetup, 'id'> {
    return typeof entry === 'object' && entry !== null && typeof (entry as RecentOnsiteSetup).id === 'string';
  }

  #normalizeEntries(entries: unknown[]): RecentOnsiteSetup[] {
    return entries.map(entry => this.#normalizeEntry(entry)).filter((entry): entry is RecentOnsiteSetup => entry !== null);
  }

  #normalizeEntry(entry: unknown): RecentOnsiteSetup | null {
    if (!this.#isValidId(entry)) {
      return null;
    }

    const lastSelectedAt =
      typeof (entry as RecentOnsiteSetup).lastSelectedAt === 'string'
        ? (entry as RecentOnsiteSetup).lastSelectedAt
        : new Date().toISOString();

    return {
      id: entry.id,
      lastSelectedAt,
    };
  }

  #parseLastSelectedAt(lastSelectedAt: string): number {
    const timestamp = Date.parse(lastSelectedAt);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  #readStorage(): RecentOnsiteSetupsStorage {
    const parsed = this.#storage.get<RecentOnsiteSetupsStorage>(StorageKey.recentOnsiteSetups);

    if (parsed === null) {
      return {};
    }

    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  }

  #writeStorage(storage: RecentOnsiteSetupsStorage): void {
    this.#storage.set(StorageKey.recentOnsiteSetups, storage);
  }
}

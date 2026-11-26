import { inject, Injectable } from '@angular/core';

import { STORAGE_SERVICE } from '@fz/storage';

import type { RecentOnsiteSetup } from '../models/recent-onsite-setup.model';

export const RECENT_ONSITE_SETUPS_STORAGE_KEY = 'recent-onsite-setups';

type RecentOnsiteSetupsStorage = Record<string, RecentOnsiteSetup[]>;

@Injectable()
export class TicketingRecentOnsiteSetupsService {
  static readonly maxRecentAgeMs = 60 * 24 * 60 * 60 * 1000;
  static readonly maxRecentOnsiteSetups = 10;

  readonly #storage = inject(STORAGE_SERVICE);

  addRecentOnsiteSetup(partnerId: string, setupId: string): void {
    if (setupId === '') {
      return;
    }

    const entry: RecentOnsiteSetup = { id: setupId, lastSelectedAt: new Date().toISOString() };
    const storage = this.#readStorage();
    const current = normalizeEntries(storage[partnerId] ?? []);
    const deduped = current.filter(item => item.id !== entry.id);

    storage[partnerId] = [entry, ...deduped].slice(0, TicketingRecentOnsiteSetupsService.maxRecentOnsiteSetups);
    this.#writeStorage(storage);
  }

  getRecentOnsiteSetups(partnerId: string): RecentOnsiteSetup[] {
    const storage = this.#readStorage();
    const entries = storage[partnerId] ?? [];
    const now = Date.now();
    const valid = normalizeEntries(entries)
      .filter(item => now - parseLastSelectedAt(item.lastSelectedAt) <= TicketingRecentOnsiteSetupsService.maxRecentAgeMs)
      .sort((first, second) => parseLastSelectedAt(second.lastSelectedAt) - parseLastSelectedAt(first.lastSelectedAt));

    if (valid.length !== entries.length) {
      storage[partnerId] = valid;
      this.#writeStorage(storage);
    }

    return valid;
  }

  removeRecentOnsiteSetup(partnerId: string, setupId: string): void {
    const storage = this.#readStorage();
    const current = normalizeEntries(storage[partnerId] ?? []);
    const updated = current.filter(item => item.id !== setupId);

    if (updated.length === current.length) {
      return;
    }

    storage[partnerId] = updated;
    this.#writeStorage(storage);
  }

  retainRecentOnsiteSetups(partnerId: string, validSetupIds: readonly string[]): RecentOnsiteSetup[] {
    const current = this.getRecentOnsiteSetups(partnerId);
    const validIds = new Set(validSetupIds);
    const retained = current.filter(item => validIds.has(item.id));

    if (retained.length !== current.length) {
      const storage = this.#readStorage();
      storage[partnerId] = retained;
      this.#writeStorage(storage);
    }

    return retained;
  }

  #readStorage(): RecentOnsiteSetupsStorage {
    const parsed = this.#storage.get<unknown>(RECENT_ONSITE_SETUPS_STORAGE_KEY);

    return typeof parsed === 'object' && parsed !== null ? (parsed as RecentOnsiteSetupsStorage) : {};
  }

  #writeStorage(storage: RecentOnsiteSetupsStorage): void {
    this.#storage.set(RECENT_ONSITE_SETUPS_STORAGE_KEY, storage);
  }
}

function hasValidId(entry: unknown): entry is Record<string, unknown> & { id: string } {
  return typeof entry === 'object' && entry !== null && typeof (entry as Record<string, unknown>).id === 'string';
}

function normalizeEntries(entries: readonly unknown[]): RecentOnsiteSetup[] {
  return entries.map(entry => normalizeEntry(entry)).filter((entry): entry is RecentOnsiteSetup => entry !== null);
}

function normalizeEntry(entry: unknown): RecentOnsiteSetup | null {
  if (!hasValidId(entry)) {
    return null;
  }

  const lastSelectedAt = entry.lastSelectedAt;

  return {
    id: entry.id,
    lastSelectedAt: typeof lastSelectedAt === 'string' ? lastSelectedAt : new Date().toISOString(),
  };
}

function parseLastSelectedAt(lastSelectedAt: string): number {
  const timestamp = Date.parse(lastSelectedAt);

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

import { inject, Injectable } from '@angular/core';

import { StorageKey } from '@fz-original/app/app/enums/storage.enum';
import { RecentSearch } from '@fz-original/app/shared/components/recent-searches-dropdown/recent-search.model';
import { STORAGE_SERVICE } from '@fz/storage';

import { ValidationTypeEnum } from '../../enums/validation-type.enum';

interface RecentSearchesStorage {
  [compositeKey: string]: string[];
}

interface RecentSearchTimesStorage {
  [compositeKey: string]: Record<string, number>;
}

/**
 * The list keeps the `string[]` shape every released version reads; the search times live under their own key,
 * so an older build (a rollback, a cached kiosk tab) never meets a value it cannot handle.
 */
@Injectable()
export class ValidationRecentSearchesService {
  static readonly maxRecentSearches = 15;

  readonly #storage = inject(STORAGE_SERVICE);

  addRecentSearch(partnerId: number, searchType: ValidationTypeEnum, value: string): void {
    const trimmedValue = value.trim();
    if (trimmedValue === '') {
      return;
    }

    const key = this.#buildKey(partnerId, searchType);
    const current = this.#readSearches()[key] ?? [];
    const updated = [trimmedValue, ...current.filter(item => item !== trimmedValue)].slice(
      0,
      ValidationRecentSearchesService.maxRecentSearches,
    );
    const times = { ...this.#readTimes()[key], [trimmedValue]: Date.now() };
    this.#write(key, updated, times);
  }

  clearRecentSearches(partnerId: number, searchType: ValidationTypeEnum): void {
    this.#write(this.#buildKey(partnerId, searchType), [], {});
  }

  getRecentSearchEntries(partnerId: number, searchType: ValidationTypeEnum): RecentSearch[] {
    const key = this.#buildKey(partnerId, searchType);
    const times = this.#readTimes()[key] ?? {};
    return (this.#readSearches()[key] ?? []).map(value => ({ searchedAt: times[value] ?? null, value }));
  }

  getRecentSearches(partnerId: number, searchType: ValidationTypeEnum): string[] {
    return this.#readSearches()[this.#buildKey(partnerId, searchType)] ?? [];
  }

  removeRecentSearch(partnerId: number, searchType: ValidationTypeEnum, value: string): void {
    const key = this.#buildKey(partnerId, searchType);
    const remaining = (this.#readSearches()[key] ?? []).filter(item => item !== value);
    this.#write(key, remaining, this.#readTimes()[key] ?? {});
  }

  #buildKey(partnerId: number, searchType: ValidationTypeEnum): string {
    return `${searchType}_${partnerId}`;
  }

  #readSearches(): RecentSearchesStorage {
    const stored = this.#storage.get<unknown>(StorageKey.validationRecentSearches);
    if (!isRecord(stored)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(stored).map(([key, items]) => [key, Array.isArray(items) ? items.filter(item => typeof item === 'string') : []]),
    );
  }

  #readTimes(): RecentSearchTimesStorage {
    const stored = this.#storage.get<unknown>(StorageKey.validationRecentSearchTimes);
    if (!isRecord(stored)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(stored).map(([key, times]) => [
        key,
        isRecord(times)
          ? Object.fromEntries(Object.entries(times).filter((entry): entry is [string, number] => typeof entry[1] === 'number'))
          : {},
      ]),
    );
  }

  /** Times are kept only for the values still in the list, so the times map never outgrows it. */
  #write(key: string, searches: string[], times: Record<string, number>): void {
    const allSearches = this.#readSearches();
    const allTimes = this.#readTimes();
    allSearches[key] = searches;
    allTimes[key] = Object.fromEntries(searches.filter(value => value in times).map(value => [value, times[value]]));
    this.#storage.set(StorageKey.validationRecentSearches, allSearches);
    this.#storage.set(StorageKey.validationRecentSearchTimes, allTimes);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

import { Injectable } from '@angular/core';

import {
  CachedProductSessionsQuery,
  CachedProductSessionsSummary,
  ProductSessionsSummary,
} from '../../models/product-sessions-summary/product-sessions-summary-response.model';

@Injectable({
  providedIn: 'root',
})
export class ProductSessionsSummaryStoredService {
  readonly #cacheExpiryMs = 2 * 60 * 60 * 1000;
  readonly #cacheKey = 'product_sessions_summary_cache';
  #isSyncInProgress = false;
  #memoryCachedData: CachedProductSessionsSummary | null = null;

  clearCache(): void {
    localStorage.removeItem(this.#cacheKey);
    this.#memoryCachedData = null;
    this.#isSyncInProgress = false;
  }

  getCachedData(query?: CachedProductSessionsQuery): CachedProductSessionsSummary | null {
    if (!this.#memoryCachedData) {
      this.#memoryCachedData = this.#getCachedDataFromStorage(query);
    } else if (query) {
      if (!this.#isSameQuery(this.#memoryCachedData.query, query)) {
        this.#memoryCachedData = this.#getCachedDataFromStorage(query);
      }
    }

    return this.#memoryCachedData;
  }

  isBackgroundSyncInProgress(): boolean {
    return this.#isSyncInProgress;
  }

  isCacheValid(cachedData: CachedProductSessionsSummary): boolean {
    const expiryTime = cachedData.timestamp + this.#cacheExpiryMs;
    return Date.now() < expiryTime;
  }

  saveToCache(query: CachedProductSessionsQuery, data: ProductSessionsSummary): void {
    try {
      const now = Date.now();
      const cacheData: CachedProductSessionsSummary = {
        data,
        timestamp: now,
        query,
      };

      localStorage.setItem(this.#cacheKey, JSON.stringify(cacheData));
      this.#memoryCachedData = cacheData;
      this.#isSyncInProgress = false;
    } catch (error) {
      this.#isSyncInProgress = false;
    }
  }

  setBackgroundSyncInProgress(inProgress: boolean): void {
    this.#isSyncInProgress = inProgress;
  }

  #getCachedDataFromStorage(query?: CachedProductSessionsQuery): CachedProductSessionsSummary | null {
    try {
      const cached = localStorage.getItem(this.#cacheKey);
      if (!cached) {
        return null;
      }

      const cachedData: CachedProductSessionsSummary = JSON.parse(cached);

      if (!query) {
        return cachedData;
      }

      if (this.#isSameQuery(cachedData.query, query)) {
        return cachedData;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  #isSameQuery(query1: CachedProductSessionsQuery, query2: CachedProductSessionsQuery): boolean {
    return query1.partnerId === query2.partnerId && query1.onsiteSetupId === query2.onsiteSetupId && query1.channel === query2.channel;
  }
}

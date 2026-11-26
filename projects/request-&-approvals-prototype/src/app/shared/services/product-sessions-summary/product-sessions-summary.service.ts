import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { EMPTY, Observable, of } from 'rxjs';
import { catchError, expand, finalize, map, reduce, switchMap, takeWhile } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { BaseResponse } from '../../models/base-response';
import {
  CachedProductSessionsSummary,
  ProductSession,
  ProductSessionsSummary,
  ProductSessionsSummaryData,
  ProductSessionsSummaryQuery,
} from '../../models/product-sessions-summary/product-sessions-summary-response.model';
import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { ProductSessionsSummaryStoredService } from './product-sessions-summary-stored.service';
import { ProductSessionsSummaryAdapter } from './product-sessions-summary.adapter';
import { ProductSessionsDataDTO } from './product-sessions-summary.dto';

@Injectable({
  providedIn: 'root',
})
export class ProductSessionsSummaryService {
  readonly #defaultItemsPerPage = 100;

  #httpClient = inject(HttpClient);
  #productSessionsSummaryAdapter = inject(ProductSessionsSummaryAdapter);
  #productSessionsSummaryStoredService = inject(ProductSessionsSummaryStoredService);

  /**
   * Finds all sessions that match a product code search term (partial matching supported).
   *
   * This method searches for sessions where the SKU or GTIN contains the search term.
   * The search is case-insensitive and returns all matching sessions.
   *
   * Uses the same caching strategy as other search methods.
   *
   * @param productCode The product code or partial code to search for
   * @returns Array of ProductSession objects that match the search term
   */
  findSessionsByProductCode(productCode: string): ProductSession[] {
    try {
      const cachedData = this.#productSessionsSummaryStoredService.getCachedData();
      if (!cachedData) {
        return [];
      }

      const trimmedSearchTerm = productCode.trim();
      if (!trimmedSearchTerm) {
        return [];
      }

      const normalizedSearchTerm = trimmedSearchTerm.toLowerCase();
      const matchingSessions: ProductSession[] = [];

      for (const [codeKey, sessionId] of Object.entries(cachedData.data.sku_or_gtin_to_session_id)) {
        if (codeKey.toLowerCase().includes(normalizedSearchTerm)) {
          const sessionData = cachedData.data.sessions_by_id[sessionId.toString()];
          if (sessionData) {
            matchingSessions.push(sessionData);
          }
        }
      }

      return matchingSessions;
    } catch (error) {
      return [];
    }
  }

  /**
   * Finds all sessions that match a title search term (partial matching supported).
   *
   * This method searches for sessions where the title contains the search term.
   * The search is case-insensitive and returns all matching sessions.
   *
   * Search strategy:
   * 1. Exact and contains matching (original behavior)
   * 2. Particle-based search with intelligent scoring:
   *    - Splits search term by spaces, filters particles ≥ 2 characters
   *    - Scoring system: particle_length + bonus_for_multiple_matches
   *    - Sessions matching multiple particles get higher priority
   *    - Results ordered by score (descending)
   *    - Only adds sessions not already found in step 1
   *
   * Uses the same caching strategy as other search methods.
   *
   * @param title The title or partial title to search for
   * @returns Array of ProductSession objects that match the search term
   */
  findSessionsByTitle(title: string): ProductSession[] {
    try {
      const cachedData = this.#productSessionsSummaryStoredService.getCachedData();
      if (!cachedData) {
        return [];
      }

      const normalizedSearchTerm = title.toLowerCase().trim();
      if (!normalizedSearchTerm) {
        return [];
      }

      const matchingSessions: ProductSession[] = [];
      const foundSessionIds = new Set<number>();

      // Step 1: Original contains search
      for (const [titleKey, sessionId] of Object.entries(cachedData.data.title_to_session_id)) {
        if (titleKey.includes(normalizedSearchTerm)) {
          const sessionData = cachedData.data.sessions_by_id[sessionId.toString()];
          if (sessionData) {
            matchingSessions.push(sessionData);
            foundSessionIds.add(sessionId);
          }
        }
      }

      // Step 2: Particle-based search with scoring
      const particles = normalizedSearchTerm
        .split(' ')
        .filter(particle => particle.length >= 2)
        .sort((a, b) => b.length - a.length); // Sort by length descending

      if (particles.length > 0) {
        const sessionScores = new Map<number, { score: number; session: ProductSession }>();

        // Single pass through all titles to calculate scores
        for (const [titleKey, sessionId] of Object.entries(cachedData.data.title_to_session_id)) {
          // Skip if already found in step 1
          if (foundSessionIds.has(sessionId)) {
            continue;
          }

          let totalScore = 0;
          let matchingParticles = 0;

          for (const particle of particles) {
            if (titleKey.includes(particle)) {
              matchingParticles++;
              // Score = particle length + bonus for multiple matches
              totalScore += particle.length + (matchingParticles > 1 ? 2 : 0);
            }
          }

          if (totalScore > 0) {
            const sessionData = cachedData.data.sessions_by_id[sessionId.toString()];
            if (sessionData) {
              sessionScores.set(sessionId, { score: totalScore, session: sessionData });
            }
          }
        }

        // Sort by score (descending) and add to results
        const sortedSessions = Array.from(sessionScores.values())
          .sort((a, b) => b.score - a.score)
          .map(item => item.session);

        matchingSessions.push(...sortedSessions);
      }

      return matchingSessions;
    } catch (error) {
      return [];
    }
  }

  /**
   * Retrieves session data for a specific product code from cached catalog.
   *
   * Uses a two-tier caching strategy:
   * - Memory cache: Fast access for repeated calls
   * - LocalStorage cache: Persistent storage
   *
   * Cache is validated against the backend (304 - Not Modified) only when entering the
   * one-stop shop (initializeService).
   *
   * This method is optimized for high-frequency calls (e.g., barcode scanning)
   */
  getSessionDataByProductCode(productCode: string): ProductSession | null {
    try {
      const cachedData = this.#productSessionsSummaryStoredService.getCachedData();
      if (!cachedData) {
        return null;
      }

      const sessionId = cachedData.data.sku_or_gtin_to_session_id[productCode];
      if (!sessionId) {
        return null;
      }

      const sessionData = cachedData.data.sessions_by_id[sessionId.toString()];
      if (!sessionData) {
        return null;
      }

      return sessionData;
    } catch (error) {
      return null;
    }
  }

  /**
   * Resolves a shop product session by numeric session id from the cached product catalog.
   * Used when adding from custom tabs before ticket types are synced into the cart UI.
   */
  getSessionDataBySessionId(sessionId: number): ProductSession | null {
    try {
      const cachedData = this.#productSessionsSummaryStoredService.getCachedData();
      if (!cachedData) {
        return null;
      }

      const sessionData = cachedData.data.sessions_by_id[sessionId.toString()];
      return sessionData ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Retrieves session data for a specific title from cached catalog.
   *
   * Uses the same caching strategy as getSessionDataByProductCode.
   * The title search is case-insensitive (normalized to lowercase).
   *
   * This method supports both exact and partial matching. It first tries exact match,
   * then falls back to partial matching if no exact match is found.
   *
   * This method is optimized for high-frequency calls. Cache is validated
   * against the backend (304 - Not Modified) only when entering the one-stop shop (initializeService).
   */
  getSessionDataByTitle(title: string): ProductSession | null {
    try {
      const cachedData = this.#productSessionsSummaryStoredService.getCachedData();
      if (!cachedData) {
        return null;
      }

      const normalizedSearchTerm = title.toLowerCase().trim();
      if (!normalizedSearchTerm) {
        return null;
      }

      let sessionId = cachedData.data.title_to_session_id[normalizedSearchTerm];

      if (!sessionId) {
        for (const [titleKey, id] of Object.entries(cachedData.data.title_to_session_id)) {
          if (titleKey.includes(normalizedSearchTerm)) {
            sessionId = id;
            break;
          }
        }
      }

      if (!sessionId) {
        return null;
      }

      const sessionData = cachedData.data.sessions_by_id[sessionId.toString()];
      if (!sessionData) {
        return null;
      }

      return sessionData;
    } catch (error) {
      return null;
    }
  }

  initializeService(partnerId: number, onsiteSetupId: string, channel: string): Observable<BaseResponse<ProductSessionsSummary | null>> {
    const query: ProductSessionsSummaryQuery = {
      channel,
      onsiteSetupId,
      partnerId,
    };

    const cachedQuery = this.#buildCachedQuery(query);
    const cachedData = this.#productSessionsSummaryStoredService.getCachedData(cachedQuery);

    if (cachedData) {
      this.#refreshCacheInBackground(query, cachedData);
      return of(new BaseResponse<ProductSessionsSummary | null>(cachedData.data, null));
    }

    return this.#loadCatalogFromApi(query);
  }

  /**
   * Searches for all sessions that match a search term by either SKU/GTIN or title.
   *
   * This method combines results from both product code and title searches,
   * removing duplicates. It supports partial matching and is case-insensitive.
   *
   * Uses the same caching strategy as other search methods.
   *
   * @param searchTerm The term to search for (can be SKU/GTIN or title)
   * @returns Array of unique ProductSession objects that match the search term
   */
  searchAllSessions(searchTerm: string): ProductSession[] {
    try {
      const sessionsByProductCode = this.findSessionsByProductCode(searchTerm);
      const sessionsByTitle = this.findSessionsByTitle(searchTerm);

      const uniqueSessionsMap = new Map<number, ProductSession>();

      sessionsByProductCode.forEach(session => {
        uniqueSessionsMap.set(session.id, session);
      });

      sessionsByTitle.forEach(session => {
        uniqueSessionsMap.set(session.id, session);
      });

      return Array.from(uniqueSessionsMap.values());
    } catch (error) {
      return [];
    }
  }

  /**
   * Generic search method that searches for session data by either SKU/GTIN or title.
   *
   * This method first attempts to find the session by SKU/GTIN, and if not found,
   * it searches by title (case-insensitive). This provides a unified search interface
   * for the future search component.
   *
   * Uses the same caching strategy as the other search methods.
   *
   * @param searchTerm The term to search for (can be SKU/GTIN or title)
   * @returns ProductSession if found, null otherwise
   */
  searchSessionData(searchTerm: string): ProductSession | null {
    try {
      const sessionByProductCode = this.getSessionDataByProductCode(searchTerm);
      if (sessionByProductCode) {
        return sessionByProductCode;
      }

      const sessionByTitle = this.getSessionDataByTitle(searchTerm);
      if (sessionByTitle) {
        return sessionByTitle;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  #buildApiUrl(partnerId: number, onsiteSetupId: string): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/onsite-setups/${onsiteSetupId}/shop-products`;
  }

  #buildCachedQuery(query: ProductSessionsSummaryQuery) {
    return {
      channel: query.channel,
      onsiteSetupId: query.onsiteSetupId,
      partnerId: query.partnerId,
    };
  }

  #loadCatalogFromApi(
    query: ProductSessionsSummaryQuery,
    firstPageResponse?: BaseResponse<ProductSessionsSummaryData | null>,
  ): Observable<BaseResponse<ProductSessionsSummary | null>> {
    const firstPage$ = firstPageResponse ? of(firstPageResponse) : this.#loadPageFromApi(query, 1);

    return firstPage$.pipe(
      expand((response: BaseResponse<ProductSessionsSummaryData | null>) => {
        if (!response.data || response.error || !response.data.next_page) {
          return of();
        }
        return this.#loadPageFromApi(query, response.data.next_page);
      }),
      takeWhile(response => !response.error && response.data !== null, true),
      reduce((accumulator: ProductSessionsSummary, current: BaseResponse<ProductSessionsSummaryData | null>) => {
        if (!current.data) {
          return accumulator;
        }

        if (!accumulator) {
          const titleMap: { [title: string]: number } = {};
          Object.values(current.data.sessions_by_id).forEach(session => {
            if (session.is_searchable) {
              const normalizedTitle = session.title.toLowerCase();
              if (!titleMap[normalizedTitle]) {
                titleMap[normalizedTitle] = session.id;
              }
            }
          });

          return {
            next_page: current.data.next_page,
            sessions_by_id: { ...current.data.sessions_by_id },
            sku_or_gtin_to_session_id: { ...current.data.sku_or_gtin_to_session_id },
            title_to_session_id: titleMap,
          };
        }

        const currentTitleMap: { [title: string]: number } = {};
        Object.values(current.data.sessions_by_id).forEach(session => {
          if (session.is_searchable) {
            const normalizedTitle = session.title.toLowerCase();
            if (!currentTitleMap[normalizedTitle]) {
              currentTitleMap[normalizedTitle] = session.id;
            }
          }
        });

        Object.assign(accumulator.sessions_by_id, current.data.sessions_by_id);
        Object.assign(accumulator.sku_or_gtin_to_session_id, current.data.sku_or_gtin_to_session_id);

        Object.keys(currentTitleMap).forEach(title => {
          if (!accumulator.title_to_session_id[title]) {
            accumulator.title_to_session_id[title] = currentTitleMap[title];
          }
        });
        accumulator.next_page = current.data.next_page;

        return accumulator;
      }, null as any),
      map((combinedData: ProductSessionsSummary) => {
        if (combinedData) {
          combinedData.next_page = null;
          const cachedQuery = this.#buildCachedQuery(query);
          this.#productSessionsSummaryStoredService.saveToCache(cachedQuery, combinedData);
        }
        return new BaseResponse(combinedData, null);
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<ProductSessionsSummary>(error);
      }),
    );
  }

  #loadPageFromApi(query: ProductSessionsSummaryQuery, page: number): Observable<BaseResponse<ProductSessionsSummaryData | null>> {
    const url = this.#buildApiUrl(query.partnerId, query.onsiteSetupId);
    const params = new HttpParams()
      .set('items_per_page', this.#defaultItemsPerPage.toString())
      .set('page', page.toString())
      .set('channel', query.channel);

    return this.#httpClient.get<BaseResponse<ProductSessionsDataDTO>>(url, { params }).pipe(
      map(response => this.#productSessionsSummaryAdapter.fromApi(response)),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<ProductSessionsSummaryData>(error);
      }),
    );
  }

  /**
   * Runs the conditional GET (If-Modified-Since) in the background. Does not block the caller.
   * - 304 - Not Modified: cache is still valid, nothing to do.
   * - 200 OK: full catalog is loaded in background and cache is updated (stale-while-revalidate).
   * - Error (timeout, 5xx, offline): nothing to do; consumer already has cached data.
   */
  #refreshCacheInBackground(query: ProductSessionsSummaryQuery, cachedData: CachedProductSessionsSummary): void {
    if (this.#productSessionsSummaryStoredService.isBackgroundSyncInProgress()) {
      return;
    }

    this.#productSessionsSummaryStoredService.setBackgroundSyncInProgress(true);

    const url = this.#buildApiUrl(query.partnerId, query.onsiteSetupId);
    const params = new HttpParams()
      .set('items_per_page', this.#defaultItemsPerPage.toString())
      .set('page', '1')
      .set('channel', query.channel);
    const headers = new HttpHeaders().set('If-Modified-Since', new Date(cachedData.timestamp).toUTCString());

    this.#httpClient
      .get<BaseResponse<ProductSessionsDataDTO>>(url, { headers, params })
      .pipe(
        map(response => this.#productSessionsSummaryAdapter.fromApi(response)),
        switchMap(firstPageResponse => this.#loadCatalogFromApi(query, firstPageResponse)),
        catchError(() => EMPTY),
        finalize(() => {
          this.#productSessionsSummaryStoredService.setBackgroundSyncInProgress(false);
        }),
      )
      .subscribe();
  }
}

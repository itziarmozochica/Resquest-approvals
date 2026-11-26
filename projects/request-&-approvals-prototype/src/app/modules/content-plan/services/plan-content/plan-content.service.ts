import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { ContentSchemaDTO } from '../../components/plan-edition/description-builder/models/block.dto';
import { Block } from '../../components/plan-edition/description-builder/models/block.model';
import { DescriptionTranslationStatusMap } from '../../components/plan-edition/plan-translations-edition/models/description-translation.model';
import { PlanContent } from '../../models/plan-content';
import { ContentSchemaAdapter } from '../content-schema/content-schema.adapter';
import { PlanContentAdapter } from './plan-content.adapter';

interface ContentSchemaResponseDTO {
  data: ContentSchemaDTO | null;
  error: { code: number; message: string } | null;
}

interface MissingTranslationsResponseDTO {
  data: { has_missing_translations: boolean } | null;
  error: { code: number; message: string } | null;
}

export interface ContentSchemaResult {
  readonly blocks: Block[];
  readonly schemaId: string | null;
  readonly statusByCode: DescriptionTranslationStatusMap;
}

/**
 * Neutral result for the guarded/error paths (no plan, request failed, etc.).
 * Known limitation: the success path returns this same shape, so callers cannot tell a failed fetch
 * from a channel that legitimately has no schema of its own.
 */
export const EMPTY_CONTENT_SCHEMA_RESULT: ContentSchemaResult = {
  blocks: [],
  schemaId: null,
  statusByCode: {},
};

function parseStatusByCode(translations: Record<string, { status: string }> | undefined): DescriptionTranslationStatusMap {
  if (translations === undefined) {
    return {};
  }
  const result: Record<string, 'outdated' | 'machine_translated' | 'verified'> = {};
  for (const [code, entry] of Object.entries(translations)) {
    const status = entry?.status;
    if (status === 'outdated' || status === 'machine_translated' || status === 'verified') {
      result[code] = status;
    }
  }
  return result;
}

@Injectable({
  providedIn: 'root',
})
export class PlanContentService {
  readonly #contentSchemaAdapter = inject(ContentSchemaAdapter);

  readonly #contentSchemaCache = new Map<string, Observable<ContentSchemaResult>>();

  constructor(
    private httpClient: HttpClient,
    private planContentAdapter: PlanContentAdapter,
  ) {}

  updatePlanContent(partnerId: number, planId: number, content: PlanContent): Observable<void> {
    const path = this.getContentUrl(partnerId, planId);
    const dto = this.planContentAdapter.toApi(content);
    return this.httpClient.patch<void>(path, dto).pipe(tap(() => this.invalidateContentSchemaCache(planId)));
  }

  /**
   * Deletes a channel's own schema; the server cascades its fields and their
   * translations, so the channel goes back to inheriting the base one.
   */
  deleteChannelContentSchema(partnerId: number, planId: number, channelId: string): Observable<void> {
    const path = `${this.#getContentSchemaUrl(partnerId, planId)}channels/${encodeURIComponent(channelId)}/`;
    return this.httpClient.delete<void>(path).pipe(tap(() => this.invalidateContentSchemaCache(planId)));
  }

  getContentSchema(partnerId: number, planId: number, channelId: string | null, language?: string | null): Observable<ContentSchemaResult> {
    const cacheKey = `${partnerId.toString()}|${planId.toString()}|${channelId ?? ''}|${language ?? ''}`;
    const cached = this.#contentSchemaCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    const path = this.#getContentSchemaUrl(partnerId, planId);
    let params = new HttpParams();
    if (channelId !== null && channelId !== undefined && channelId !== '') {
      params = params.set('channel_id', channelId);
    }
    if (language !== null && language !== undefined && language !== '') {
      params = params.set('language', language);
    }
    const request$ = this.httpClient.get<ContentSchemaResponseDTO>(path, { params }).pipe(
      map((response: ContentSchemaResponseDTO): ContentSchemaResult => {
        if (response.error) {
          throw new Error(response.error.message);
        }
        const data = response.data;
        return {
          blocks: this.#contentSchemaAdapter.fromApi(data?.structure ?? []),
          schemaId: data?.id ?? null,
          statusByCode: parseStatusByCode(data?.translations),
        };
      }),
      catchError((error: unknown) => {
        this.#contentSchemaCache.delete(cacheKey);
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.#contentSchemaCache.set(cacheKey, request$);
    return request$;
  }

  invalidateContentSchemaCache(planId?: number): void {
    if (planId === undefined) {
      this.#contentSchemaCache.clear();
      return;
    }
    const planIdSegment = planId.toString();
    for (const key of [...this.#contentSchemaCache.keys()]) {
      if (key.split('|')[1] === planIdSegment) {
        this.#contentSchemaCache.delete(key);
      }
    }
  }

  getMissingTranslations(partnerId: number, planId: number): Observable<boolean> {
    const path = this.#getMissingTranslationsUrl(partnerId, planId);
    return this.httpClient.get<MissingTranslationsResponseDTO>(path).pipe(
      map((response: MissingTranslationsResponseDTO): boolean => {
        if (response.error) {
          throw new Error(response.error.message);
        }
        return response.data?.has_missing_translations ?? false;
      }),
    );
  }

  private getContentUrl(partnerId: number, planId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId.toString()}/plans/${planId.toString()}/content`;
  }

  #getMissingTranslationsUrl(partnerId: number, planId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId.toString()}/plans/${planId.toString()}/missing-translations/`;
  }

  #getContentSchemaUrl(partnerId: number, planId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId.toString()}/plans/${planId.toString()}/content-schema/`;
  }
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { environment } from '@fz-original/environments/environment';
import { finalize, Observable, shareReplay } from 'rxjs';
import { map } from 'rxjs/operators';

import { TagApiResponse } from '../models/tag-response.model';
import { Tag, TagDraft } from '../models/tag.model';
import { toEmptySuccess, toErrorResponse } from '../utils/tag-http.util';
import { TagsAdapter } from './tags.adapter';

@Injectable({
  providedIn: 'root',
})
export class TagsService {
  readonly #adapter = inject(TagsAdapter);
  readonly #http = inject(HttpClient);
  readonly #catalogInFlight = new Map<number, Observable<BaseResponse<Tag[]>>>();

  // A create answers with a message, not the stored tag, so the caller has to reload the list.
  createTag(partnerId: number, draft: TagDraft): Observable<BaseResponse<null>> {
    return this.#http.post<unknown>(this.#tagsUrl(partnerId), this.#adapter.toApi(draft)).pipe(toEmptySuccess(), toErrorResponse<null>());
  }

  deleteTag(partnerId: number, tagId: number): Observable<BaseResponse<null>> {
    return this.#http.delete<unknown>(this.#tagUrl(partnerId, tagId)).pipe(toEmptySuccess(), toErrorResponse<null>());
  }

  getTags(partnerId: number): Observable<BaseResponse<Tag[]>> {
    const inFlight = this.#catalogInFlight.get(partnerId);

    if (inFlight !== undefined) {
      return inFlight;
    }

    const catalog = this.#http.get<BaseResponse<TagApiResponse[] | null>>(this.#tagsUrl(partnerId)).pipe(
      map(response => this.#adapter.fromApi(response)),
      toErrorResponse<Tag[]>(),
      finalize(() => this.#catalogInFlight.delete(partnerId)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.#catalogInFlight.set(partnerId, catalog);

    return catalog;
  }

  updateTag(partnerId: number, tagId: number, draft: TagDraft): Observable<BaseResponse<null>> {
    return this.#http
      .put<unknown>(this.#tagUrl(partnerId, tagId), this.#adapter.toApi(draft))
      .pipe(toEmptySuccess(), toErrorResponse<null>());
  }

  #tagsUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/partner-tags/`;
  }

  #tagUrl(partnerId: number, tagId: number): string {
    return `${this.#tagsUrl(partnerId)}${tagId}/`;
  }
}

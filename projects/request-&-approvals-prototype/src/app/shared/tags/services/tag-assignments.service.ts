import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { environment } from '@fz-original/environments/environment';
import { finalize, Observable, shareReplay } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { TagAssignment, TagTargetType } from '../models/tag-assignment.model';
import { TagAssignmentApiResponse, TagAssignmentsRequest } from '../models/tag-response.model';
import { TagAssignmentTarget } from '../models/tag.model';
import { toEmptySuccess, toErrorResponse } from '../utils/tag-http.util';
import { TagAssignmentsAdapter } from './tag-assignments.adapter';

@Injectable({
  providedIn: 'root',
})
export class TagAssignmentsService {
  readonly #adapter = inject(TagAssignmentsAdapter);
  readonly #http = inject(HttpClient);
  readonly #readsInFlight = new Map<string, Observable<BaseResponse<TagAssignment[]>>>();

  // What an editor preselects from: unlike the calendar payload this applies no presentation filter,
  // so a colourless tag is still reported and survives the next full-replace write.
  getAssignments(partnerId: number, targetType: TagTargetType, targetIds: readonly string[]): Observable<BaseResponse<TagAssignment[]>> {
    const key = `${partnerId}|${targetType}|${[...targetIds].sort().join(',')}`;
    const inFlight = this.#readsInFlight.get(key);

    if (inFlight !== undefined) {
      return inFlight;
    }

    const url = this.#readUrl(partnerId, targetType);
    const params = this.#readParams(targetType, targetIds);
    const read = this.#http.get<BaseResponse<TagAssignmentApiResponse[] | null>>(url, { params }).pipe(
      map(response => this.#adapter.fromApi(response)),
      toErrorResponse<TagAssignment[]>(),
      // Only its own entry: a write may have replaced it with a newer read (see replaceAssignments).
      finalize(() => this.#readsInFlight.get(key) === read && this.#readsInFlight.delete(key)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.#readsInFlight.set(key, read);

    return read;
  }

  // A full replace: an empty list clears the target's tags. The backend normalises a booking onto its
  // reservation when it has one, so the caller sends whichever id it holds and does not decide.
  replaceAssignments(partnerId: number, target: TagAssignmentTarget, tagIds: readonly number[]): Observable<BaseResponse<null>> {
    const body: TagAssignmentsRequest = { tag_ids: [...tagIds] };

    // A read that started before this write answers with the old tags: the next read after it starts afresh.
    return this.#http.put<unknown>(this.#targetUrl(partnerId, target), body).pipe(
      toEmptySuccess(),
      toErrorResponse<null>(),
      tap(() => this.#forgetReadsInFlight(partnerId)),
    );
  }

  #forgetReadsInFlight(partnerId: number): void {
    for (const key of [...this.#readsInFlight.keys()].filter(key => key.startsWith(`${partnerId}|`))) {
      this.#readsInFlight.delete(key);
    }
  }

  #assignmentsUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/partner-tags/assignments/`;
  }

  #readParams(targetType: TagTargetType, targetIds: readonly string[]): HttpParams {
    const params = targetType === 'lead' ? new HttpParams() : new HttpParams().set('target_type', targetType);

    return params.set('target_ids', targetIds.join(','));
  }

  #readUrl(partnerId: number, targetType: TagTargetType): string {
    return targetType === 'lead' ? `${this.#assignmentsUrl(partnerId)}lead/` : this.#assignmentsUrl(partnerId);
  }

  // Kebab-case in the path, snake_case in the `target_type` query value. Copying one into the other
  // routes the request nowhere.
  #targetPath(target: TagAssignmentTarget): string {
    if ('leadId' in target) {
      return `lead/${target.leadId}`;
    }

    if ('sessionTypeId' in target) {
      return `session-type/${target.sessionTypeId}`;
    }

    return 'reservationId' in target ? `reservation/${target.reservationId}` : `order/${target.orderId}`;
  }

  #targetUrl(partnerId: number, target: TagAssignmentTarget): string {
    return `${this.#assignmentsUrl(partnerId)}${this.#targetPath(target)}/`;
  }
}

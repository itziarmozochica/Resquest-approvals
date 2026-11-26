import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { environment } from '@fz-original/environments/environment';
import { Observable, of, ReplaySubject } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';

import type { WhitelabelAccessListData, WhitelabelAccessListResult } from '../models/whitelabel-access.model';
import { WhitelabelAccessAdapter } from './adapters/whitelabel-access.adapter';

@Injectable({
  providedIn: 'root',
})
export class WhitelabelAccessService {
  readonly #http = inject(HttpClient);
  readonly #adapter = inject(WhitelabelAccessAdapter);

  #organizationId: number | null = null;
  #loaded = false;
  #loadErrored = false;
  #unrestricted = false;
  #canEditByWhitelabelId = new Map<string, boolean>();
  #request$: Observable<WhitelabelAccessListResult> | null = null;
  readonly #access$ = new ReplaySubject<void>(1);

  canEdit(applicationId: string | null | undefined): boolean {
    if (this.#unrestricted) {
      return true;
    }

    if (applicationId == null) {
      return false;
    }

    return this.#canEditByWhitelabelId.get(applicationId) === true;
  }

  clear(): void {
    this.#organizationId = null;
    this.#loaded = false;
    this.#loadErrored = false;
    this.#unrestricted = false;
    this.#canEditByWhitelabelId.clear();
    this.#request$ = null;
    this.#access$.next();
  }

  hasLoadError(): boolean {
    return this.#loadErrored;
  }

  load(organizationId: number): Observable<WhitelabelAccessListResult> {
    if (this.#loaded && this.#organizationId === organizationId) {
      return of(this.#currentAccessList());
    }

    if (this.#request$ !== null && this.#organizationId === organizationId) {
      return this.#request$;
    }

    this.#organizationId = organizationId;
    this.#loaded = false;
    this.#loadErrored = false;
    this.#unrestricted = false;
    this.#canEditByWhitelabelId.clear();

    const organizationIdForRequest = organizationId;

    this.#request$ = this.#http
      .get<BaseResponse<WhitelabelAccessListData>>(this.#getUrl(organizationId), {
        params: new HttpParams().set('with_permission', 'can_view'),
      })
      .pipe(
        map(response => this.#adapter.fromApi(response)),
        tap(accessList => this.#applyAccess(organizationIdForRequest, accessList, false)),
        catchError(() => {
          this.#applyAccess(organizationIdForRequest, { accesses: [], unrestricted: false }, true);
          return of<WhitelabelAccessListResult>({ accesses: [], unrestricted: false });
        }),
        finalize(() => {
          this.#request$ = null;
        }),
        shareReplay(1),
      );

    return this.#request$;
  }

  observeAccess(): Observable<void> {
    return this.#access$.asObservable();
  }

  #applyAccess(organizationId: number, accessList: WhitelabelAccessListResult, errored: boolean): void {
    if (this.#organizationId !== organizationId) {
      return;
    }

    this.#loadErrored = errored;
    this.#unrestricted = accessList.unrestricted;
    this.#canEditByWhitelabelId.clear();
    accessList.accesses.forEach(access => this.#canEditByWhitelabelId.set(access.whitelabelId, access.canEdit));
    this.#loaded = true;
    this.#access$.next();
  }

  #currentAccessList(): WhitelabelAccessListResult {
    return {
      accesses: Array.from(this.#canEditByWhitelabelId.entries()).map(([whitelabelId, canEdit]) => ({
        canEdit,
        whitelabelId,
      })),
      unrestricted: this.#unrestricted,
    };
  }

  #getUrl(organizationId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/whitelabels`;
  }
}

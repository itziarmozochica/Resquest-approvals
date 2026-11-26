import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { BaseResponse } from '../../../shared/models/base-response';
import { ErrorResponseUtils } from '../../../shared/utils/error-response.utils';
import { ProjectApiDto, ProjectsListApiResponse } from '../models/project-api.model';
import { Project, ProjectsPendingTotals } from '../models/project.model';
import { ProjectAdapter } from './project.adapter';
import { ProjectsAdapter } from './projects.adapter';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  readonly #http = inject(HttpClient);
  readonly #launchesAdapter = inject(ProjectsAdapter);
  readonly #launchAdapter = inject(ProjectAdapter);

  readonly #listCache = new Map<number, Observable<BaseResponse<ProjectsListApiResponse | null>>>();

  list(partnerId: number): Observable<BaseResponse<Project[] | null>> {
    return this.#list$(partnerId).pipe(map(response => this.#launchesAdapter.fromApi(response)));
  }

  // Reads the same cached response as `list()`, so it costs no extra request.
  pendingTotals(partnerId: number): Observable<ProjectsPendingTotals> {
    return this.#list$(partnerId).pipe(map(response => this.#launchesAdapter.pendingTotalsFromApi(response)));
  }

  prefetch(partnerId: number): void {
    this.list(partnerId)
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  invalidate(partnerId: number): void {
    this.#listCache.delete(partnerId);
  }

  get(partnerId: number, launchId: string): Observable<BaseResponse<Project | null>> {
    return this.#http.get<BaseResponse<ProjectApiDto>>(this.#detailUrl(partnerId, launchId)).pipe(
      map(response => this.#launchAdapter.fromApi(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<Project | null>(error)),
    );
  }

  #list$(partnerId: number): Observable<BaseResponse<ProjectsListApiResponse | null>> {
    const cached = this.#listCache.get(partnerId);
    if (cached) {
      return cached;
    }
    const request$ = this.#http.get<BaseResponse<ProjectsListApiResponse>>(this.#listUrl(partnerId)).pipe(
      tap(response => {
        if (response?.error != null) {
          this.#listCache.delete(partnerId);
        }
      }),
      catchError(error => {
        this.#listCache.delete(partnerId);
        return ErrorResponseUtils.getErrorResponse<ProjectsListApiResponse>(error);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.#listCache.set(partnerId, request$);
    return request$;
  }

  #listUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/3.0/settings/partners/${partnerId}/projects/`;
  }

  #detailUrl(partnerId: number, launchId: string): string {
    return `${environment.apiBaseUrl}/3.0/settings/partners/${partnerId}/projects/${launchId}/`;
  }
}

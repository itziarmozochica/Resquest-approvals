import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { hasProjectScope } from '@fz-original/app/shared/utils/project-scope.util';
import { environment } from '@fz-original/environments/environment';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { ZiflowFolder, ZiflowFolderApiDto } from '../models/ziflow-folder.model';
import { ZiflowFoldersAdapter } from './ziflow-folders.adapter';

@Injectable({ providedIn: 'root' })
export class ZiflowFoldersService {
  readonly #http = inject(HttpClient);
  readonly #adapter = inject(ZiflowFoldersAdapter);

  get(partnerId: number, projectId: string): Observable<BaseResponse<ZiflowFolder[] | null>> {
    return this.#http.get<BaseResponse<ZiflowFolderApiDto[]>>(this.#url(partnerId, projectId)).pipe(
      map(response => this.#adapter.fromApi(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<ZiflowFolder[] | null>(error)),
    );
  }

  resolveFolder(partnerId: number, projectId: string | null, folder: string): Observable<BaseResponse<ZiflowFolder | null>> {
    const url = `${this.#detailsUrl(partnerId, projectId)}?folder=${encodeURIComponent(folder)}`;
    return this.#http.get<BaseResponse<ZiflowFolderApiDto>>(url).pipe(
      map(response => this.#adapter.fromApiSingle(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<ZiflowFolder | null>(error)),
    );
  }

  getReviewUrl(partnerId: number, projectId: string | null, approvalId: string, folderId: string): Observable<BaseResponse<string | null>> {
    return this.#http.get<BaseResponse<{ review_url: string }>>(this.#reviewUrl(partnerId, projectId, approvalId, folderId)).pipe(
      map(response => new BaseResponse<string | null>(response.data?.review_url ?? null, response.error)),
      catchError(error => ErrorResponseUtils.getErrorResponse<string | null>(error)),
    );
  }

  #url(partnerId: number, projectId: string): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/projects/${projectId}/ziflow-folders/`;
  }

  #detailsUrl(partnerId: number, projectId: string | null): string {
    return `${this.#scopeUrl(partnerId, projectId)}/ziflow-folders/details`;
  }

  #reviewUrl(partnerId: number, projectId: string | null, approvalId: string, folderId: string): string {
    return `${this.#scopeUrl(partnerId, projectId)}/approvals/${approvalId}/ziflow-folders/${folderId}/review-url`;
  }

  #scopeUrl(partnerId: number, projectId: string | null): string {
    const scope = hasProjectScope(projectId) ? `partners/${partnerId}/projects/${projectId}` : `partners/${partnerId}`;
    return `${environment.apiBaseUrl}/3.0/${scope}`;
  }
}

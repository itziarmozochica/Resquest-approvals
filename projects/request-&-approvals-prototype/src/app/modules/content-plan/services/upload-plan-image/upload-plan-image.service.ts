import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, of, throwError } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { BaseResponse } from '../../../../shared/models/base-response';
import { ErrorResponseUtils } from '../../../../shared/utils/error-response.utils';
import { UploadedFileApiResponse, UploadedFileResponse } from '../../models/file-upload-response';
import { mapUploadPlanImageHttpError } from './upload-plan-image-error.util';
import { UploadPlanImageAdapter } from './upload-plan-image.adapter';

@Injectable({
  providedIn: 'root',
})
export class UploadPlanImageService {
  readonly #http = inject(HttpClient);
  readonly #adapter = inject(UploadPlanImageAdapter);

  duplicateFileByReupload(partnerId: number, planId: number, originalUrl: string, originalName: string): Observable<UploadedFileResponse> {
    return this.#downloadFileFromUrl(originalUrl, originalName).pipe(
      mergeMap(file => {
        const url = this.#getUploadFileUrl(partnerId, planId);
        const formData = new FormData();

        formData.append('file', file);

        return this.#http.post<BaseResponse<UploadedFileApiResponse>>(url, formData).pipe(
          map(response => {
            if (response.data !== null) {
              return { fileUrl: response.data.file_url };
            } else {
              throw response.error;
            }
          }),
          catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
        );
      }),
    );
  }

  uploadFile(partnerId: number, planId: number, file: File): Observable<BaseResponse<UploadedFileResponse | null>> {
    return this.#upload(this.#getUploadFileUrl(partnerId, planId), file);
  }

  uploadSessionTypeImage(partnerId: number, planId: number, file: File): Observable<BaseResponse<UploadedFileResponse | null>> {
    return this.#upload(this.#getSessionTypeUploadFileUrl(partnerId, planId), file);
  }

  #downloadFileFromUrl(url: string, originalName: string): Observable<File> {
    return this.#http.get(url, { responseType: 'blob' }).pipe(
      map(blob => {
        return new File([blob], originalName, { type: blob.type });
      }),
      catchError(error => throwError(() => error)),
    );
  }

  #getSessionTypeUploadFileUrl(partnerId: number, planId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId.toString()}/plans/${planId.toString()}/session-types/upload-file`;
  }

  #getUploadFileUrl(partnerId: number, planId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId.toString()}/plans/${planId.toString()}/upload-file`;
  }

  #upload(url: string, file: File): Observable<BaseResponse<UploadedFileResponse | null>> {
    const formData = new FormData();

    formData.append('file', file);

    return this.#http.post<BaseResponse<UploadedFileApiResponse>>(url, formData).pipe(
      map(response => this.#adapter.fromApi(response)),
      catchError(error => of(new BaseResponse<null>(null, mapUploadPlanImageHttpError(error)))),
    );
  }
}

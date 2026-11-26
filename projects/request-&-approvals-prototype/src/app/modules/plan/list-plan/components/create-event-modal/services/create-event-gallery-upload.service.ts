import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { environment } from '@fz-original/environments/environment';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { CreateEventGalleryUploadErrorReason, CreateEventGalleryUploadResult } from '../models/create-event-gallery-upload.model';
import { QuickSetupWriteOriginService } from './quick-setup-write-origin.service';

export interface UploadedGalleryFileResponse {
  file_url: string;
}

@Injectable({
  providedIn: 'root',
})
export class CreateEventGalleryUploadService {
  readonly #maxImageSizeInBytes = 5 * Math.pow(2, 20);
  readonly #maxVideoSizeInBytes = 8 * Math.pow(2, 20);
  readonly #supportedImageTypes = ['image/png', 'image/jpeg'] as const;
  readonly #supportedVideoTypes = ['video/mp4', 'video/quicktime'] as const;

  readonly #httpClient = inject(HttpClient);
  readonly #partnerService = inject(PartnerService);
  readonly #writeOriginService = inject(QuickSetupWriteOriginService);

  uploadFile(file: File): Observable<CreateEventGalleryUploadResult> {
    if (!file?.type) {
      return of({ error: CreateEventGalleryUploadErrorReason.unsupportedFileType });
    }

    if (this.#isVideoFile(file)) {
      return this.#uploadVideo(file);
    }

    if (this.#isImageFile(file)) {
      return this.#uploadImage(file);
    }

    return of({ error: CreateEventGalleryUploadErrorReason.unsupportedFileType });
  }

  uploadContentImage(file: File): Observable<CreateEventGalleryUploadResult> {
    if (!file?.type || !this.#isImageFile(file)) {
      return of({ error: CreateEventGalleryUploadErrorReason.unsupportedFileType });
    }

    const partnerId = this.#partnerService.getPartner()?.id;

    if (partnerId === undefined) {
      return of({ error: CreateEventGalleryUploadErrorReason.uploadFailed });
    }

    return this.#uploadFileToServer(partnerId, file).pipe(
      map(response => this.#mapUploadResponse(response, file.name)),
      catchError(() => of({ error: CreateEventGalleryUploadErrorReason.uploadFailed })),
    );
  }

  #getUploadFileUrl(partnerId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/upload-file`;
  }

  #isImageFile(file: File): boolean {
    return (this.#supportedImageTypes as readonly string[]).includes(file.type);
  }

  #isVideoFile(file: File): boolean {
    return (this.#supportedVideoTypes as readonly string[]).includes(file.type);
  }

  #uploadImage(file: File): Observable<CreateEventGalleryUploadResult> {
    const partnerId = this.#partnerService.getPartner()?.id;

    if (partnerId === undefined) {
      return of({ error: CreateEventGalleryUploadErrorReason.uploadFailed });
    }

    if (file.size > this.#maxImageSizeInBytes) {
      return of({ error: CreateEventGalleryUploadErrorReason.fileTooLarge });
    }

    return this.#uploadFileToServer(partnerId, file).pipe(
      map(response => this.#mapUploadResponse(response, file.name)),
      catchError(() => of({ error: CreateEventGalleryUploadErrorReason.uploadFailed })),
    );
  }

  #uploadVideo(file: File): Observable<CreateEventGalleryUploadResult> {
    const partnerId = this.#partnerService.getPartner()?.id;

    if (partnerId === undefined) {
      return of({ error: CreateEventGalleryUploadErrorReason.uploadFailed });
    }

    if (file.size > this.#maxVideoSizeInBytes) {
      return of({ error: CreateEventGalleryUploadErrorReason.fileTooLarge });
    }

    return this.#uploadFileToServer(partnerId, file).pipe(
      map(response => this.#mapUploadResponse(response, file.name)),
      catchError(() => of({ error: CreateEventGalleryUploadErrorReason.uploadFailed })),
    );
  }

  #mapUploadResponse(response: BaseResponse<UploadedGalleryFileResponse>, fileName: string): CreateEventGalleryUploadResult {
    const fileUrl = response.data?.file_url;

    if (!fileUrl) {
      return { error: CreateEventGalleryUploadErrorReason.uploadFailed };
    }

    return { fileName, fileUrl };
  }

  #uploadFileToServer(partnerId: number, file: File): Observable<BaseResponse<UploadedGalleryFileResponse>> {
    const url = this.#getUploadFileUrl(partnerId);
    const formData = new FormData();

    formData.append('file', file);

    return this.#httpClient
      .post<BaseResponse<UploadedGalleryFileResponse>>(url, formData, { context: this.#writeOriginService.context() })
      .pipe(
        catchError(error => {
          return of(
            new BaseResponse<UploadedGalleryFileResponse>(null, {
              code: error.status,
              message: `errors.${error.status}`,
            }),
          );
        }),
      );
  }
}

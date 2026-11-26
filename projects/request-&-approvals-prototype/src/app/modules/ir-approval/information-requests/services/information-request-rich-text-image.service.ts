import { inject, Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { S3MultipartUploadService } from '@fz-original/app/shared/services/s3-multipart-upload.service';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { map, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface InformationRequestRichTextImageApiDto {
  url: string;
  object_key: string;
  mime_type: string;
}

export interface InformationRequestRichTextImageResult {
  url: string;
  objectKey: string;
  mimeType: string;
}

@Injectable({ providedIn: 'root' })
export class InformationRequestRichTextImageService {
  readonly #s3MultipartUpload = inject(S3MultipartUploadService);

  upload(
    partnerId: number,
    launchId: string,
    informationRequestId: string,
    questionId: string,
    file: File,
  ): Observable<BaseResponse<InformationRequestRichTextImageResult | null>> {
    const initiateUrl = `${this.#endpointUrl(partnerId, launchId, informationRequestId, questionId)}-uploads/`;
    return this.#s3MultipartUpload.upload<InformationRequestRichTextImageApiDto>(file, partnerId, launchId, initiateUrl).pipe(
      map(response => this.#mapResponse(partnerId, launchId, informationRequestId, questionId, response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<InformationRequestRichTextImageResult | null>(error)),
    );
  }

  #endpointUrl(partnerId: number, launchId: string, informationRequestId: string, questionId: string): string {
    return (
      `${environment.apiBaseUrl}/3.0/partners/${partnerId}/projects/${launchId}` +
      `/information-requests/${informationRequestId}/questions/${questionId}/rich-text-image`
    );
  }

  #mapResponse(
    partnerId: number,
    launchId: string,
    informationRequestId: string,
    questionId: string,
    response: BaseResponse<InformationRequestRichTextImageApiDto | null>,
  ): BaseResponse<InformationRequestRichTextImageResult | null> {
    if (!response?.data) {
      return new BaseResponse<InformationRequestRichTextImageResult | null>(null, response?.error ?? null);
    }
    const result: InformationRequestRichTextImageResult = {
      objectKey: response.data.object_key,
      mimeType: response.data.mime_type,
      url: this.#buildSignedSrc(partnerId, launchId, informationRequestId, questionId, response.data),
    };
    return new BaseResponse<InformationRequestRichTextImageResult | null>(result, response.error ?? null);
  }

  #buildSignedSrc(
    partnerId: number,
    launchId: string,
    informationRequestId: string,
    questionId: string,
    dto: InformationRequestRichTextImageApiDto,
  ): string {
    const base = this.#endpointUrl(partnerId, launchId, informationRequestId, questionId);
    const params = new URLSearchParams({ object_key: dto.object_key });
    const signature = this.#extractQueryParam(dto.url, 'signature');
    if (signature) {
      params.set('signature', signature);
    }
    const expiresAt = this.#extractQueryParam(dto.url, 'expires_at');
    if (expiresAt) {
      params.set('expires_at', expiresAt);
    }
    return `${base}/content/?${params.toString()}`;
  }

  #extractQueryParam(url: string, name: string): string | null {
    const idx = url.indexOf('?');
    if (idx === -1) {
      return null;
    }
    return new URLSearchParams(url.slice(idx + 1)).get(name);
  }
}

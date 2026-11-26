import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { S3MultipartUploadService } from '@fz-original/app/shared/services/s3-multipart-upload.service';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { hasProjectScope } from '@fz-original/app/shared/utils/project-scope.util';
import { environment } from '@fz-original/environments/environment';
import { map, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ApprovalAssetApiDto } from '../models/approval-api.model';
import { ApprovalDriveAcceptedFile } from '../models/approval-drive-file.model';
import { mapAsset } from '../models/approval.mapper';
import { ApprovalAsset } from '../models/approval.model';

export interface DriveFileValidation {
  valid: boolean;
  name: string;
  mimeType: string;
  discoveredCount: number | null;
  acceptedCount: number | null;
  skippedCount: number | null;
  skippedFiles: string[];
  acceptedExtensions: string[];
  acceptedFiles: ApprovalDriveAcceptedFile[];
}

interface DriveFileValidationApiData {
  valid: boolean;
  name: string;
  mime_type: string;
  discovered_count: number;
  accepted_count: number;
  skipped_count: number;
  skipped_files: string[];
  accepted_extensions: string[];
  accepted_files?: {
    drive_file_id: string;
    name: string;
    mime_type: string;
    path?: string[];
  }[];
}

@Injectable({ providedIn: 'root' })
export class ApprovalAssetsService {
  readonly #httpClient = inject(HttpClient);
  readonly #s3MultipartUpload = inject(S3MultipartUploadService);

  /**
   * Probes a pasted Drive link before submit: checks it exists, is reachable by the integration account
   * and is inside the project's Drive folder. The backend error `code` drives the actionable message the
   * caller surfaces, so a partner learns what to fix at paste time instead of a generic failure on save.
   */
  validateDriveFile(partnerId: number, launchId: string | null, driveFileId: string): Observable<BaseResponse<DriveFileValidation | null>> {
    const url = `${this.#scopeUrl(partnerId, launchId)}/approvals/drive-link/validate/`;
    return this.#httpClient.post<BaseResponse<DriveFileValidationApiData>>(url, { drive_file_id: driveFileId }).pipe(
      map(
        response =>
          new BaseResponse<DriveFileValidation | null>(
            response.data
              ? {
                  valid: response.data.valid,
                  name: response.data.name,
                  mimeType: response.data.mime_type,
                  discoveredCount: response.data.discovered_count ?? null,
                  acceptedCount: response.data.accepted_count ?? null,
                  skippedCount: response.data.skipped_count ?? null,
                  skippedFiles: response.data.skipped_files ?? [],
                  acceptedExtensions: response.data.accepted_extensions ?? [],
                  acceptedFiles: (response.data.accepted_files ?? []).map(file => ({
                    driveFileId: file.drive_file_id,
                    name: file.name,
                    mimeType: file.mime_type,
                    path: file.path ?? [],
                  })),
                }
              : null,
            response.error ?? null,
          ),
      ),
      catchError(error => ErrorResponseUtils.getErrorResponse<DriveFileValidation | null>(error)),
    );
  }

  /**
   * Without a launch the generic `partners/{id}/uploads/` session route is gated on the Information
   * Request permission, so standalone approvals drive their multipart session through the
   * approval-scoped one instead.
   */
  upload(partnerId: number, launchId: string | null, file: File): Observable<BaseResponse<ApprovalAsset | null>> {
    const url = `${this.#attachmentsUrl(partnerId, launchId)}/uploads/`;
    const sessionScope = hasProjectScope(launchId) ? null : 'approvals';
    return this.#s3MultipartUpload.upload<ApprovalAssetApiDto>(file, partnerId, launchId, url, { sessionScope }).pipe(
      map(response => new BaseResponse<ApprovalAsset | null>(response?.data ? mapAsset(response.data) : null, response?.error ?? null)),
      catchError(error => ErrorResponseUtils.getErrorResponse<ApprovalAsset | null>(error)),
    );
  }

  /** Fetches a short-lived backend-signed (presigned) S3 GET URL for an uploaded asset. */
  fetchAssetUrl(partnerId: number, launchId: string | null, assetId: string): Observable<string> {
    return this.#httpClient.get<BaseResponse<{ url: string }>>(`${this.#attachmentsUrl(partnerId, launchId)}/${assetId}/url/`).pipe(
      map(response => {
        const signedUrl = response.data?.url;
        if (!signedUrl) {
          throw response.error ?? new Error('Missing signed URL in response');
        }
        return signedUrl;
      }),
    );
  }

  #attachmentsUrl(partnerId: number, launchId: string | null): string {
    return `${this.#scopeUrl(partnerId, launchId)}/attachments`;
  }

  /**
   * Approvals live either under a launch or directly under the partner ("not linked to any launch"),
   * and every asset endpoint mirrors that split.
   */
  #scopeUrl(partnerId: number, launchId: string | null): string {
    const scope = hasProjectScope(launchId) ? `partners/${partnerId}/projects/${launchId}` : `partners/${partnerId}`;
    return `${environment.apiBaseUrl}/3.0/${scope}`;
  }
}

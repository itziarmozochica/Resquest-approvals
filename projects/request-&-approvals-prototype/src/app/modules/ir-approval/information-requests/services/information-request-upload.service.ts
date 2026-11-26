import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { S3MultipartUploadService } from '@fz-original/app/shared/services/s3-multipart-upload.service';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { hasProjectScope } from '@fz-original/app/shared/utils/project-scope.util';
import { environment } from '@fz-original/environments/environment';
import { map, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { DriveLinkImport, DriveSourceJobStatus } from '../models/drive-link-import.model';

interface CompleteUploadApiData {
  import_job_id: string;
}

interface FileUrlApiData {
  content_type: string;
  expires_in: number;
  file_name: string;
  url: string;
}

interface DriveLinkApiData {
  source_job_id?: string | null;
  source_status?: DriveSourceJobStatus | null;
}

interface DriveLinkImportApiData {
  accepted_count: number;
  accepted_extensions: string[];
  enqueued_count: number;
  import_job_ids: string[];
  question_id: string;
  skipped_files: string[];
  source_drive_file_id: string;
  source_job_id: string;
  source_name: string;
  source_status: DriveSourceJobStatus;
  already_imported_files?: string[];
  failed_files?: string[];
  over_limit_files?: string[];
}

interface DriveLinkImportsApiData {
  imports: DriveLinkImportApiData[];
}

export interface UploadEnqueued {
  importJobId: string;
}

export interface DriveImportResult {
  sourceJobId: string | null;
  sourceStatus: DriveSourceJobStatus | null;
}

/**
 */
@Injectable({ providedIn: 'root' })
export class InformationRequestUploadService {
  readonly #http = inject(HttpClient);
  readonly #s3MultipartUpload = inject(S3MultipartUploadService);

  /** Fetches a short-lived backend-signed (presigned) S3 GET URL for an uploaded file answer. */
  fetchFileUrl(partnerId: number, projectId: string | null, requestId: string, questionId: string, fileKey: string): Observable<string> {
    const url = `${this.#questionUrl(partnerId, projectId, requestId, questionId)}/files/url/`;
    return this.#http.get<BaseResponse<FileUrlApiData>>(url, { params: { file_key: fileKey } }).pipe(
      map(response => {
        const signedUrl = response.data?.url;
        if (!signedUrl) {
          throw response.error ?? new Error('Missing signed URL in response');
        }
        return signedUrl;
      }),
    );
  }

  listDriveLinkImports(partnerId: number, projectId: string | null, requestId: string): Observable<BaseResponse<DriveLinkImport[] | null>> {
    const url = `${this.#requestUrl(partnerId, projectId, requestId)}/drive-link-imports/`;
    return this.#http.get<BaseResponse<DriveLinkImportsApiData>>(url).pipe(
      map(
        response =>
          new BaseResponse<DriveLinkImport[] | null>(
            response.data ? (response.data.imports ?? []).map(toDriveLinkImport) : null,
            response.error,
          ),
      ),
      catchError(error => ErrorResponseUtils.getErrorResponse<DriveLinkImport[] | null>(error)),
    );
  }

  /** `relativePath` is the file's `webkitRelativePath` (folders + filename); '' = root. */
  uploadFromComputer(
    partnerId: number,
    projectId: string | null,
    requestId: string,
    questionId: string,
    file: File,
    relativePath: string = '',
  ): Observable<BaseResponse<UploadEnqueued | null>> {
    const url = `${this.#questionUrl(partnerId, projectId, requestId, questionId)}/uploads/`;
    return this.#s3MultipartUpload.upload<CompleteUploadApiData>(file, partnerId, projectId, url, { relativePath }).pipe(
      map(
        response =>
          new BaseResponse<UploadEnqueued | null>(response.data ? { importJobId: response.data.import_job_id } : null, response.error),
      ),
      catchError(error => ErrorResponseUtils.getErrorResponse<UploadEnqueued | null>(error)),
    );
  }

  uploadFromDrive(
    partnerId: number,
    projectId: string | null,
    requestId: string,
    questionId: string,
    driveFileId: string,
  ): Observable<BaseResponse<DriveImportResult | null>> {
    const url = `${this.#questionUrl(partnerId, projectId, requestId, questionId)}/drive-link/`;
    return this.#http.post<BaseResponse<DriveLinkApiData>>(url, { drive_file_id: driveFileId }).pipe(
      map(
        response =>
          new BaseResponse<DriveImportResult | null>(
            response.data
              ? {
                  sourceJobId: response.data.source_job_id ?? null,
                  sourceStatus: response.data.source_status ?? null,
                }
              : null,
            response.error,
          ),
      ),
      catchError(error => ErrorResponseUtils.getErrorResponse<DriveImportResult | null>(error)),
    );
  }

  #questionUrl(partnerId: number, projectId: string | null, requestId: string, questionId: string): string {
    return `${this.#requestUrl(partnerId, projectId, requestId)}/questions/${questionId}`;
  }

  #requestUrl(partnerId: number, projectId: string | null, requestId: string): string {
    const scope = hasProjectScope(projectId) ? `partners/${partnerId}/projects/${projectId}` : `partners/${partnerId}`;
    return `${environment.apiBaseUrl}/3.0/${scope}/information-requests/${requestId}`;
  }
}

function toDriveLinkImport(data: DriveLinkImportApiData): DriveLinkImport {
  return {
    acceptedCount: data.accepted_count ?? 0,
    acceptedExtensions: data.accepted_extensions ?? [],
    alreadyImportedFiles: data.already_imported_files ?? [],
    enqueuedCount: data.enqueued_count ?? 0,
    failedFiles: data.failed_files ?? [],
    importJobIds: data.import_job_ids ?? [],
    overLimitFiles: data.over_limit_files ?? [],
    questionId: data.question_id,
    skippedFiles: data.skipped_files ?? [],
    sourceDriveFileId: data.source_drive_file_id,
    sourceJobId: data.source_job_id,
    sourceName: data.source_name,
    sourceStatus: data.source_status,
  };
}

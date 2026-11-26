import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { firstValueFrom, from, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BaseResponse } from '../models/base-response';
import { hasProjectScope } from '../utils/project-scope.util';

interface PartUrlApiDto {
  part_number: number;
  url: string;
}

interface InitiateUploadApiData {
  expires_in: number;
  part_size: number;
  parts: PartUrlApiDto[];
  session_id: string;
}

interface CompletedPart {
  etag: string;
  part_number: number;
}

const PART_UPLOAD_CONCURRENCY = 3;
const PART_UPLOAD_MAX_ATTEMPTS = 3;
const COMPLETE_MAX_ATTEMPTS = 3;

/**
 * Feature families that expose their own session routes (part-urls / complete / abort) under the
 * partner, with their own permissions.
 */
export type S3UploadSessionScope = 'approvals';

export interface S3MultipartUploadOptions {
  /**
   * Selects the feature family that owns the session operations instead of deriving them from
   * `partnerId`/`projectId`. Without a launch, the generic `partners/{id}/uploads/` route is gated on
   * the Information Request permission, so the approval flow routes its session through `'approvals'`:
   * the caller that owns the initiate endpoint also owns the session scope. The partner segment is
   * always composed here, so callers never repeat `partnerId`.
   */
  sessionScope?: S3UploadSessionScope | null;
  /** The file's `webkitRelativePath` (folders + filename); absent or '' = root. */
  relativePath?: string;
}

/**
 * Direct-to-S3 multipart upload: initiates an upload session against fever2, PUTs the file
 * parts straight to S3 with presigned URLs (collecting ETags), and completes the session so
 * the backend runs the kind-specific post-upload flow. Aborts the session on failure.
 */
@Injectable({ providedIn: 'root' })
export class S3MultipartUploadService {
  readonly #http = inject(HttpClient);

  upload<T>(
    file: File,
    partnerId: number,
    projectId: string | null,
    initiateUrl: string,
    options: S3MultipartUploadOptions = {},
  ): Observable<BaseResponse<T | null>> {
    return from(this.#run<T>(file, partnerId, projectId, initiateUrl, options.relativePath ?? '', options.sessionScope ?? null));
  }

  async #abortSilently(sessionUrl: string): Promise<void> {
    try {
      await firstValueFrom(this.#http.delete(`${sessionUrl}/`));
    } catch {
      // Best effort: the bucket lifecycle rule cleans up incomplete multipart uploads.
    }
  }

  async #completeWithRetry<T>(sessionUrl: string, completedParts: CompletedPart[]): Promise<BaseResponse<T>> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= COMPLETE_MAX_ATTEMPTS; attempt++) {
      try {
        return await firstValueFrom(this.#http.post<BaseResponse<T>>(`${sessionUrl}/complete/`, { parts: completedParts }));
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }

  async #refreshPartUrl(sessionUrl: string, partNumber: number): Promise<string> {
    const response = await firstValueFrom(
      this.#http.post<BaseResponse<{ parts: PartUrlApiDto[] }>>(`${sessionUrl}/part-urls/`, { part_numbers: [partNumber] }),
    );
    const refreshed = response?.data?.parts?.find(part => part.part_number === partNumber);
    if (!refreshed) {
      throw new Error(`Could not refresh presigned URL for part ${partNumber}`);
    }
    return refreshed.url;
  }

  async #run<T>(
    file: File,
    partnerId: number,
    projectId: string | null,
    initiateUrl: string,
    relativePath: string,
    sessionScope: S3UploadSessionScope | null,
  ): Promise<BaseResponse<T | null>> {
    const initiate = await firstValueFrom(
      this.#http.post<BaseResponse<InitiateUploadApiData>>(initiateUrl, {
        content_type: file.type || 'application/octet-stream',
        filename: file.name,
        size_bytes: file.size,
        ...(relativePath ? { relative_path: relativePath } : {}),
      }),
    );
    if (!initiate?.data) {
      return new BaseResponse<T | null>(null, initiate?.error ?? null);
    }

    const session = initiate.data;
    const sessionUrl = this.#sessionUrl(partnerId, projectId, session.session_id, sessionScope);
    let completedParts: CompletedPart[];
    try {
      completedParts = await this.#uploadParts(file, session, sessionUrl);
    } catch (error) {
      await this.#abortSilently(sessionUrl);
      throw error;
    }

    const complete = await this.#completeWithRetry<T>(sessionUrl, completedParts);
    return new BaseResponse<T | null>(complete?.data ?? null, complete?.error ?? null);
  }

  #sessionScopePath(partnerId: number, projectId: string | null, sessionScope: S3UploadSessionScope | null): string {
    const partnerScope = `partners/${partnerId}`;
    if (sessionScope !== null) {
      return `${partnerScope}/${sessionScope}`;
    }
    return hasProjectScope(projectId) ? `${partnerScope}/projects/${projectId}` : partnerScope;
  }

  #sessionUrl(partnerId: number, projectId: string | null, sessionId: string, sessionScope: S3UploadSessionScope | null): string {
    const scope = this.#sessionScopePath(partnerId, projectId, sessionScope);
    return `${environment.apiBaseUrl}/3.0/${scope}/uploads/${sessionId}`;
  }

  async #uploadPart(file: File, partSize: number, part: PartUrlApiDto, sessionUrl: string): Promise<CompletedPart> {
    const start = (part.part_number - 1) * partSize;
    const body = file.slice(start, Math.min(start + partSize, file.size));

    let url = part.url;
    let lastError: unknown;
    for (let attempt = 1; attempt <= PART_UPLOAD_MAX_ATTEMPTS; attempt++) {
      try {
        const response: HttpResponse<unknown> = await firstValueFrom(
          this.#http.put(url, body, { observe: 'response', responseType: 'text' }),
        );
        const etag = response.headers.get('ETag');
        if (!etag) {
          throw new Error(`Missing ETag header for part ${part.part_number} (check the bucket CORS ExposeHeaders)`);
        }
        return { etag, part_number: part.part_number };
      } catch (error) {
        lastError = error;
        if (attempt < PART_UPLOAD_MAX_ATTEMPTS) {
          url = await this.#refreshPartUrl(sessionUrl, part.part_number).catch(() => url);
        }
      }
    }
    throw lastError;
  }

  async #uploadParts(file: File, session: InitiateUploadApiData, sessionUrl: string): Promise<CompletedPart[]> {
    const queue = [...session.parts];
    const completed: CompletedPart[] = [];
    let failure: unknown = null;
    const workers = Array.from({ length: Math.min(PART_UPLOAD_CONCURRENCY, queue.length) }, async () => {
      for (let part = queue.shift(); part && failure === null; part = queue.shift()) {
        try {
          completed.push(await this.#uploadPart(file, session.part_size, part, sessionUrl));
        } catch (error) {
          failure = failure ?? error;
        }
      }
    });
    await Promise.all(workers);
    if (failure !== null) {
      throw failure;
    }
    return completed.sort((a, b) => a.part_number - b.part_number);
  }
}

import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { AlertConfigPayload } from '@fz-original/app/modules/ir-approval/shared/models/alert-config.model';
import { SKIP_FORBIDDEN_TOAST } from '@fz-original/app/shared/interceptors/skip-forbidden-toast.token';
import { SKIP_RETRY_INTERCEPTOR } from '@fz-original/app/shared/interceptors/skip-retry.token';
import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { hasProjectScope } from '@fz-original/app/shared/utils/project-scope.util';
import { environment } from '@fz-original/environments/environment';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import {
  ApprovalApiDto,
  ApprovalItemCommentApiDto,
  ApprovalItemCommentMentionAccessGrantApiDto,
  ApprovalItemCommentsApiResponse,
  ApprovalsListApiResponse,
  ReviewProgressApiDto,
} from '../models/approval-api.model';
import { ApprovalDriveFileSelection, isApprovalDriveFileSelectionActive } from '../models/approval-drive-file.model';
import { ApprovalItemComment, ApprovalItemCommentDraft, ApprovalMentionAccessGrant } from '../models/approval-item-comment.model';
import { ApprovalUploadMethod, isDriveLinkMethod } from '../models/approval-upload-method.enum';
import { Approval } from '../models/approval.model';
import { ApprovalItemCommentThreadAdapter } from './approval-item-comment-thread.adapter';
import { ApprovalMentionAccessGrantAdapter } from './approval-mention-access-grant.adapter';
import { ApprovalSingleItemCommentAdapter } from './approval-single-item-comment.adapter';
import { ApprovalAdapter } from './approval.adapter';
import { ApprovalsAdapter } from './approvals.adapter';

export interface CreateApprovalPayload {
  title: string;
  category: string;
  subtype: string;
  description?: string;
  dueDate?: string;
  payload?: Record<string, unknown>;
  uploadMethod: ApprovalUploadMethod;
  assetIds?: string[];
  assetRelativePaths?: Record<string, string>;
  driveFiles?: ApprovalDriveFileSelection[];
  alertConfig?: AlertConfigPayload;
  saveAsDraft?: boolean;
  supersedeDraftId?: string;
  ziflowFolder?: string | null;
  ziflowFolderThumbnail?: string | null;
}

export interface ApprovalSpreadsheetTab {
  sheetTabId: number;
  title: string;
}

export interface ApprovalSpreadsheetPreview {
  rows: string[][];
  rowCount: number;
  colCount: number;
  clientCommentsColIndex: number;
}

export type ApprovalItemReviewDecision = 'APPROVE' | 'REJECT' | 'PENDING';

export interface ApprovalItemsReviewResponse {
  approval_id: string;
  status: string;
  item_reviews: Record<string, unknown>;
  pending_required_item_ids?: string[];
  review_progress?: ReviewProgressApiDto | null;
  review_progress_by_item?: Record<string, ReviewProgressApiDto> | null;
  skipped_items?: Record<string, string>;
}

export interface ApprovalItemRemovalResponse {
  approval_id: string;
  removed_item_id: string;
}

export interface ApprovalFileDriveSyncRetryResponse {
  approval_id: string;
  item_id: string;
}

export interface ApprovalFileUrl {
  contentType: string;
  fileName: string;
  url: string;
}

interface ApprovalFileUrlApiData {
  content_type: string;
  expires_in: number;
  file_name: string;
  url: string;
}

@Injectable({ providedIn: 'root' })
export class ApprovalsService {
  readonly #http = inject(HttpClient);
  readonly #listAdapter = inject(ApprovalsAdapter);
  readonly #oneAdapter = inject(ApprovalAdapter);
  readonly #itemCommentThreadAdapter = inject(ApprovalItemCommentThreadAdapter);
  readonly #singleItemCommentAdapter = inject(ApprovalSingleItemCommentAdapter);
  readonly #mentionAccessGrantAdapter = inject(ApprovalMentionAccessGrantAdapter);

  list(partnerId: number, launchId: string): Observable<BaseResponse<Approval[] | null>> {
    return this.#http.get<BaseResponse<ApprovalsListApiResponse>>(`${this.#collectionUrl(partnerId, launchId)}/`).pipe(
      map(response => this.#listAdapter.fromApi(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<Approval[]>(error)),
    );
  }

  listForPartner(partnerId: number): Observable<BaseResponse<Approval[] | null>> {
    return this.#http.get<BaseResponse<ApprovalsListApiResponse>>(`${this.#flatCollectionUrl(partnerId)}/`).pipe(
      map(response => this.#listAdapter.fromApi(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<Approval[]>(error)),
    );
  }

  createStandalone(partnerId: number, payload: CreateApprovalPayload): Observable<BaseResponse<Approval | null>> {
    return this.#http.post<BaseResponse<ApprovalApiDto>>(`${this.#flatCollectionUrl(partnerId)}/`, this.#toApiPayload(payload)).pipe(
      map(response => this.#oneAdapter.fromApi(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<Approval | null>(error)),
    );
  }

  get(partnerId: number, launchId: string | null, approvalId: string): Observable<BaseResponse<Approval | null>> {
    const standalone$ = this.#getApprovalAt(`${this.#flatCollectionUrl(partnerId)}/${approvalId}`);
    if (!launchId) {
      return standalone$;
    }
    // The project-scoped and standalone endpoints are partitioned by project_id, so an approval
    // whose project linkage doesn't match the current route 404s. Fall back to the standalone
    // lookup (same partner + id) so those approvals remain accessible.
    return this.#getApprovalAt(this.#itemUrl(partnerId, launchId, approvalId)).pipe(
      switchMap(response => (this.#isNotFound(response) ? standalone$ : of(response))),
    );
  }

  #getApprovalAt(base: string): Observable<BaseResponse<Approval | null>> {
    return this.#http.get<BaseResponse<ApprovalApiDto>>(`${base}/`).pipe(
      map(response => this.#oneAdapter.fromApi(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<Approval | null>(error)),
    );
  }

  #isNotFound(response: BaseResponse<Approval | null>): boolean {
    const code = response.error?.code;
    return code === 404 || code === '404';
  }

  create(partnerId: number, launchId: string, payload: CreateApprovalPayload): Observable<BaseResponse<Approval | null>> {
    return this.#http.post<BaseResponse<ApprovalApiDto>>(`${this.#collectionUrl(partnerId, launchId)}/`, this.#toApiPayload(payload)).pipe(
      map(response => this.#oneAdapter.fromApi(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<Approval | null>(error)),
    );
  }

  listSpreadsheetTabs(
    partnerId: number,
    launchId: string | null,
    spreadsheetUrl: string,
  ): Observable<BaseResponse<ApprovalSpreadsheetTab[] | null>> {
    return this.#http
      .post<BaseResponse<{ sheets: ApprovalSpreadsheetTab[] }>>(this.#spreadsheetUrl(partnerId, launchId, 'spreadsheet-tabs'), {
        url: spreadsheetUrl,
      })
      .pipe(
        map(response => new BaseResponse(response.data?.sheets ?? null, response.error)),
        catchError(error => ErrorResponseUtils.getErrorResponse<ApprovalSpreadsheetTab[] | null>(error)),
      );
  }

  loadSpreadsheetPreview(
    partnerId: number,
    launchId: string | null,
    spreadsheetUrl: string,
    sheetTabId: number,
  ): Observable<BaseResponse<ApprovalSpreadsheetPreview | null>> {
    return this.#http
      .post<BaseResponse<ApprovalSpreadsheetPreview>>(this.#spreadsheetUrl(partnerId, launchId, 'spreadsheet-preview'), {
        sheet_tab_id: sheetTabId,
        url: spreadsheetUrl,
      })
      .pipe(
        map(response => new BaseResponse(response.data ?? null, response.error)),
        catchError(error => ErrorResponseUtils.getErrorResponse<ApprovalSpreadsheetPreview | null>(error)),
      );
  }

  /**
   * Pre-wired for the partner-scoped `POST /partners/{pid}/approvals/{id}/drive-link/` view landing in fever2; it has
   * no callers yet. The add-items drive flow currently reaches the backend through {@link addItems} with `drive_files`.
   */
  attachDriveFile(
    partnerId: number,
    launchId: string | null,
    approvalId: string,
    driveFileId: string,
  ): Observable<BaseResponse<{ import_job_id: string } | null>> {
    const url = `${this.#itemUrl(partnerId, launchId, approvalId)}/drive-link/`;
    return this.#http
      .post<BaseResponse<{ import_job_id: string }>>(url, { drive_file_id: driveFileId })
      .pipe(catchError(error => ErrorResponseUtils.getErrorResponse<{ import_job_id: string } | null>(error)));
  }

  approve(partnerId: number, approvalId: string): Observable<BaseResponse<{ id: string } | null>> {
    return this.#review(partnerId, approvalId, 'approve', null);
  }

  reject(partnerId: number, approvalId: string, feedback = ''): Observable<BaseResponse<{ id: string } | null>> {
    return this.#review(partnerId, approvalId, 'reject', feedback);
  }

  requestChanges(partnerId: number, approvalId: string, feedback = ''): Observable<BaseResponse<{ id: string } | null>> {
    return this.#review(partnerId, approvalId, 'request-changes', feedback);
  }

  setHiddenColumns(
    partnerId: number,
    launchId: string,
    approvalId: string,
    hiddenColumns: number[],
    actorEmail = '',
  ): Observable<BaseResponse<{ hidden_columns: number[] } | null>> {
    return this.#http
      .put<BaseResponse<{ hidden_columns: number[] }>>(`${this.#itemUrl(partnerId, launchId, approvalId)}/hidden-columns/`, {
        hidden_columns: hiddenColumns,
        actor_email: actorEmail,
      })
      .pipe(catchError(error => ErrorResponseUtils.getErrorResponse<{ hidden_columns: number[] } | null>(error)));
  }

  resendForReview(
    partnerId: number,
    launchId: string,
    approvalId: string,
    itemIds: string[],
    actorEmail = '',
  ): Observable<BaseResponse<{ approval_id: string; status: string } | null>> {
    return this.#http
      .post<
        BaseResponse<{ approval_id: string; status: string }>
      >(`${this.#itemUrl(partnerId, launchId, approvalId)}/resend-for-review/`, { item_ids: itemIds, actor_email: actorEmail })
      .pipe(catchError(error => ErrorResponseUtils.getErrorResponse<{ approval_id: string; status: string } | null>(error)));
  }

  /** Append new URLs and/or files to a sent approval and re-send it for validation. */
  addItems(
    partnerId: number,
    launchId: string | null,
    approvalId: string,
    items: {
      urls?: string[];
      urlReviewModes?: string[];
      assetIds?: string[];
      assetRelativePaths?: Record<string, string>;
      driveFiles?: ApprovalDriveFileSelection[];
    },
    actorEmail = '',
    description?: string,
  ): Observable<BaseResponse<{ approval_id: string; status: string } | null>> {
    const body: Record<string, unknown> = { actor_email: actorEmail };
    if (description !== undefined) {
      body.description = description;
    }
    if (items.urls?.length) {
      body.urls = items.urls;
      body.url_review_modes = items.urlReviewModes ?? items.urls.map(() => 'approve');
    }
    if (items.assetIds?.length) {
      body.asset_ids = items.assetIds;
    }
    if (items.assetRelativePaths && Object.keys(items.assetRelativePaths).length) {
      body.asset_relative_paths = items.assetRelativePaths;
    }
    if (items.driveFiles?.length) {
      const driveFiles = this.#toApiDriveFiles(items.driveFiles);
      if (driveFiles.length) {
        body.drive_files = driveFiles;
      }
    }
    return this.#http
      .post<BaseResponse<{ approval_id: string; status: string }>>(`${this.#itemUrl(partnerId, launchId, approvalId)}/items/`, body)
      .pipe(catchError(error => ErrorResponseUtils.getErrorResponse<{ approval_id: string; status: string } | null>(error)));
  }

  reviewItems(
    partnerId: number,
    launchId: string,
    approvalId: string,
    itemIds: string[],
    decision: ApprovalItemReviewDecision,
    reviewerEmail = '',
    feedback = '',
  ): Observable<BaseResponse<ApprovalItemsReviewResponse | null>> {
    return this.#http
      .post<BaseResponse<ApprovalItemsReviewResponse>>(`${this.#itemUrl(partnerId, launchId, approvalId)}/items/review/`, {
        item_ids: itemIds,
        decision,
        reviewer_email: reviewerEmail,
        feedback,
      })
      .pipe(catchError(error => ErrorResponseUtils.getErrorResponse<ApprovalItemsReviewResponse | null>(error)));
  }

  reviewItemsBatch(
    partnerId: number,
    launchId: string,
    approvalId: string,
    items: { itemId: string; decision: ApprovalItemReviewDecision; feedback?: string }[],
    reviewerEmail = '',
  ): Observable<BaseResponse<ApprovalItemsReviewResponse | null>> {
    return this.#http
      .post<BaseResponse<ApprovalItemsReviewResponse>>(`${this.#itemUrl(partnerId, launchId, approvalId)}/items/review/`, {
        items: items.map(item => ({ item_id: item.itemId, decision: item.decision, feedback: item.feedback ?? '' })),
        reviewer_email: reviewerEmail,
      })
      .pipe(catchError(error => ErrorResponseUtils.getErrorResponse<ApprovalItemsReviewResponse | null>(error)));
  }

  listItemComments(
    partnerId: number,
    launchId: string | null,
    approvalId: string,
    itemId: string,
  ): Observable<BaseResponse<ApprovalItemComment[] | null>> {
    const context = new HttpContext().set(SKIP_FORBIDDEN_TOAST, true);
    return this.#http
      .get<BaseResponse<ApprovalItemCommentsApiResponse>>(this.#itemCommentsUrl(partnerId, launchId, approvalId, itemId), { context })
      .pipe(
        map(response => this.#itemCommentThreadAdapter.fromApi(response)),
        catchError(error => ErrorResponseUtils.getErrorResponse<ApprovalItemComment[] | null>(error)),
      );
  }

  postItemComment(
    partnerId: number,
    launchId: string | null,
    approvalId: string,
    itemId: string,
    draft: ApprovalItemCommentDraft,
  ): Observable<BaseResponse<ApprovalItemComment | null>> {
    const url = this.#itemCommentsUrl(partnerId, launchId, approvalId, itemId);
    const context = new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true).set(SKIP_FORBIDDEN_TOAST, true);
    return this.#http
      .post<BaseResponse<ApprovalItemCommentApiDto>>(url, { body: draft.body, mentioned_emails: draft.mentionedEmails }, { context })
      .pipe(
        map(response => this.#singleItemCommentAdapter.fromApi(response)),
        catchError(error => ErrorResponseUtils.getErrorResponse<ApprovalItemComment | null>(error)),
      );
  }

  editItemComment(
    partnerId: number,
    launchId: string | null,
    approvalId: string,
    itemId: string,
    commentId: string,
    draft: ApprovalItemCommentDraft,
  ): Observable<BaseResponse<ApprovalItemComment | null>> {
    const url = `${this.#itemCommentsUrl(partnerId, launchId, approvalId, itemId)}${encodeURIComponent(commentId)}/`;
    const context = new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true).set(SKIP_FORBIDDEN_TOAST, true);
    return this.#http
      .patch<BaseResponse<ApprovalItemCommentApiDto>>(url, { body: draft.body, mentioned_emails: draft.mentionedEmails }, { context })
      .pipe(
        map(response => this.#singleItemCommentAdapter.fromApi(response)),
        catchError(error => ErrorResponseUtils.getErrorResponse<ApprovalItemComment | null>(error)),
      );
  }

  grantItemCommentMentionAccess(
    partnerId: number,
    launchId: string | null,
    approvalId: string,
    itemId: string,
    commentId: string,
    email: string,
  ): Observable<BaseResponse<ApprovalMentionAccessGrant | null>> {
    return this.#http
      .post<
        BaseResponse<ApprovalItemCommentMentionAccessGrantApiDto>
      >(this.#itemCommentMentionAccessUrl(partnerId, launchId, approvalId, itemId, commentId), { email }, { context: this.#itemCommentWriteContext() })
      .pipe(
        map(response => this.#mentionAccessGrantAdapter.fromApi(response)),
        catchError(error => ErrorResponseUtils.getErrorResponse<ApprovalMentionAccessGrant | null>(error)),
      );
  }

  dismissItemCommentMentionNotice(
    partnerId: number,
    launchId: string | null,
    approvalId: string,
    itemId: string,
    commentId: string,
    email: string,
  ): Observable<BaseResponse<ApprovalItemComment | null>> {
    return this.#http
      .post<
        BaseResponse<ApprovalItemCommentApiDto>
      >(`${this.#itemCommentMentionAccessUrl(partnerId, launchId, approvalId, itemId, commentId)}dismiss/`, { email }, { context: this.#itemCommentWriteContext() })
      .pipe(
        map(response => this.#singleItemCommentAdapter.fromApi(response)),
        catchError(error => ErrorResponseUtils.getErrorResponse<ApprovalItemComment | null>(error)),
      );
  }

  removeItem(
    partnerId: number,
    launchId: string | null,
    approvalId: string,
    itemId: string,
  ): Observable<BaseResponse<ApprovalItemRemovalResponse | null>> {
    return this.#deleteItem$(`${this.#itemUrl(partnerId, launchId, approvalId)}/items/${encodeURIComponent(itemId)}/`);
  }

  retryFileDriveSync(
    partnerId: number,
    launchId: string | null,
    approvalId: string,
    itemId: string,
  ): Observable<BaseResponse<ApprovalFileDriveSyncRetryResponse | null>> {
    const url = `${this.#itemUrl(partnerId, launchId, approvalId)}/files/${encodeURIComponent(itemId)}/retry/`;
    return this.#http
      .post<BaseResponse<ApprovalFileDriveSyncRetryResponse> | null>(url, null, {
        context: new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true),
      })
      .pipe(
        map(
          (response: BaseResponse<ApprovalFileDriveSyncRetryResponse> | null) =>
            response ?? new BaseResponse<ApprovalFileDriveSyncRetryResponse | null>(null, null),
        ),
        catchError((error: BaseErrorResponse) => ErrorResponseUtils.getErrorResponse<ApprovalFileDriveSyncRetryResponse | null>(error)),
      );
  }

  fetchFileUrl(
    partnerId: number,
    launchId: string | null,
    approvalId: string,
    itemId: string,
  ): Observable<BaseResponse<ApprovalFileUrl | null>> {
    const url = `${this.#itemUrl(partnerId, launchId, approvalId)}/files/${encodeURIComponent(itemId)}/url/`;
    return this.#http.get<BaseResponse<ApprovalFileUrlApiData | null>>(url).pipe(
      map((response: BaseResponse<ApprovalFileUrlApiData | null>) => {
        const data = response.data;
        return new BaseResponse<ApprovalFileUrl | null>(
          data != null && data.url !== '' ? { contentType: data.content_type, fileName: data.file_name, url: data.url } : null,
          response.error,
        );
      }),
      catchError((error: BaseErrorResponse) => ErrorResponseUtils.getErrorResponse<ApprovalFileUrl | null>(error)),
    );
  }

  removeUnsyncedFile(
    partnerId: number,
    launchId: string | null,
    approvalId: string,
    itemId: string,
  ): Observable<BaseResponse<ApprovalItemRemovalResponse | null>> {
    return this.#deleteItem$(`${this.#itemUrl(partnerId, launchId, approvalId)}/files/${encodeURIComponent(itemId)}/`);
  }

  updateAlertConfig(
    partnerId: number,
    approvalId: string,
    alertConfig: AlertConfigPayload,
  ): Observable<BaseResponse<{ id: string } | null>> {
    return this.#http
      .put<BaseResponse<{ id: string }>>(`${this.#flatCollectionUrl(partnerId)}/${approvalId}/alert-config/`, { alert_config: alertConfig })
      .pipe(catchError(error => ErrorResponseUtils.getErrorResponse<{ id: string } | null>(error)));
  }

  informOpen(partnerId: number, approvalId: string): Observable<BaseResponse<{ id: string } | null>> {
    return this.#http
      .post<BaseResponse<{ id: string }>>(`${this.#flatCollectionUrl(partnerId)}/${approvalId}/inform-open/`, null)
      .pipe(catchError(error => ErrorResponseUtils.getErrorResponse<{ id: string } | null>(error)));
  }

  cancel(partnerId: number, approvalId: string): Observable<BaseResponse<{ id: string } | null>> {
    return this.#lifecycleTransition(partnerId, approvalId, 'cancel');
  }

  reactivate(partnerId: number, approvalId: string): Observable<BaseResponse<{ id: string } | null>> {
    return this.#lifecycleTransition(partnerId, approvalId, 'reactivate');
  }

  #deleteItem$(url: string): Observable<BaseResponse<ApprovalItemRemovalResponse | null>> {
    return this.#http.delete<BaseResponse<ApprovalItemRemovalResponse> | null>(url).pipe(
      map(
        (response: BaseResponse<ApprovalItemRemovalResponse> | null) =>
          response ?? new BaseResponse<ApprovalItemRemovalResponse | null>(null, null),
      ),
      catchError((error: BaseErrorResponse) => ErrorResponseUtils.getErrorResponse<ApprovalItemRemovalResponse | null>(error)),
    );
  }

  #toApiPayload(payload: CreateApprovalPayload): Record<string, unknown> {
    const body: Record<string, unknown> = {
      title: payload.title,
      category: payload.category,
      subtype: payload.subtype,
      payload: payload.payload ?? {},
    };
    if (payload.description) {
      body.description = payload.description;
    }
    if (payload.dueDate) {
      body.due_date = payload.dueDate;
    }
    if (payload.uploadMethod === ApprovalUploadMethod.COMPUTER) {
      body.asset_ids = payload.assetIds ?? [];
      if (payload.assetRelativePaths && Object.keys(payload.assetRelativePaths).length) {
        body.asset_relative_paths = payload.assetRelativePaths;
      }
    } else if (isDriveLinkMethod(payload.uploadMethod)) {
      const driveFiles = this.#toApiDriveFiles(payload.driveFiles ?? []);
      if (driveFiles.length) {
        body.drive_files = driveFiles;
      }
    }
    if (payload.alertConfig) {
      body.alert_config = payload.alertConfig;
    }
    if (payload.saveAsDraft) {
      body.save_as_draft = true;
    }
    if (payload.supersedeDraftId) {
      body.supersede_draft_id = payload.supersedeDraftId;
    }
    if (payload.ziflowFolder) {
      body.ziflow_folder = payload.ziflowFolder;
    }
    if (payload.ziflowFolderThumbnail) {
      body.ziflow_folder_thumbnail = payload.ziflowFolderThumbnail;
    }
    return body;
  }

  #collectionUrl(partnerId: number, launchId: string): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/projects/${launchId}/approvals`;
  }

  #flatCollectionUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/approvals`;
  }

  #spreadsheetUrl(partnerId: number, launchId: string | null, action: 'spreadsheet-tabs' | 'spreadsheet-preview'): string {
    const base = hasProjectScope(launchId) ? this.#collectionUrl(partnerId, launchId) : this.#flatCollectionUrl(partnerId);
    return `${base}/${action}/`;
  }

  #itemUrl(partnerId: number, launchId: string | null, approvalId: string): string {
    const base = hasProjectScope(launchId) ? this.#collectionUrl(partnerId, launchId) : this.#flatCollectionUrl(partnerId);
    return `${base}/${approvalId}`;
  }

  #itemCommentsUrl(partnerId: number, launchId: string | null, approvalId: string, itemId: string): string {
    return `${this.#itemUrl(partnerId, launchId, approvalId)}/items/${encodeURIComponent(itemId)}/comments/`;
  }

  #itemCommentMentionAccessUrl(partnerId: number, launchId: string | null, approvalId: string, itemId: string, commentId: string): string {
    return `${this.#itemCommentsUrl(partnerId, launchId, approvalId, itemId)}${encodeURIComponent(commentId)}/mention-access/`;
  }

  #itemCommentWriteContext(): HttpContext {
    return new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true).set(SKIP_FORBIDDEN_TOAST, true);
  }

  #partnerAdminItemUrl(partnerId: number, approvalId: string): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/settings/approvals/${approvalId}`;
  }

  // No request body: the backend resolves the actor from the authenticated principal.
  #lifecycleTransition(
    partnerId: number,
    approvalId: string,
    action: 'cancel' | 'reactivate',
  ): Observable<BaseResponse<{ id: string } | null>> {
    return this.#http
      .post<BaseResponse<{ id: string }>>(`${this.#partnerAdminItemUrl(partnerId, approvalId)}/${action}/`, {})
      .pipe(catchError(error => ErrorResponseUtils.getErrorResponse<{ id: string } | null>(error)));
  }

  #toApiDriveFiles(driveFiles: ApprovalDriveFileSelection[]): Record<string, unknown>[] {
    return driveFiles.filter(isApprovalDriveFileSelectionActive).map(file => ({
      drive_file_id: file.driveFileId,
      name: file.name,
      mime_type: file.mimeType,
      ...(file.selectedChildDriveFileIds !== undefined ? { selected_drive_file_ids: file.selectedChildDriveFileIds } : {}),
    }));
  }

  #review(
    partnerId: number,
    approvalId: string,
    action: 'approve' | 'reject' | 'request-changes',
    feedback: string | null,
  ): Observable<BaseResponse<{ id: string } | null>> {
    return this.#http
      .post<BaseResponse<{ id: string }>>(`${this.#flatCollectionUrl(partnerId)}/${approvalId}/${action}/`, { feedback })
      .pipe(catchError(error => ErrorResponseUtils.getErrorResponse<{ id: string } | null>(error)));
  }
}

import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { AlertConfigPayload } from '@fz-original/app/modules/ir-approval/shared/models/alert-config.model';
import { SKIP_RETRY_INTERCEPTOR } from '@fz-original/app/shared/interceptors/skip-retry.token';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { hasProjectScope } from '@fz-original/app/shared/utils/project-scope.util';
import { environment } from '@fz-original/environments/environment';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { InformationRequestApiDto, InformationRequestsListApiResponse } from '../models/information-request-api.model';
import { InformationRequestReviewAction, InformationRequestReviewPayload } from '../models/information-request-review.model';
import {
  InformationRequestTemplateSummary,
  ListInformationRequestTemplatesApiData,
  mapInformationRequestTemplateSummaryDto,
} from '../models/information-request-template.model';
import { InformationRequest } from '../models/information-request.model';
import { InformationRequestAdapter } from './information-request.adapter';
import { InformationRequestsAdapter } from './information-requests.adapter';

export interface QuestionOverridePayload {
  label?: string;
  help_text?: string | null;
  required?: boolean;
  hidden?: boolean;
}

export interface CustomQuestionPayload {
  id: string;
  type: string;
  label: string;
  required: boolean;
  help_text?: string | null;
  options?: string[] | null;
}

export interface CreateInformationRequestPayload {
  service_id: string;
  service_name: string;
  title: string;
  description?: string;
  template_key?: string;
  due_date?: string;
  alert_config?: AlertConfigPayload;
  template_overrides?: Record<string, QuestionOverridePayload>;
  custom_questions?: CustomQuestionPayload[];
}

export interface UpdateAnswerPayload {
  question_id: string;
  value: unknown;
}

export interface FieldConfigPayload {
  add?: string[];
  remove?: string[];
  required?: Record<string, boolean>;
}

export interface InformationRequestSheetPreview {
  spreadsheetId: string;
  sheetName: string;
  rows: string[][];
  rowCount: number;
  colCount: number;
}

@Injectable({ providedIn: 'root' })
export class InformationRequestsService {
  readonly #http = inject(HttpClient);
  readonly #listAdapter = inject(InformationRequestsAdapter);
  readonly #oneAdapter = inject(InformationRequestAdapter);

  list(partnerId: number, launchId: string): Observable<BaseResponse<InformationRequest[] | null>> {
    return this.#http.get<BaseResponse<InformationRequestsListApiResponse>>(`${this.#collectionUrl(partnerId, launchId)}/`).pipe(
      map(response => this.#listAdapter.fromApi(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<InformationRequest[]>(error)),
    );
  }

  listForPartner(partnerId: number): Observable<BaseResponse<InformationRequest[] | null>> {
    return this.#http.get<BaseResponse<InformationRequestsListApiResponse>>(`${this.#flatCollectionUrl(partnerId)}/`).pipe(
      map(response => this.#listAdapter.fromApi(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<InformationRequest[]>(error)),
    );
  }

  createStandalone(partnerId: number, payload: CreateInformationRequestPayload): Observable<BaseResponse<InformationRequest | null>> {
    return this.#http.post<BaseResponse<InformationRequestApiDto>>(`${this.#flatCollectionUrl(partnerId)}/`, payload).pipe(
      map(response => this.#oneAdapter.fromApi(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<InformationRequest | null>(error)),
    );
  }

  get(partnerId: number, launchId: string, requestId: string): Observable<BaseResponse<InformationRequest | null>> {
    return this.#http.get<BaseResponse<InformationRequestApiDto>>(`${this.#itemUrl(partnerId, launchId, requestId)}/`).pipe(
      map(response => this.#oneAdapter.fromApi(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<InformationRequest | null>(error)),
    );
  }

  create(
    partnerId: number,
    launchId: string,
    payload: CreateInformationRequestPayload,
  ): Observable<BaseResponse<InformationRequest | null>> {
    return this.#http.post<BaseResponse<InformationRequestApiDto>>(`${this.#collectionUrl(partnerId, launchId)}/`, payload).pipe(
      map(response => this.#oneAdapter.fromApi(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<InformationRequest | null>(error)),
    );
  }

  updateAnswers(
    partnerId: number,
    launchId: string,
    requestId: string,
    answers: UpdateAnswerPayload[],
    uploadedFileQuestionIds: string[] = [],
    actorEmail?: string | null,
    aiGenerated?: boolean | null,
  ): Observable<BaseResponse<{ id: string } | null>> {
    const body = {
      answers,
      ...(uploadedFileQuestionIds.length ? { uploaded_file_question_ids: uploadedFileQuestionIds } : {}),
      ...(actorEmail ? { actor_email: actorEmail } : {}),
      ...(aiGenerated === null || aiGenerated === undefined ? {} : { ai_generated: aiGenerated }),
    };
    return this.#http
      .patch<BaseResponse<{ id: string }>>(`${this.#itemUrl(partnerId, launchId, requestId)}/answers/`, body)
      .pipe(catchError(error => ErrorResponseUtils.getErrorResponse<{ id: string } | null>(error)));
  }

  updateFieldConfig(partnerId: number, requestId: string, payload: FieldConfigPayload): Observable<BaseResponse<{ id: string } | null>> {
    return this.#http
      .put<BaseResponse<{ id: string }>>(`${this.#flatCollectionUrl(partnerId)}/${encodeURIComponent(requestId)}/field-config/`, payload)
      .pipe(catchError(error => ErrorResponseUtils.getErrorResponse<{ id: string } | null>(error)));
  }

  updateAlertConfig(
    partnerId: number,
    requestId: string,
    alertConfig: AlertConfigPayload,
  ): Observable<BaseResponse<{ id: string } | null>> {
    return this.#http
      .put<
        BaseResponse<{ id: string }>
      >(`${this.#flatCollectionUrl(partnerId)}/${encodeURIComponent(requestId)}/alert-config/`, { alert_config: alertConfig })
      .pipe(catchError(error => ErrorResponseUtils.getErrorResponse<{ id: string } | null>(error)));
  }

  loadSheetPreview(
    partnerId: number,
    launchId: string,
    requestId: string,
    url: string,
  ): Observable<BaseResponse<InformationRequestSheetPreview | null>> {
    return this.#http
      .post<BaseResponse<InformationRequestSheetPreview>>(`${this.#itemUrl(partnerId, launchId, requestId)}/sheet-preview/`, { url })
      .pipe(
        map(response => new BaseResponse(response.data ?? null, response.error)),
        catchError(error => ErrorResponseUtils.getErrorResponse<InformationRequestSheetPreview | null>(error)),
      );
  }

  submit(
    partnerId: number,
    launchId: string,
    requestId: string,
    actorEmail?: string | null,
  ): Observable<BaseResponse<{ id: string } | null>> {
    const body = actorEmail ? { actor_email: actorEmail } : {};
    return this.#http
      .post<BaseResponse<{ id: string }>>(`${this.#itemUrl(partnerId, launchId, requestId)}/submit/`, body)
      .pipe(catchError(error => ErrorResponseUtils.getErrorResponse<{ id: string } | null>(error)));
  }

  cancel(partnerId: number, requestId: string): Observable<BaseResponse<{ id: string } | null>> {
    return this.#lifecycleTransition(partnerId, requestId, 'cancel');
  }

  reactivate(partnerId: number, requestId: string): Observable<BaseResponse<{ id: string } | null>> {
    return this.#lifecycleTransition(partnerId, requestId, 'reactivate');
  }

  approve(partnerId: number, requestId: string): Observable<BaseResponse<{ id: string } | null>> {
    return this.#review(partnerId, requestId, InformationRequestReviewAction.Approve, '');
  }

  reject(partnerId: number, requestId: string, reason: string): Observable<BaseResponse<{ id: string } | null>> {
    return this.#review(partnerId, requestId, InformationRequestReviewAction.Reject, reason);
  }

  requestChanges(partnerId: number, requestId: string, reason: string): Observable<BaseResponse<{ id: string } | null>> {
    return this.#review(partnerId, requestId, InformationRequestReviewAction.RequestChanges, reason);
  }

  listTemplates(partnerId: number): Observable<BaseResponse<InformationRequestTemplateSummary[] | null>> {
    return this.#http.get<BaseResponse<ListInformationRequestTemplatesApiData>>(this.#templatesUrl(partnerId)).pipe(
      map(
        response =>
          new BaseResponse<InformationRequestTemplateSummary[] | null>(
            response.data?.templates?.map(mapInformationRequestTemplateSummaryDto) ?? null,
            response.error,
          ),
      ),
      catchError(error => ErrorResponseUtils.getErrorResponse<InformationRequestTemplateSummary[]>(error)),
    );
  }

  listTemplatesForPartner(partnerId: number): Observable<BaseResponse<InformationRequestTemplateSummary[] | null>> {
    return this.#http.get<BaseResponse<ListInformationRequestTemplatesApiData>>(this.#flatTemplatesUrl(partnerId)).pipe(
      map(
        response =>
          new BaseResponse<InformationRequestTemplateSummary[] | null>(
            response.data?.templates?.map(mapInformationRequestTemplateSummaryDto) ?? null,
            response.error,
          ),
      ),
      catchError(error => ErrorResponseUtils.getErrorResponse<InformationRequestTemplateSummary[]>(error)),
    );
  }

  #collectionUrl(partnerId: number, launchId: string): string {
    return `${environment.apiBaseUrl}/3.0/partners/${encodeURIComponent(partnerId)}/projects/${encodeURIComponent(launchId)}/information-requests`;
  }

  #flatCollectionUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${encodeURIComponent(partnerId)}/information-requests`;
  }

  #itemUrl(partnerId: number, launchId: string, requestId: string): string {
    const base = hasProjectScope(launchId) ? this.#collectionUrl(partnerId, launchId) : this.#flatCollectionUrl(partnerId);
    return `${base}/${encodeURIComponent(requestId)}`;
  }

  // The cancel/reactivate endpoints are partner-scoped admin routes so IAM can authorise them.
  // Named to match `#partnerAdminItemUrl` in approvals.service.ts, which builds the same shape.
  #partnerAdminItemUrl(partnerId: number, requestId: string): string {
    return `${environment.apiBaseUrl}/3.0/partners/${encodeURIComponent(partnerId)}/settings/information-requests/${encodeURIComponent(requestId)}`;
  }

  // No request body: the backend resolves the actor from the authenticated principal.
  #lifecycleTransition(
    partnerId: number,
    requestId: string,
    action: 'cancel' | 'reactivate',
  ): Observable<BaseResponse<{ id: string } | null>> {
    return this.#http
      .post<BaseResponse<{ id: string }>>(`${this.#partnerAdminItemUrl(partnerId, requestId)}/${action}/`, {})
      .pipe(catchError(error => ErrorResponseUtils.getErrorResponse<{ id: string } | null>(error)));
  }

  #review(
    partnerId: number,
    requestId: string,
    action: InformationRequestReviewAction,
    reason: string,
  ): Observable<BaseResponse<{ id: string } | null>> {
    const body: InformationRequestReviewPayload = { reason };
    const context = new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true);
    return this.#http
      .post<BaseResponse<{ id: string }>>(`${this.#partnerAdminItemUrl(partnerId, requestId)}/${action}/`, body, { context })
      .pipe(catchError(error => ErrorResponseUtils.getErrorResponse<{ id: string } | null>(error)));
  }

  #templatesUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${encodeURIComponent(partnerId)}/information-request-catalog/templates/`;
  }

  #flatTemplatesUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${encodeURIComponent(partnerId)}/information-request-catalog/templates/`;
  }
}

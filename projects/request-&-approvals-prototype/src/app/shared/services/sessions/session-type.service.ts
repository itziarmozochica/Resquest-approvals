import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { SanitizeService } from '@fz-original/app/app/services/sanitize/sanitize.service';
import { buildSessionTypeCategoryHttpParams } from '@fz-original/app/modules/inventory/inventory-pricing/shared/utils/session-type-category.util';
import { SKIP_FORBIDDEN_TOAST } from '@fz-original/app/shared/interceptors/skip-forbidden-toast.token';
import { SKIP_RETRY_INTERCEPTOR } from '@fz-original/app/shared/interceptors/skip-retry.token';
import { BaseResponse, BaseResponseDTO } from '@fz-original/app/shared/models/base-response';
import { BulkUpdateSessionTypesAdapter } from '@fz-original/app/shared/services/sessions/bulk-update-session-types.adapter';
import { CreateSessionTypeAdapter } from '@fz-original/app/shared/services/sessions/create-session-type.adapter';
import { SessionTypeInventoryAdapter } from '@fz-original/app/shared/services/sessions/session-type-inventory.adapter';
import { UpdateSessionTypeAdapter } from '@fz-original/app/shared/services/sessions/update-session-type.adapter';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { LinkPaginationResponse } from '../../models/link-pagination-response';
import { SessionTypeCapacitiesByGroup } from '../../models/session-type/session-type-capacity.model';
import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { PartnerService } from '../partner/partner.service';
import { SessionTypeCapacitiesByGroupAdapter, SessionTypeCapacitiesResponseDTO } from './session-type-capacities-by-group.adapter';
import { SessionTypeAdapter, SessionTypeResponseDTO } from './session-type.adapter';
import {
  BulkUpdateSessionTypesAcrossPlansDataDTO,
  BulkUpdateSessionTypesAcrossPlansDTO,
  BulkUpdateSessionTypesAcrossPlansResult,
  BulkUpdateSessionTypesDTO,
  BulkUpdateSessionTypesJobDTO,
  BulkUpdateSessionTypesResult,
  CreatedSessionTypeDTO,
  GetSessionTypesInventoryDTO,
  GetSessionTypesInventoryOptions,
  PatchSessionTypeDTO,
  SessionType,
  SessionTypeBulkEditFormValue,
  SessionTypeFormValue,
  SessionTypeInventory,
  SessionTypeSummary,
  SessionTypeSummaryWithTaxData,
  UpdateBorrowedFromCatalogMainPlanDTO,
  UpdateSessionTypeSortingDTO,
} from './session-type.model';
import { SessionTypesListAdapter, SessionTypeSummariesListDTO } from './session-types-list.adapter';
import { SessionTypesQuery } from './session-types-query-parameters';

@Injectable({
  providedIn: 'root',
})
export class SessionTypeService {
  constructor(
    private httpClient: HttpClient,
    private partnerService: PartnerService,
    private sessionTypeAdapter: SessionTypeAdapter,
    private sessionTypesListAdapter: SessionTypesListAdapter,
    private sessionTypeCapacitiesAdapter: SessionTypeCapacitiesByGroupAdapter,
    private sessionTypeInventoryAdapter: SessionTypeInventoryAdapter,
    private createSessionTypeAdapter: CreateSessionTypeAdapter,
    private updateSessionTypeAdapter: UpdateSessionTypeAdapter,
    private bulkUpdateSessionTypesAdapter: BulkUpdateSessionTypesAdapter,
    private sanitizeService: SanitizeService,
  ) {}

  archiveSessionType(planId: number, sessionTypeId: number): Observable<void> {
    const url = this.archiveSessionTypeUrl(planId, sessionTypeId);

    return this.httpClient.post<void>(url, {}).pipe(catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))));
  }

  bulkUpdateSessionTypes(planId: number, formValue: SessionTypeBulkEditFormValue): Observable<BulkUpdateSessionTypesResult> {
    const url = this.getSessionTypesInventoryUrl(planId);
    const payload = this.bulkUpdateSessionTypesAdapter.toApi(formValue);
    const sanitizedPayload: BulkUpdateSessionTypesDTO = {
      ...payload,
      ...(payload.instructions ? { instructions: this.sanitizeHTML(payload.instructions) } : {}),
      ...(payload.details ? { details: this.sanitizeHTML(payload.details) ?? '' } : {}),
    };

    return this.httpClient
      .patch<BaseResponseDTO<BulkUpdateSessionTypesJobDTO> | null>(url, sanitizedPayload, {
        // A replayed PATCH can apply or enqueue the same bulk edit more than once after the server already accepted the body.
        context: new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true),
      })
      .pipe(
        map((response): BulkUpdateSessionTypesResult => {
          const jobRequestId = response?.data?.job_request_id;
          return jobRequestId != null ? { jobRequestId, kind: 'queued' } : { kind: 'applied' };
        }),
        catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
      );
  }

  bulkUpdateSessionTypesAcrossPlans(payload: BulkUpdateSessionTypesAcrossPlansDTO): Observable<BulkUpdateSessionTypesAcrossPlansResult> {
    const url = this.#getSessionTypesAcrossPlansUrl();
    const sanitizedPayload: BulkUpdateSessionTypesAcrossPlansDTO = {
      requests: payload.requests.map(request => ({
        ...request,
        ...(request.instructions ? { instructions: this.sanitizeHTML(request.instructions) } : {}),
        ...(request.details ? { details: this.sanitizeHTML(request.details) ?? '' } : {}),
      })),
    };

    return this.httpClient
      .patch<BaseResponseDTO<BulkUpdateSessionTypesAcrossPlansDataDTO> | null>(url, sanitizedPayload, {
        // A replayed PATCH can enqueue the same bulk edit more than once after the server already accepted the body.
        context: new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true),
      })
      .pipe(
        map(
          (response): BulkUpdateSessionTypesAcrossPlansResult => ({
            jobs: (response?.data?.job_requests ?? []).map(job => ({
              jobRequestId: job.job_request_id,
              planId: job.main_plan_id,
            })),
          }),
        ),
        catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
      );
  }

  createSessionType(planId: number, sessionTypeBody: SessionTypeFormValue): Observable<number | null> {
    const url = this.createSessionTypeUrl(planId);

    return this.httpClient
      .post<BaseResponseDTO<CreatedSessionTypeDTO> | null>(
        url,
        this.createSessionTypeAdapter.toApi(this.sanitizeSessionTypeFormValue(sessionTypeBody)),
      )
      .pipe(
        map(response => response?.data?.id ?? null),
        catchError(error => throwError(ErrorResponseUtils.getErrorResponseError(error))),
      );
  }

  getSessionType(planId: number, sessionTypeId: number): Observable<SessionType> {
    const url = this.getSessionTypeUrl(planId, sessionTypeId);

    return this.httpClient.get<SessionTypeResponseDTO>(url).pipe(
      map(response => this.sessionTypeAdapter.fromApi(response)),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  getSessionTypeCapacitiesByPlanId(planId: number): Observable<SessionTypeCapacitiesByGroup> {
    const url = this.getSessionTypeCapacitiesByPlanIdUrl(planId);

    return this.httpClient.get<SessionTypeCapacitiesResponseDTO>(url).pipe(
      map(response => this.sessionTypeCapacitiesAdapter.fromApi(response)),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  getSessionTypesByPlanId(
    planId: number,
    query?: SessionTypesQuery,
    includeArchivedTicketTypes?: boolean,
    sessionTypeCategories?: string[],
    skipForbiddenToast = false,
  ): Observable<LinkPaginationResponse<Array<SessionTypeSummary>>> {
    return this.sessionTypesByPlanIdRequest(planId, false, query, sessionTypeCategories, includeArchivedTicketTypes, skipForbiddenToast);
  }

  getSessionTypesByPlanIdWithTaxData(
    planId: number,
    query?: SessionTypesQuery,
    sessionTypeCategories?: string[],
    includeArchivedTicketTypes?: boolean,
  ): Observable<LinkPaginationResponse<Array<SessionTypeSummaryWithTaxData>>> {
    return this.sessionTypesByPlanIdRequest(planId, true, query, sessionTypeCategories, includeArchivedTicketTypes) as ReturnType<
      SessionTypeService['getSessionTypesByPlanIdWithTaxData']
    >;
  }

  getSessionTypesInventoryByPlanId(planId: number, options?: GetSessionTypesInventoryOptions): Observable<SessionTypeInventory | null> {
    const url = this.getSessionTypesInventoryUrl(planId);
    const isArchived = options?.isArchived === undefined ? false : options.isArchived;
    let params = new HttpParams();

    if (isArchived !== null) {
      params = params.set('is_archived', String(isArchived));
    }

    return this.httpClient.get<BaseResponse<GetSessionTypesInventoryDTO>>(url, { params }).pipe(
      map(body => this.sessionTypeInventoryAdapter.fromApi(body)),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  unarchiveSessionType(planId: number, sessionTypeId: number): Observable<void> {
    const url = this.unarchiveSessionTypeUrl(planId, sessionTypeId);

    return this.httpClient.post<void>(url, {}).pipe(catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))));
  }

  updateBorrowedFromCatalogMainPlan(planId: number, payload: UpdateBorrowedFromCatalogMainPlanDTO): Observable<void> {
    const url = this.#getCatalogSessionTypesUrl(planId);

    return this.httpClient
      .patch<void>(url, payload.session_type_ids)
      .pipe(catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))));
  }

  updateSessionType(planId: number, sessionTypeId: number, changes: PatchSessionTypeDTO): Observable<void> {
    const url = this.updateSessionTypeUrl(planId, sessionTypeId);

    const sanitizedChanges = {
      ...changes,
      ...(changes.instructions ? { instructions: this.sanitizeHTML(changes.instructions) } : {}),
      ...(changes.details ? { details: this.sanitizeHTML(changes.details) } : {}),
    };

    return this.httpClient
      .patch<void>(url, sanitizedChanges)
      .pipe(catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))));
  }

  updateSessionTypesSorting(planId: number, payload: UpdateSessionTypeSortingDTO): Observable<void> {
    const url = this.getSessionTypesSortingUrl(planId);

    return this.httpClient
      .patch<void>(url, payload)
      .pipe(catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))));
  }

  updateSessionTypeV2(planId: number, sessionTypeBody: SessionTypeFormValue): Observable<void> {
    const url = this.updateSessionTypeV2Url(planId, sessionTypeBody.id);

    return this.httpClient
      .patch<void>(url, this.updateSessionTypeAdapter.toApi(this.sanitizeSessionTypeFormValue(sessionTypeBody)))
      .pipe(catchError(error => throwError(ErrorResponseUtils.getErrorResponseError(error))));
  }

  #getCatalogSessionTypesUrl(planId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${this.partnerService.getPartner()?.id}/plans/${planId}/catalog-session-types/`;
  }

  #getSessionTypesAcrossPlansUrl(): string {
    return `${environment.apiBaseUrl}/3.0/partners/${this.partnerService.getPartner()?.id}/plans/session-types/`;
  }

  private archiveSessionTypeUrl(planId: number, sessionTypeId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${this.partnerService.getPartner()?.id}/plans/${planId}/session-types/${sessionTypeId}/archive/`;
  }

  private createSessionTypeUrl(planId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${this.partnerService.getPartner()?.id}/plans/${planId}/session-types/`;
  }

  private getSessionTypeCapacitiesByPlanIdUrl(planId: number): string {
    return `${environment.apiBaseUrl}/partners/${this.partnerService.getPartner()?.id}/plans/${planId}/session-types/capacities/`;
  }

  private getSessionTypesInventoryUrl(planId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${this.partnerService.getPartner()?.id}/plans/${planId}/session-types/`;
  }

  private getSessionTypesSortingUrl(planId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${this.partnerService.getPartner()?.id}/plans/${planId}/session-types/sorting/`;
  }

  private getSessionTypesUrl(planId: number): string {
    return `${environment.apiBaseUrl}/partners/${this.partnerService.getPartner()?.id}/plans/${planId}/session-types/`;
  }

  private getSessionTypeUrl(planId: number, sessionTypeId: number): string {
    return `${environment.apiBaseUrl}/partners/${this.partnerService.getPartner()?.id}/plans/${planId}/session-types/${sessionTypeId}/`;
  }

  private sanitizeHTML(html: string): string | null {
    return this.sanitizeService.sanitizeToString(html);
  }

  private sanitizeSessionTypeFormValue(sessionTypeBody: SessionTypeFormValue): SessionTypeFormValue {
    return {
      ...sessionTypeBody,
      ...(sessionTypeBody.instructions ? { instructions: this.sanitizeHTML(sessionTypeBody.instructions) } : {}),
      ...(sessionTypeBody.details ? { details: this.sanitizeHTML(sessionTypeBody.details) } : {}),
    } as SessionTypeFormValue;
  }

  private sessionTypesByPlanIdRequest(
    planId: number,
    includeTaxData: boolean = false,
    query?: SessionTypesQuery,
    sessionTypeCategories?: string[],
    includeArchivedTicketTypes?: boolean,
    skipForbiddenToast = false,
  ): Observable<LinkPaginationResponse<Array<SessionTypeSummary> | Array<SessionTypeSummaryWithTaxData>>> {
    const url = this.getSessionTypesUrl(planId);
    let params = new HttpParams({
      fromObject: {
        ...(query ? { page: query.page, page_size: query.pageSize } : {}),
        ...(includeTaxData ? { include_tax_data: true } : {}),
      },
    });
    const sessionTypeCategoryParams = buildSessionTypeCategoryHttpParams(sessionTypeCategories);

    if (sessionTypeCategoryParams) {
      sessionTypeCategoryParams.keys().forEach(key => {
        sessionTypeCategoryParams.getAll(key)?.forEach(value => {
          params = params.append(key, value);
        });
      });
    }

    if (includeArchivedTicketTypes !== undefined) {
      params = params.set('include_archived_ticket_types', String(includeArchivedTicketTypes));
    }

    const context = new HttpContext().set(SKIP_FORBIDDEN_TOAST, skipForbiddenToast);

    return this.httpClient.get<SessionTypeSummariesListDTO>(url, { context, observe: 'response', params }).pipe(
      map(response => this.sessionTypesListAdapter.fromApi(response)),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  private unarchiveSessionTypeUrl(planId: number, sessionTypeId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${this.partnerService.getPartner()?.id}/plans/${planId}/session-types/${sessionTypeId}/unarchive/`;
  }

  private updateSessionTypeUrl(planId: number, sessionTypeId: number): string {
    return `${environment.apiBaseUrl}/partners/${this.partnerService.getPartner()?.id}/plans/${planId}/session-types/${sessionTypeId}/update/`;
  }

  private updateSessionTypeV2Url(planId: number, sessionTypeId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${this.partnerService.getPartner()?.id}/plans/${planId}/session-types/${sessionTypeId}/`;
  }
}

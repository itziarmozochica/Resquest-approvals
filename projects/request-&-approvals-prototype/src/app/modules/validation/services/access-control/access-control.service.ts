import { HttpClient, HttpContext, HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { forkJoin, from, Observable, of } from 'rxjs';
import { catchError, map, mergeMap, switchMap, tap, toArray } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { DatadogLogService } from '../../../../core/error/datadog/logger/datadog-log.service';
import { SKIP_FORBIDDEN_TOAST } from '../../../../shared/interceptors/skip-forbidden-toast.token';
import {
  AccessControlProfile,
  AccessControlProfileData,
  AccessControlSetup,
  AccessControlSetupData,
  GetAllProfilesResponse,
  SetupWithProfiles,
} from '../../../../shared/models/access-control/access-control.model';
import { BaseErrorResponse, BaseResponse, BaseResponseDTO } from '../../../../shared/models/base-response';
import { CursorPaginationResponse } from '../../../../shared/models/cursor-pagination-response';
import { AccessTicket } from '../../../../shared/models/order/access-ticket.model';
import { Order } from '../../../../shared/models/order/order.model';
import { FeatureFlags } from '../../../../shared/optimizely/feature-flags';
import { OptimizelyService } from '../../../../shared/optimizely/optimizely.service';
import { PartnerService } from '../../../../shared/services/partner/partner.service';
import { ErrorResponseUtils } from '../../../../shared/utils/error-response.utils';
import { BulkUploadPreview } from '../../../access-control/upload-codes/models/bulk-upload-preview.model';
import { BulkUploadPreviewAdapter } from '../../../access-control/upload-codes/services/bulk-upload-preview.adapter';
import { CODE_HISTORY_DEFAULT_PAGE_SIZE, CodeHistoryPageDTO, CodeHistoryQuery, CodeHistoryRecord } from '../../models/code-history.model';
import { UnvalidateCodesApiBody, UnvalidateCodesResponseData } from '../../models/unvalidate-codes-response.model';
import { CodeQueryResponseData, ValidationHistoryEntry, ValidationHistoryEntryDTO } from '../../models/validation-history.model';
import { ValidationResponse } from '../../models/validation-response.model';
import { AccessControlAdapter } from './access-control.adapter';
import { ERROR_CODES } from './access-control.constants';
import { CodeHistoryAdapter } from './code-history.adapter';

export interface CodeValidationInput {
  code: string;
  mainPlanId?: number;
}

export type ValidationOperationFlow = 'box_office_validate_all' | 'order_card_codes' | 'order_card_ticket';

export interface ValidationOperation {
  codeRequestsCount: number;
  flow: ValidationOperationFlow;
  orders: Order[];
  partnerId: number;
  profileSelectionRequired: boolean;
  startedAt: number;
  ticketIdRequestsCount: number;
  ticketIdUnitsCount: number;
  totalCount: number;
  validatedCount: number;
}

export interface ValidateAllCodesResult {
  ambiguousCodes: CodeValidationInput[];
  errorMessage?: string;
  profilesToSelect?: AccessControlProfile[];
  totalCount: number;
  validatedCount: number;
}

@Injectable({ providedIn: 'root' })
export class AccessControlService {
  readonly #codeHistoryAdapter = inject(CodeHistoryAdapter);
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #optimizelyService = inject(OptimizelyService);

  constructor(
    private httpClient: HttpClient,
    private accessControlAdapter: AccessControlAdapter,
    private bulkUploadPreviewAdapter: BulkUploadPreviewAdapter,
    private partnerService: PartnerService,
  ) {}

  validateTicket(partnerId: number, ticketId: number, tickets: number): Observable<BaseResponse<boolean>> {
    const path = this.getValidateTicketUrl(partnerId, ticketId, tickets);
    return this.httpClient.get<void>(path).pipe(
      switchMap(() => {
        return of(new BaseResponse(true, null));
      }),
      catchError(error => {
        return of(
          new BaseResponse(false, {
            code: error.status,
            message: this.isValidErrorMessageForTicket(error) ? error.error.message : 'validateTickets.error',
          }),
        );
      }),
    );
  }

  private isValidErrorMessageForTicket(error: HttpErrorResponse): boolean {
    return error && error.error && error.error.message && !error.error.message.includes('Http failure');
  }

  private getValidateTicketUrl(partnerId: number, ticketId: number, tickets: number): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/tickets/${ticketId}/validate/${tickets}/`;
  }

  validateCode(
    partnerId: number,
    code: string,
    force?: string[],
    setupId?: string,
    profileIds?: string[],
    mainPlanId?: number,
  ): Observable<ValidationResponse> {
    const path = this.#shouldValidateThroughAccessControl()
      ? this.#getAccessControlValidateCodeUrl(partnerId)
      : this.getValidateCodeUrl(partnerId);
    const requestBody: any = {
      code,
      force: force || [],
      ...(mainPlanId != null && { main_plan_ids: [mainPlanId] }),
      ...(profileIds && profileIds.length > 0 && { access_control_profile_ids: profileIds }),
      ...(setupId && { access_control_setup_id: setupId }),
    };

    return this.httpClient.post<void>(path, requestBody).pipe(
      switchMap(result => {
        return of(this.accessControlAdapter.fromApi({ code, data: result, error: null as unknown }));
      }),
      catchError(error => {
        return this.isValidErrorMessage(error.error)
          ? of(this.accessControlAdapter.fromApi({ code, data: error.error.data, error: error.error.error }))
          : of(this.accessControlAdapter.fromApi({ code, error: { code: error.status, message: 'validateTickets.error' } }));
      }),
    );
  }

  private isValidErrorMessage(error: HttpErrorResponse): boolean {
    if (!error || !error.error) {
      return false;
    }

    if (
      Object.keys(ERROR_CODES)
        .map((k: string) => ERROR_CODES[k])
        .indexOf(error.error.code) == -1
    ) {
      return false;
    }

    return true;
  }

  private getValidateCodeUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/2.0/partners/${partnerId}/codes/validate/`;
  }

  #getAccessControlValidateCodeUrl(partnerId: number): string {
    return `${environment.accessControlApiBaseUrl}/api/1.0/partners/${partnerId}/codes/validate`;
  }

  #shouldValidateThroughAccessControl(): boolean {
    return this.#optimizelyService.isFeatureEnabled(FeatureFlags.FZ_AC_MIGRATION) ?? false;
  }

  getCodeValidationHistory(code: string, mainPlanIds: number[]): Observable<ValidationHistoryEntry[]> {
    const path = this.#getCodeQueryUrl(this.partnerService.getPartner()!.id);
    const requestBody = {
      code,
      main_plan_ids: mainPlanIds,
    };

    return this.httpClient.post<{ data: CodeQueryResponseData }>(path, requestBody).pipe(
      map(response => this.#mapValidationHistoryFromApi(code, response.data)),
      catchError(() => of([])),
    );
  }

  #mapValidationHistoryFromApi(code: string, data: CodeQueryResponseData): ValidationHistoryEntry[] {
    const tickets = data?.tickets ?? [];

    for (const ticket of tickets) {
      const matchingCodeData = ticket.codes?.find(codeEntry => codeEntry.code === code);
      if (matchingCodeData?.validated_at_history) {
        return matchingCodeData.validated_at_history.map(historyEntry => this.#mapValidationHistoryEntry(historyEntry));
      }
    }

    return [];
  }

  #mapValidationHistoryEntry(entry: ValidationHistoryEntryDTO): ValidationHistoryEntry {
    return {
      datetime: entry.datetime,
      id: entry.id,
      isExpired: entry.is_expired,
      placeId: entry.place_id,
      profile: entry.profile
        ? {
            id: entry.profile.id,
            name: entry.profile.name,
          }
        : null,
      type: entry.type,
      validator: entry.validator
        ? {
            email: entry.validator.email,
            fullName: entry.validator.full_name,
            id: entry.validator.id,
          }
        : null,
    };
  }

  #getCodeQueryUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/2.0/partners/${partnerId}/codes/query/`;
  }

  getCodeHistory(query: CodeHistoryQuery): Observable<CursorPaginationResponse<CodeHistoryRecord[] | null>> {
    const path = this.#getCodeHistoryUrl(this.partnerService.getPartner()!.id);
    const params = this.#getCodeHistoryParams(query);
    const context = new HttpContext().set(SKIP_FORBIDDEN_TOAST, true);
    return this.httpClient.get<BaseResponseDTO<CodeHistoryPageDTO | null>>(path, { context, observe: 'response', params }).pipe(
      map(result => {
        const page = result.body?.data;
        if (page == null) {
          return new CursorPaginationResponse<CodeHistoryRecord[] | null>(null, null, { code: result.status, message: 'errors.generic' });
        }
        return new CursorPaginationResponse<CodeHistoryRecord[] | null>(
          page.next_cursor,
          this.#codeHistoryAdapter.fromApiEntries(page.entries),
          null,
        );
      }),
      catchError((error: unknown) => ErrorResponseUtils.getErrorForCursorPaginatedResponse(error)),
    );
  }

  #getCodeHistoryParams(query: CodeHistoryQuery): HttpParams {
    if ('cursor' in query) {
      return new HttpParams().set('cursor', query.cursor);
    }
    return new HttpParams().set('code', query.code).set('page_size', query.pageSize ?? CODE_HISTORY_DEFAULT_PAGE_SIZE);
  }

  #getCodeHistoryUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/codes/history/`;
  }

  #getUnvalidateCodesUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/codes/unvalidate/`;
  }

  unvalidateCodes(partnerId: number, codeIds: number[]): Observable<BaseResponse<UnvalidateCodesResponseData | null>> {
    const path = this.#getUnvalidateCodesUrl(partnerId);
    return this.httpClient.post<UnvalidateCodesApiBody>(path, { code_ids: codeIds }).pipe(
      switchMap(body => of(new BaseResponse(body?.data ?? null, null))),
      catchError((error: HttpErrorResponse) => {
        const apiBody = error.error as { error?: { message?: string; user_error?: string }; message?: string } | null;
        const message =
          apiBody?.error?.user_error ?? apiBody?.error?.message ?? apiBody?.message ?? 'validateTicketsNew.unvalidate.genericError';
        return of(
          new BaseResponse<UnvalidateCodesResponseData | null>(null, {
            code: error.status,
            message,
          }),
        );
      }),
    );
  }

  uploadCodes(sessionId: number, csv: File): Observable<BaseResponse<void>> {
    const url = `${environment.apiBaseUrl}/partners/${this.partnerService.getPartner()!.id}/sessions/${sessionId}/upload-codes/`;
    const formData = new FormData();
    formData.append('file', csv);
    return this.httpClient.post(url, formData, { observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 204) {
          return new BaseResponse(null, null);
        }
        const error = {
          code: response.body?.error?.code || response.status,
          message: response.body?.error?.message || 'errors.generic',
        };
        return new BaseResponse(null, error);
      }),
      catchError((error: BaseErrorResponse) => {
        return ErrorResponseUtils.getErrorResponse<void>(error);
      }),
    );
  }

  bulkUploadCodes(mainPlanId: number, formData: FormData): Observable<BaseResponse<any>> {
    const url = `${environment.apiBaseUrl}/partners/${this.partnerService.getPartner()!.id}/plans/${mainPlanId}/upload-codes/`;
    return this.httpClient.post(url, formData, { observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 200 || response.status === 204) {
          return new BaseResponse(response.body?.data || null, null);
        }
        const error = {
          code: response.body?.error?.code || response.status,
          message: response.body?.error?.message || 'errors.generic',
        };
        return new BaseResponse(null, error);
      }),
      catchError((error: BaseErrorResponse) => {
        return ErrorResponseUtils.getErrorResponse<any>(error);
      }),
    );
  }

  previewBulkUploadCodes(mainPlanId: number, formData: FormData): Observable<BaseResponse<BulkUploadPreview | null>> {
    const url = `${environment.apiBaseUrl}/partners/${this.partnerService.getPartner()!.id}/plans/${mainPlanId}/upload-codes/preview/`;
    return this.httpClient.post(url, formData, { observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 200) {
          const transformedData = this.bulkUploadPreviewAdapter.fromApi(response.body?.data);
          return new BaseResponse<BulkUploadPreview>(transformedData, null);
        }
        const error = {
          code: response.body?.error?.code || response.status,
          message: response.body?.error?.message || 'errors.generic',
        };
        return new BaseResponse<BulkUploadPreview>(null, error);
      }),
      catchError((error: BaseErrorResponse) => {
        return ErrorResponseUtils.getErrorResponse<BulkUploadPreview>(error);
      }),
    );
  }

  logValidationOperation({ orders, startedAt, ...operation }: ValidationOperation): void {
    this.#datadogLogService.logInfo('[AccessControl] Validation operation completed', {
      ...operation,
      durationMs: Date.now() - startedAt,
      failedCount: operation.totalCount - operation.validatedCount,
      maxUnitsInOrder: Math.max(0, ...orders.map(order => order.accessTickets?.size ?? 0)),
      ordersCount: orders.length,
    });
  }

  validateAllCodes({
    orders,
    codeInputs,
    partnerId,
    setupId,
    profileIds,
  }: {
    orders?: Order[];
    codeInputs?: CodeValidationInput[];
    partnerId: number;
    setupId?: string;
    profileIds?: string[];
  }): Observable<ValidateAllCodesResult> {
    const codeValidationInputs = codeInputs ?? this.#extractCodeValidationInputs(orders ?? []);
    // Tickets whose codes the API withholds (pending check-in or agreement) can only be validated by ticket id.
    const ticketsWithoutCode = codeInputs ? new Map<number, number>() : this.#extractTicketsWithoutCode(orders ?? []);

    if (codeValidationInputs.length === 0 && ticketsWithoutCode.size === 0) {
      return of({ ambiguousCodes: [], totalCount: 0, validatedCount: 0 });
    }

    const startedAt = Date.now();

    return forkJoin([
      this.#validateCodeInputs(codeValidationInputs, partnerId, setupId, profileIds),
      this.#validateTicketsWithoutCode(partnerId, ticketsWithoutCode, orders ?? []),
    ]).pipe(
      map(([codesResult, ticketsResult]) => {
        const errorMessages = [codesResult.errorMessage, ticketsResult.errorMessage].filter(
          (message): message is string => message !== undefined,
        );

        return {
          ...codesResult,
          ...(errorMessages.length > 0 && { errorMessage: errorMessages.join('; ') }),
          totalCount: codesResult.totalCount + ticketsResult.totalCount,
          validatedCount: codesResult.validatedCount + ticketsResult.validatedCount,
        };
      }),
      tap(result =>
        this.logValidationOperation({
          codeRequestsCount: codeValidationInputs.length,
          flow: 'box_office_validate_all',
          orders: orders ?? [],
          partnerId,
          profileSelectionRequired: (result.profilesToSelect?.length ?? 0) > 0,
          startedAt,
          ticketIdRequestsCount: ticketsWithoutCode.size,
          ticketIdUnitsCount: Array.from(ticketsWithoutCode.values()).reduce((count, units) => count + units, 0),
          totalCount: result.totalCount,
          validatedCount: result.validatedCount,
        }),
      ),
    );
  }

  #validateCodeInputs(
    codeValidationInputs: CodeValidationInput[],
    partnerId: number,
    setupId?: string,
    profileIds?: string[],
  ): Observable<ValidateAllCodesResult> {
    if (codeValidationInputs.length === 0) {
      return of({ ambiguousCodes: [], totalCount: 0, validatedCount: 0 });
    }

    return from(codeValidationInputs).pipe(
      mergeMap(input => {
        return this.validateCode(partnerId, input.code, [], setupId, profileIds, input.mainPlanId).pipe(
          map(response => ({ input, response })),
          catchError(error => {
            const responseError = ErrorResponseUtils.getErrorResponseError(error);

            return of({
              input,
              response: {
                code: input.code,
                validated: false,
                error: { code: responseError.code, message: responseError.message },
              } as ValidationResponse,
            });
          }),
        );
      }),
      toArray(),
      map(results => {
        const validatedCount = results.filter(({ response }) => response.validated && !response.error).length;
        const failedResults = results.filter(({ response }) => !response.validated || response.error);
        const ambiguousResults = failedResults.filter(({ response }) => (response.profilesToSelect?.length ?? 0) > 0);
        const profilesToSelect = ambiguousResults[0]?.response.profilesToSelect;
        const shouldSelectProfile = profilesToSelect != null && profilesToSelect.length > 0;

        return {
          ambiguousCodes: shouldSelectProfile ? ambiguousResults.map(({ input }) => input) : [],
          ...(failedResults.length > 0 && {
            errorMessage: failedResults
              .map(({ response }) => response.error?.message ?? `Code ${response.code}: validation failed`)
              .join('; '),
          }),
          ...(shouldSelectProfile && { profilesToSelect }),
          totalCount: results.length,
          validatedCount,
        };
      }),
    );
  }

  #validateTicketsWithoutCode(
    partnerId: number,
    ticketsToValidateByTicketId: Map<number, number>,
    orders: Order[],
  ): Observable<{ errorMessage?: string; totalCount: number; validatedCount: number }> {
    if (ticketsToValidateByTicketId.size === 0) {
      return of({ totalCount: 0, validatedCount: 0 });
    }

    return from(ticketsToValidateByTicketId).pipe(
      mergeMap(([ticketId, ticketsToValidate]) =>
        this.validateTicket(partnerId, ticketId, ticketsToValidate).pipe(map(response => ({ response, ticketId, ticketsToValidate }))),
      ),
      toArray(),
      map(results => {
        const validatedTicketIds = new Set(results.filter(({ response }) => response.error == null).map(({ ticketId }) => ticketId));
        orders
          .flatMap(order => Array.from(order.accessTickets?.values() ?? []))
          .filter(accessTicket => validatedTicketIds.has(accessTicket.ticketId))
          .forEach(accessTicket => {
            accessTicket.isValidated = true;
          });

        const failedMessages = results
          .filter(({ response }) => response.error != null)
          .map(({ response, ticketId }) => response.error?.message ?? `Ticket ${ticketId}: validation failed`);

        return {
          totalCount: results.reduce((count, { ticketsToValidate }) => count + ticketsToValidate, 0),
          validatedCount: results
            .filter(({ response }) => response.error == null)
            .reduce((count, { ticketsToValidate }) => count + ticketsToValidate, 0),
          ...(failedMessages.length > 0 && { errorMessage: failedMessages.join('; ') }),
        };
      }),
    );
  }

  #extractTicketsWithoutCode(orders: Order[]): Map<number, number> {
    const ticketsToValidateByTicketId = new Map<number, number>();

    orders
      .flatMap(order => Array.from(order.accessTickets?.values() ?? []))
      .filter(accessTicket => this.#hasWithheldCode(accessTicket))
      .forEach(accessTicket => {
        ticketsToValidateByTicketId.set(accessTicket.ticketId, (ticketsToValidateByTicketId.get(accessTicket.ticketId) ?? 0) + 1);
      });

    return ticketsToValidateByTicketId;
  }

  // The API sends `check_in_details` only for tickets with a pending release condition, so a codeless
  // access ticket carrying them has codes that exist but are withheld. Fees and other sessions that
  // never get codes come without it and must not be validated by ticket id.
  #hasWithheldCode(accessTicket: AccessTicket): boolean {
    return (
      !accessTicket.code &&
      accessTicket.isValidated !== true &&
      accessTicket.isTransactionFee !== true &&
      accessTicket.checkInDetails != null &&
      accessTicket.checkInDetails.completedAt == null
    );
  }

  #extractCodeValidationInputs(orders: Order[]): CodeValidationInput[] {
    const inputsByCodeAndPlan = new Map<string, CodeValidationInput>();

    orders.forEach(order => {
      const mainPlanId = order?.catalogPlan?.id ?? order.planId;

      Array.from(order.accessTickets?.values() ?? [])
        .filter(ticket => ticket.code && !ticket.isValidated)
        .forEach(ticket => {
          const key = `${ticket.code}|${mainPlanId}`;
          if (!inputsByCodeAndPlan.has(key)) {
            inputsByCodeAndPlan.set(key, { code: ticket.code!, mainPlanId });
          }
        });
    });

    return Array.from(inputsByCodeAndPlan.values());
  }

  getSetups(organizationId: number): Observable<BaseResponse<AccessControlSetup[] | null>> {
    const url = this.getSetupsUrl(organizationId);
    return this.httpClient.get<BaseResponse<AccessControlSetupData[]>>(url).pipe(
      map(response => this.accessControlAdapter.fromApiSetups(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<AccessControlSetup[]>(error)),
    );
  }

  getProfiles(organizationId: number, setupId: string): Observable<BaseResponse<AccessControlProfile[] | null>> {
    const url = this.getProfilesUrl(organizationId, setupId);
    return this.httpClient.get<BaseResponse<AccessControlProfileData[]>>(url).pipe(
      map(response => this.accessControlAdapter.fromApiProfiles(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<AccessControlProfile[]>(error)),
    );
  }

  getAllProfiles(organizationId: number): Observable<GetAllProfilesResponse> {
    return this.getSetups(organizationId).pipe(
      switchMap(setupsResponse => {
        if (setupsResponse.error || !setupsResponse.data) {
          return of(new GetAllProfilesResponse([], setupsResponse.error));
        }

        const setups = setupsResponse.data;
        if (setups.length === 0) {
          return of(new GetAllProfilesResponse([], null));
        }

        const profileRequests = setups.map(setup =>
          this.getProfiles(organizationId, setup.id).pipe(
            map(profilesResponse => ({
              setupId: setup.id,
              profiles: profilesResponse.data || [],
              error: profilesResponse.error,
            })),
          ),
        );

        return forkJoin(profileRequests).pipe(
          map(profileResults => {
            const hasErrors = profileResults.some(result => result.error);
            if (hasErrors) {
              const firstError = profileResults.find(result => result.error)?.error;
              return new GetAllProfilesResponse([], firstError || null);
            }

            const profilesBySetup = new Map<string, AccessControlProfile[]>();
            profileResults.forEach(result => {
              profilesBySetup.set(result.setupId, result.profiles);
            });

            return this.fromApiAllProfiles(setups, profilesBySetup);
          }),
        );
      }),
      catchError(error => {
        return of(
          new GetAllProfilesResponse([], {
            code: 500,
            message: error.message,
          }),
        );
      }),
    );
  }

  private getSetupsUrl(organizationId: number): string {
    return `${environment.apiBaseUrl}/partners/${organizationId}/access-control-setups/`;
  }

  private getProfilesUrl(organizationId: number, setupId: string): string {
    return `${environment.apiBaseUrl}/partners/${organizationId}/access-control-setups/${setupId}/profiles/`;
  }

  private fromApiAllProfiles(setups: AccessControlSetup[], profilesBySetup: Map<string, AccessControlProfile[]>): GetAllProfilesResponse {
    const setupsWithProfiles: SetupWithProfiles[] = setups.map(setup => ({
      setup,
      profiles: profilesBySetup.get(setup.id) || [],
    }));

    return new GetAllProfilesResponse(setupsWithProfiles, null);
  }
}

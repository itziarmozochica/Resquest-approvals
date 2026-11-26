import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { environment } from '../../../../../../environments/environment';
import { BaseErrorResponse, BaseResponse } from '../../../../../shared/models/base-response';
import { LinkPaginationResponse } from '../../../../../shared/models/link-pagination-response';
import { PartnerService } from '../../../../../shared/services/partner/partner.service';
import { ErrorResponseUtils } from '../../../../../shared/utils/error-response.utils';
import {
  PaymentConfigurationAvailableMethodsCatalog,
  PaymentConfigurationDetail,
  PaymentConfigurationInput,
  PaymentConfigurationListQuery,
  PaymentConfigurationSummary,
  PaymentConfigurationV2,
  PaymentConfigurationV2Input,
  PaymentConfigurationWriteResult,
} from '../../models/payment-configuration';
import {
  PaymentConfigurationAvailableMethodsCatalogDto,
  PaymentConfigurationDetailDto,
  PaymentConfigurationSummaryDto,
  PaymentConfigurationV2Dto,
  PaymentConfigurationWriteResultDto,
} from '../../models/payment-configuration-dto';
import { buildPaymentConfigurationDuplicateInput } from '../../utils/payment-configuration-duplicate-input.util';
import { PaymentConfigurationsAdapter } from './payment-configurations.adapter';

@Injectable({
  providedIn: 'root',
})
export class PaymentConfigurationsService {
  readonly #http = inject(HttpClient);
  readonly #partnerService = inject(PartnerService);
  readonly #adapter = inject(PaymentConfigurationsAdapter);

  createPaymentConfiguration(placeId: number, input: PaymentConfigurationInput): Observable<PaymentConfigurationWriteResult> {
    return this.#http
      .post<BaseResponse<PaymentConfigurationWriteResultDto>>(this.#getCollectionUrl(placeId), this.#adapter.toBodyDto(input))
      .pipe(
        map(response => this.#adapter.fromApiWriteResult(response.data)),
        catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
      );
  }

  createPaymentConfigurationV2(placeId: number, input: PaymentConfigurationV2Input): Observable<PaymentConfigurationV2> {
    return this.#http
      .post<BaseResponse<PaymentConfigurationV2Dto>>(this.#getCollectionUrl(placeId, '2.0'), this.#adapter.toBodyDtoV2(input))
      .pipe(
        map(response => this.#adapter.fromApiV2(response.data as PaymentConfigurationV2Dto)),
        catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
      );
  }

  deletePaymentConfiguration(placeId: number, configurationId: string): Observable<void> {
    return this.#http.delete<void>(this.#getDetailUrl(placeId, configurationId)).pipe(
      map((): undefined => undefined),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  duplicatePaymentConfigurationV2(placeId: number, configurationId: string, name: string): Observable<PaymentConfigurationV2> {
    return this.getPaymentConfigurationV2(placeId, configurationId).pipe(
      switchMap(detail =>
        this.createPaymentConfigurationV2(placeId, {
          ...buildPaymentConfigurationDuplicateInput(detail, name),
          checkout: detail.checkout,
          version: null,
        }),
      ),
    );
  }

  getAvailableMethods(placeId: number): Observable<PaymentConfigurationAvailableMethodsCatalog> {
    return this.#http.get<BaseResponse<PaymentConfigurationAvailableMethodsCatalogDto>>(this.#getAvailableMethodsUrl(placeId)).pipe(
      map(response => this.#adapter.fromApiAvailableMethods(response.data as PaymentConfigurationAvailableMethodsCatalogDto)),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  getPaymentConfiguration(placeId: number, configurationId: string): Observable<PaymentConfigurationDetail> {
    return this.#http.get<BaseResponse<PaymentConfigurationDetailDto>>(this.#getDetailUrl(placeId, configurationId)).pipe(
      map(response => this.#adapter.fromApi(response.data as PaymentConfigurationDetailDto)),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  getPaymentConfigurations(
    query?: PaymentConfigurationListQuery,
  ): Observable<LinkPaginationResponse<PaymentConfigurationSummary[] | null>> {
    const url = this.#getListUrl();
    const params = this.#getListParams(query);
    return this.#http.get<BaseResponse<PaymentConfigurationSummaryDto[]>>(url, { observe: 'response', params }).pipe(
      map(
        (response: HttpResponse<BaseResponse<PaymentConfigurationSummaryDto[]>>) =>
          new LinkPaginationResponse<PaymentConfigurationSummary[]>(
            response.headers.get('Link'),
            this.#adapter.fromApiList(response.body?.data ?? []),
            (response.body?.error as BaseErrorResponse) ?? null,
          ),
      ),
      catchError(error => ErrorResponseUtils.getErrorForPaginatedResponse<PaymentConfigurationSummary>(error)),
    );
  }

  getPaymentConfigurationV2(placeId: number, configurationId: string): Observable<PaymentConfigurationV2> {
    return this.#http.get<BaseResponse<PaymentConfigurationV2Dto>>(this.#getDetailUrl(placeId, configurationId, '2.0')).pipe(
      map(response => this.#adapter.fromApiV2(response.data as PaymentConfigurationV2Dto)),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  updatePaymentConfiguration(
    placeId: number,
    configurationId: string,
    input: PaymentConfigurationInput,
  ): Observable<PaymentConfigurationWriteResult> {
    return this.#http
      .put<BaseResponse<PaymentConfigurationWriteResultDto>>(this.#getDetailUrl(placeId, configurationId), this.#adapter.toBodyDto(input))
      .pipe(
        map(response => this.#adapter.fromApiWriteResult(response.data)),
        catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
      );
  }

  updatePaymentConfigurationV2(
    placeId: number,
    configurationId: string,
    input: PaymentConfigurationV2Input,
  ): Observable<PaymentConfigurationV2> {
    return this.#http
      .put<BaseResponse<PaymentConfigurationV2Dto>>(this.#getDetailUrl(placeId, configurationId, '2.0'), this.#adapter.toBodyDtoV2(input))
      .pipe(
        map(response => this.#adapter.fromApiV2(response.data as PaymentConfigurationV2Dto)),
        catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
      );
  }

  #getAvailableMethodsUrl(placeId: number): string {
    return `${this.#getCollectionUrl(placeId)}/available-methods`;
  }

  #getCollectionUrl(placeId: number, apiVersion: '1.0' | '2.0' = '1.0'): string {
    return `${environment.apiGWBaseUrl}/${apiVersion}/partners/${this.#getPartnerId()}/places/${placeId}/payment-configurations`;
  }

  #getDetailUrl(placeId: number, configurationId: string, apiVersion: '1.0' | '2.0' = '1.0'): string {
    return `${this.#getCollectionUrl(placeId, apiVersion)}/${configurationId}`;
  }

  #getListParams(query?: PaymentConfigurationListQuery): HttpParams {
    const params: Record<string, string> = {};
    if (query?.placeId !== undefined && query.placeId !== null) {
      params.place_id = query.placeId.toString();
    }
    if (query?.page !== undefined && query.page !== null) {
      params.page = query.page.toString();
    }
    if (query?.itemsPerPage !== undefined && query.itemsPerPage !== null) {
      params.items_per_page = query.itemsPerPage.toString();
    }
    if (query?.includeDeleted !== undefined && query.includeDeleted !== null) {
      params.include_deleted = query.includeDeleted ? 'true' : 'false';
    }
    return new HttpParams({ fromObject: params });
  }

  #getListUrl(): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${this.#getPartnerId()}/payment-configurations`;
  }

  #getPartnerId(): number | undefined {
    return this.#partnerService.getPartner()?.id;
  }
}

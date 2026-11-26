import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { BaseResponse } from '../../../../shared/models/base-response';
import { ErrorResponseUtils } from '../../../../shared/utils/error-response.utils';
import { CreatePartnerTransportProviderDto } from '../models/create-partner-transport-provider.dto';
import {
  PartnerTransportProviderDetailResponse,
  PartnerTransportProviderListResponse,
} from '../models/partner-transport-provider-summary.dto';
import { PartnerTransportProviderSummary } from '../models/partner-transport-provider-summary.model';
import { UpdatePartnerTransportProviderDto } from '../models/update-partner-transport-provider.dto';
import { PartnerTransportProviderAdapter } from './partner-transport-provider.adapter';

@Injectable({
  providedIn: 'root',
})
export class PartnerTransportProviderService {
  readonly #http = inject(HttpClient);
  readonly #adapter = inject(PartnerTransportProviderAdapter);

  createPartnerTransportProvider(
    partnerId: number,
    body: CreatePartnerTransportProviderDto,
  ): Observable<BaseResponse<PartnerTransportProviderSummary>> {
    return this.#http.post<PartnerTransportProviderDetailResponse>(this.#collectionUrl(partnerId), body, { observe: 'response' }).pipe(
      map((response: HttpResponse<PartnerTransportProviderDetailResponse | null>) => this.#mapCreateOrUpdateResponse(response, 201)),
      catchError((error: unknown) =>
        of(new BaseResponse<PartnerTransportProviderSummary>(null, ErrorResponseUtils.getErrorResponseError(error))),
      ),
    );
  }

  deletePartnerTransportProvider(partnerId: number, partnerTransportProviderId: number): Observable<BaseResponse<null>> {
    return this.#http.delete<null>(this.#itemUrl(partnerId, partnerTransportProviderId), { observe: 'response' }).pipe(
      map((response: HttpResponse<null>) => {
        if (response.status === 204) {
          return new BaseResponse<null>(null, null);
        }

        return new BaseResponse<null>(null, { code: response.status, message: 'errors.generic' });
      }),
      catchError((error: unknown) => of(new BaseResponse<null>(null, ErrorResponseUtils.getErrorResponseError(error)))),
    );
  }

  getPartnerTransportProviders(partnerId: number): Observable<BaseResponse<PartnerTransportProviderSummary[]>> {
    return this.#http.get<PartnerTransportProviderListResponse>(this.#collectionUrl(partnerId), { observe: 'response' }).pipe(
      map((response: HttpResponse<PartnerTransportProviderListResponse | null>) => this.#mapListResponse(response)),
      catchError((error: unknown) =>
        of(new BaseResponse<PartnerTransportProviderSummary[]>(null, ErrorResponseUtils.getErrorResponseError(error))),
      ),
    );
  }

  updatePartnerTransportProvider(
    partnerId: number,
    partnerTransportProviderId: number,
    body: UpdatePartnerTransportProviderDto,
  ): Observable<BaseResponse<PartnerTransportProviderSummary>> {
    return this.#http
      .patch<PartnerTransportProviderDetailResponse>(this.#itemUrl(partnerId, partnerTransportProviderId), body, { observe: 'response' })
      .pipe(
        map((response: HttpResponse<PartnerTransportProviderDetailResponse | null>) => this.#mapCreateOrUpdateResponse(response, 200)),
        catchError((error: unknown) =>
          of(new BaseResponse<PartnerTransportProviderSummary>(null, ErrorResponseUtils.getErrorResponseError(error))),
        ),
      );
  }

  #collectionUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/partner-transport-providers/`;
  }

  #itemUrl(partnerId: number, partnerTransportProviderId: number): string {
    return `${this.#collectionUrl(partnerId)}${partnerTransportProviderId}/`;
  }

  #mapCreateOrUpdateResponse(
    response: HttpResponse<PartnerTransportProviderDetailResponse | null>,
    expectedStatus: 200 | 201,
  ): BaseResponse<PartnerTransportProviderSummary> {
    if (response.status !== expectedStatus) {
      return new BaseResponse<PartnerTransportProviderSummary>(null, {
        code: response.status,
        message: 'errors.generic',
      });
    }

    const envelope = response.body;
    if (envelope == null) {
      return new BaseResponse<PartnerTransportProviderSummary>(null, {
        code: expectedStatus,
        message: 'errors.generic',
      });
    }

    return this.#adapter.fromSingleApi(envelope);
  }

  #mapListResponse(response: HttpResponse<PartnerTransportProviderListResponse | null>): BaseResponse<PartnerTransportProviderSummary[]> {
    if (response.status !== 200) {
      return new BaseResponse<PartnerTransportProviderSummary[]>(null, {
        code: response.status,
        message: 'errors.generic',
      });
    }

    const envelope = response.body;
    if (envelope == null) {
      return new BaseResponse<PartnerTransportProviderSummary[]>(null, {
        code: 200,
        message: 'errors.generic',
      });
    }

    return this.#adapter.fromApi(envelope);
  }
}

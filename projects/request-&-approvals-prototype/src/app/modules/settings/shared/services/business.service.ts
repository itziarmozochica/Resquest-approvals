import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { UserSignupSource } from '@fz-original/app/modules/settings/shared/models/user-signup-source.enum';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { BaseResponse } from '../../../../shared/models/base-response';
import { LinkPaginationResponse } from '../../../../shared/models/link-pagination-response';
import { ErrorResponseUtils } from '../../../../shared/utils/error-response.utils';
import { BusinessSummary } from '../models/business-summary.model';
import { Business, BusinessData, BusinessesData, CreatedBusinessData } from '../models/business.model';
import { BusinessFiscalDetails, BusinessFormType } from './business-form.type';
import { BusinessQuery } from './business-query';
import { BusinessAdapter } from './business.adapter';
import { UpdateBusinessDTO } from './business.dto';
import { BusinessesQuery } from './businesses-query';
import { BusinessesAdapter } from './businesses.adapter';

@Injectable({
  providedIn: 'root',
})
export class BusinessService {
  #businessAdapter = inject(BusinessAdapter);
  #businessesAdapter = inject(BusinessesAdapter);
  #httpClient = inject(HttpClient);

  createBusiness(organizationId: number, body: BusinessFormType): Observable<BaseResponse<CreatedBusinessData | null>> {
    const path = this.createBusinessesUrl(organizationId);
    const business = this.#businessAdapter.toApi(body);
    const glCode = body.glCode?.trim();
    const externalBusinessId = body.externalBusinessId?.trim();
    const payload = {
      ...business,
      signup_source: UserSignupSource.FEVERZONE,
      ...(glCode ? { gl_code: glCode } : {}),
      ...(externalBusinessId ? { external_business_id: externalBusinessId } : {}),
    };

    return this.#httpClient.post<BaseResponse<CreatedBusinessData>>(path, payload, { observe: 'response' }).pipe(
      map((response: HttpResponse<BaseResponse<CreatedBusinessData>>) => {
        if (response.status === 201) {
          return new BaseResponse<CreatedBusinessData | null>(response.body?.data ?? null, null);
        }
        let error = null;
        if (response.body?.error) {
          error = { code: response.body.error.code, message: 'errors.generic' };
        }
        return new BaseResponse<CreatedBusinessData | null>(null, error);
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<string>(error)),
    );
  }

  downloadBusinesses(queryParameters: BusinessesQuery): Observable<Blob> {
    const path = this.downloadBusinessesUrl(queryParameters.organizationId);
    const params = this.getBusinessesDownloadParameters(queryParameters);

    return this.#httpClient.get(path, { params, responseType: 'blob' });
  }

  getBusiness(queryParameters: BusinessQuery): Observable<BaseResponse<Business | null>> {
    const path = this.getBusinessUrl(queryParameters.organizationId, queryParameters.businessId);
    const params = this.#withMarketplaceExclusion(queryParameters.excludeB2bMarketplace);

    return this.#httpClient.get<BaseResponse<BusinessData>>(path, { observe: 'response', params }).pipe(
      switchMap((result: HttpResponse<BaseResponse<BusinessData>>) => {
        return of(this.#businessAdapter.fromApi(result));
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<Business>(error)),
    );
  }

  getBusinesses(queryParameters: BusinessesQuery): Observable<LinkPaginationResponse<BusinessSummary | null>> {
    const path = this.getBusinessesUrl(queryParameters.organizationId);
    const params = this.#withMarketplaceExclusion(queryParameters.excludeB2bMarketplace, this.getBusinessesParameters(queryParameters));

    return this.#httpClient.get<BaseResponse<BusinessesData>>(path, { observe: 'response', params }).pipe(
      switchMap((result: HttpResponse<BaseResponse<BusinessesData>>) => {
        return of(this.#businessesAdapter.fromApi(result));
      }),
      catchError(error => ErrorResponseUtils.getErrorForPaginatedResponse<BusinessSummary>(error)),
    );
  }

  getMyBusiness(queryParameters: BusinessQuery): Observable<BaseResponse<Business | null>> | never {
    if (queryParameters.userId === undefined) {
      throw new Error('User ID is required');
    }
    const path = this.getMyBusinessUrl(queryParameters.organizationId, queryParameters.businessId, queryParameters.userId);

    return this.#httpClient.get<BaseResponse<BusinessData>>(path, { observe: 'response' }).pipe(
      switchMap((result: HttpResponse<BaseResponse<BusinessData>>) => {
        return of(this.#businessAdapter.fromApi(result));
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<Business>(error)),
    );
  }

  updateConcessionGlCode(partnerId: number, concessionId: string, glCode: string | null): Observable<BaseResponse<unknown>> {
    return this.#patchConcessionField(partnerId, concessionId, 'gl_code', glCode);
  }

  updateConcessionExternalBusinessId(
    partnerId: number,
    concessionId: string,
    externalBusinessId: string | null,
  ): Observable<BaseResponse<unknown>> {
    return this.#patchConcessionField(partnerId, concessionId, 'external_business_id', externalBusinessId);
  }

  #patchConcessionField(
    partnerId: number,
    concessionId: string,
    field: 'gl_code' | 'external_business_id',
    value: string | null,
  ): Observable<BaseResponse<unknown>> {
    const path = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/concessions/${concessionId}`;

    return this.#httpClient.patch<BaseResponse<unknown>>(path, { [field]: value }, { observe: 'response' }).pipe(
      map((response: HttpResponse<BaseResponse<unknown>>) => {
        if (response.status === 204) {
          return new BaseResponse({}, null);
        }
        let error = null;
        if (response.body?.error) {
          error = { code: response.body.error.code, message: 'errors.generic' };
        }
        return new BaseResponse(null, error);
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<string>(error)),
    );
  }

  updateBusiness(queryParameters: BusinessQuery, body: BusinessFormType): Observable<BaseResponse<unknown>> {
    const path = this.updateBusinessesUrl(queryParameters.organizationId, queryParameters.businessId);
    const business = this.#businessAdapter.toApi(body);
    const params = this.#withMarketplaceExclusion(queryParameters.excludeB2bMarketplace);

    return this.#httpClient.put<BaseResponse<unknown>>(path, business, { observe: 'response', params }).pipe(
      map((response: HttpResponse<BaseResponse<unknown>>) => {
        if (response.status === 204) {
          return new BaseResponse({}, null);
        }
        let error = null;
        if (response.body?.error) {
          error = { code: response.body.error.code, message: 'errors.generic' };
        }
        return new BaseResponse(null, error);
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<string>(error)),
    );
  }

  updateMyBusiness(queryParameters: BusinessQuery, body: BusinessFormType): Observable<BaseResponse<unknown>> | never {
    return this.#putMyBusiness(queryParameters, this.#businessAdapter.toApi(body));
  }

  updateMyBusinessFiscalDetails(
    queryParameters: BusinessQuery,
    fiscalDetails: BusinessFiscalDetails,
  ): Observable<BaseResponse<unknown>> | never {
    return this.#putMyBusiness(queryParameters, this.#businessAdapter.toFiscalDetailsApi(fiscalDetails));
  }

  #putMyBusiness(queryParameters: BusinessQuery, business: UpdateBusinessDTO): Observable<BaseResponse<unknown>> | never {
    if (queryParameters.userId === undefined) {
      throw new Error('User ID is required');
    }
    const path = this.updateMyBusinessesUrl(queryParameters.organizationId, queryParameters.businessId, queryParameters.userId);

    return this.#httpClient.put<BaseResponse<unknown>>(path, business, { observe: 'response' }).pipe(
      map((response: HttpResponse<BaseResponse<unknown>>) => {
        if (response.status === 204) {
          return new BaseResponse({}, null);
        }
        let error = null;
        if (response.body?.error) {
          error = { code: response.body.error.code, message: 'errors.generic' };
        }
        return new BaseResponse(null, error);
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<string>(error)),
    );
  }

  #withMarketplaceExclusion(exclude: boolean | undefined, params: HttpParams = new HttpParams()): HttpParams {
    return exclude === true ? params.set('exclude_b2b_marketplace', 'true') : params;
  }

  private downloadBusinessesUrl(organizationId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/businesses-export`;
  }

  private getBusinessesUrl(organizationId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/businesses`;
  }

  private getBusinessUrl(organizationId: number, businessId: string): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/businesses/${businessId}`;
  }

  private getMyBusinessUrl(organizationId: number, businessId: string, userId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/users/${userId}/businesses/${businessId}`;
  }

  private updateBusinessesUrl(organizationId: number, businessId: string): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/businesses/${businessId}`;
  }

  private updateMyBusinessesUrl(organizationId: number, businessId: string, userId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/users/${userId}/businesses/${businessId}`;
  }

  private createBusinessesUrl(organizationId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/businesses`;
  }

  private getBusinessesDownloadParameters(parameters: BusinessesQuery): HttpParams {
    let params = new HttpParams();
    params = params.set('only_managers', parameters.onlyManagers !== undefined ? String(parameters.onlyManagers) : 'false');
    return params;
  }

  private getBusinessesParameters(parameters: BusinessesQuery): HttpParams {
    let params = new HttpParams();
    params = params.set('items_per_page', parameters.itemsPerPage ? parameters.itemsPerPage.toString() : 25);
    params = params.set('page', parameters.page ? parameters.page.toString() : 1);
    if (parameters.search) {
      params = params.set('search', parameters.search);
    }
    if (parameters.type) {
      params = params.set('business_type', parameters.type);
    }
    if (parameters.channelId) {
      params = params.set('channel_id', parameters.channelId);
    }
    return params;
  }
}

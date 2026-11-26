import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { SKIP_FORBIDDEN_TOAST } from '../../../../shared/interceptors/skip-forbidden-toast.token';
import { SKIP_RETRY_INTERCEPTOR } from '../../../../shared/interceptors/skip-retry.token';
import { BaseResponse, BaseResponseDTO } from '../../../../shared/models/base-response';
import { ErrorResponseUtils } from '../../../../shared/utils/error-response.utils';
import { BusinessPaymentSettings } from '../models/business-payment-settings.model';
import { BusinessPaymentTypeEnum } from '../models/business-payment-type.enum';
import { DistributorPaymentSettings, DistributorPaymentSettingsData } from '../models/distributor-payment-settings.model';
import {
  BusinessPaymentSettingsQuery,
  DistributorPartnerPaymentSettingsQuery,
  DistributorPaymentSettingsQuery,
  SetDistributorPaymentInstructionsQuery,
  SetDistributorPaymentSettingsQuery,
} from './business-payment-settings-query';
import { BusinessPaymentSettingsAdapter } from './business-payment-settings.adapter';
import { DistributorPaymentSettingsAdapter } from './distributor-payment-settings.adapter';

@Injectable({
  providedIn: 'root',
})
export class BusinessPaymentSettingsService {
  readonly #distributorPaymentSettingsAdapter = inject(DistributorPaymentSettingsAdapter);

  constructor(
    private httpClient: HttpClient,
    private businessPaymentSettingsAdapter: BusinessPaymentSettingsAdapter,
  ) {}

  /**
   * Reads the settings a partner holds with one of its business users, the legacy user-keyed read.
   *
   * A `403` reaches the user as the generic forbidden toast, which checkout and mark-as-paid rely
   * on: they report the refusal no other way. A caller whose screen stands on its own without the
   * settings asks for the toast to be skipped.
   */
  getBusinessPaymentSettings(
    queryParameters: BusinessPaymentSettingsQuery,
    { skipForbiddenToast = false }: { skipForbiddenToast?: boolean } = {},
  ): Observable<BaseResponse<BusinessPaymentSettings | null>> {
    const path = this.getBusinessPaymentSettingsUrl(queryParameters.partnerId, queryParameters.userId);

    return this.httpClient.get(path, { context: new HttpContext().set(SKIP_FORBIDDEN_TOAST, skipForbiddenToast) }).pipe(
      switchMap(result => {
        return of(this.businessPaymentSettingsAdapter.fromApi(result));
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<BusinessPaymentSettings>(error)),
    );
  }

  private getBusinessPaymentSettingsUrl(partnerId: number, businessUserId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/users/${businessUserId}/business-payment-settings`;
  }

  /**
   * Reads the settings the acting distributor holds with one partner, the header naming the actor.
   *
   * `data` is null when the pairing carries no settings row yet, which the caller reads as no
   * settled payment method rather than as a failure. A `403` means the concession is no longer
   * active; it is returned as an error for the caller to report, so the generic forbidden toast is
   * skipped.
   */
  getDistributorPartnerPaymentSettings(
    queryParameters: DistributorPartnerPaymentSettingsQuery,
  ): Observable<BaseResponse<DistributorPaymentSettings | null>> {
    const path = this.getDistributorPartnerPaymentSettingsUrl(queryParameters.partnerId);

    return this.httpClient
      .get<BaseResponseDTO<DistributorPaymentSettingsData | null>>(path, { context: new HttpContext().set(SKIP_FORBIDDEN_TOAST, true) })
      .pipe(
        map(result => this.#distributorPaymentSettingsAdapter.fromApi(result)),
        catchError(error => ErrorResponseUtils.getErrorResponse<DistributorPaymentSettings>(error)),
      );
  }

  private getDistributorPartnerPaymentSettingsUrl(partnerId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/payment-settings`;
  }

  /**
   * Reads the settings a partner holds with one distributor organization, the header naming the
   * actor. The mirror of `getDistributorPartnerPaymentSettings`, for the side that may also set them.
   *
   * `data` is null when the pairing carries no settings row yet. A `403` means the concession is no
   * longer active; it is returned as an error for the caller to decide what a refused read means on
   * its screen, so the generic forbidden toast is skipped.
   */
  getDistributorPaymentSettings(
    queryParameters: DistributorPaymentSettingsQuery,
  ): Observable<BaseResponse<DistributorPaymentSettings | null>> {
    const path = this.getDistributorPaymentSettingsUrl(queryParameters.distributorOrganizationId);

    return this.httpClient
      .get<BaseResponseDTO<DistributorPaymentSettingsData | null>>(path, { context: new HttpContext().set(SKIP_FORBIDDEN_TOAST, true) })
      .pipe(
        map(result => this.#distributorPaymentSettingsAdapter.fromApi(result)),
        catchError(error => ErrorResponseUtils.getErrorResponse<DistributorPaymentSettings>(error)),
      );
  }

  putDistributorPaymentInstructions(
    queryParameters: SetDistributorPaymentInstructionsQuery,
  ): Observable<BaseResponse<DistributorPaymentSettings | null>> {
    const path = this.getDistributorPaymentSettingsUrl(queryParameters.distributorOrganizationId);

    return this.httpClient
      .put<
        BaseResponseDTO<DistributorPaymentSettingsData | null>
      >(path, { payment_instructions: queryParameters.paymentInstructions }, { context: new HttpContext().set(SKIP_FORBIDDEN_TOAST, true).set(SKIP_RETRY_INTERCEPTOR, true) })
      .pipe(
        map(result => this.#distributorPaymentSettingsAdapter.fromApi(result)),
        catchError(error => ErrorResponseUtils.getErrorResponse<DistributorPaymentSettings>(error)),
      );
  }

  /**
   * Sets the settings a partner holds with one distributor organization, and answers them as they
   * stand after the call. A `403` is surfaced: reporting a refused write as success would drop the
   * partner's edit without telling anyone.
   */
  putDistributorPaymentSettings(
    queryParameters: SetDistributorPaymentSettingsQuery,
  ): Observable<BaseResponse<DistributorPaymentSettings | null>> {
    const path = this.getDistributorPaymentSettingsUrl(queryParameters.distributorOrganizationId);
    const body = this.getDistributorPaymentSettingsBody(queryParameters);

    return this.httpClient
      .put<BaseResponseDTO<DistributorPaymentSettingsData | null>>(path, body, {
        context: new HttpContext().set(SKIP_FORBIDDEN_TOAST, true).set(SKIP_RETRY_INTERCEPTOR, true),
      })
      .pipe(
        map(result => this.#distributorPaymentSettingsAdapter.fromApi(result)),
        catchError(error => ErrorResponseUtils.getErrorResponse<DistributorPaymentSettings>(error)),
      );
  }

  private getDistributorPaymentSettingsUrl(distributorOrganizationId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/distributors/${distributorOrganizationId}/payment-settings`;
  }

  private getDistributorPaymentSettingsBody(queryParameters: SetDistributorPaymentSettingsQuery): Record<string, string> {
    const body: Record<string, string> = { payment_type: queryParameters.paymentType };

    if (queryParameters.paymentType === BusinessPaymentTypeEnum.INVOICING && queryParameters.invoicingPeriod != null) {
      body.invoicing_period = queryParameters.invoicingPeriod;
    }

    if (queryParameters.paymentInstructions !== undefined) {
      body.payment_instructions = queryParameters.paymentInstructions;
    }

    return body;
  }

  updateBusinessPaymentSettings(queryParameters: BusinessPaymentSettingsQuery): Observable<BaseResponse<any>> {
    const path = this.getUpdateBusinessPaymentSettingsUrl(queryParameters);
    const body = this.getUpdateBusinessPaymentSettingsBody(queryParameters);

    return this.httpClient.put(path, body, { observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 204) {
          return new BaseResponse({}, null);
        }
        let error = null;
        if (response.body.error) {
          error = { code: response.body.error.code, message: 'errors.generic' };
        }
        return new BaseResponse(null, error);
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<any>(error)),
    );
  }

  private getUpdateBusinessPaymentSettingsUrl(queryParameters: BusinessPaymentSettingsQuery): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${queryParameters.partnerId}/users/${queryParameters.userId}/business-payment-settings`;
  }

  private getUpdateBusinessPaymentSettingsBody(queryParameters: BusinessPaymentSettingsQuery): Partial<Record<string, string>> {
    return {
      payment_type: queryParameters.paymentType,
      invoicing_period: queryParameters.paymentType == BusinessPaymentTypeEnum.INVOICING ? queryParameters.invoicingPeriod : undefined,
      currency: queryParameters.paymentType == BusinessPaymentTypeEnum.BALANCE ? queryParameters.currency : undefined,
    };
  }
}

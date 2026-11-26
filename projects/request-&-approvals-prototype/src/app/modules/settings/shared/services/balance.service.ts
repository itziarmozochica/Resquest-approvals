import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { identity, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { SKIP_FORBIDDEN_TOAST } from '../../../../shared/interceptors/skip-forbidden-toast.token';
import { BaseResponse, BaseResponseDTO } from '../../../../shared/models/base-response';
import { ErrorResponseUtils } from '../../../../shared/utils/error-response.utils';
import { retryWithBackoff, RetryWithBackoffConfig } from '../../../../shared/utils/retry-with-backoff.util';
import { Balance } from '../models/balance.model';
import { DistributorBalancesDto } from '../models/distributor-balance.dto';
import { DistributorBalances } from '../models/distributor-balance.model';
import { isBusinessNotFound } from '../utils/business-not-found.util';
import { BalanceQuery, DistributorBalanceQuery, DistributorBalancesQuery, SetDistributorBalanceQuery } from './balance-query';
import { BalanceAdapter } from './balance.adapter';
import { DistributorBalancesAdapter } from './distributor-balances.adapter';

const BUSINESS_NOT_FOUND_RETRY: RetryWithBackoffConfig = {
  initialDelayMs: 500,
  maxTotalDelayMs: 16_000,
  shouldRetry: isBusinessNotFound,
};

@Injectable({
  providedIn: 'root',
})
export class BalanceService {
  constructor(
    private httpClient: HttpClient,
    private balanceAdapter: BalanceAdapter,
    private distributorBalancesAdapter: DistributorBalancesAdapter,
  ) {}

  getBalance(queryParameters: BalanceQuery): Observable<BaseResponse<Balance | null>> {
    const path = this.getBalanceUrl(queryParameters);

    return this.httpClient.get<BaseResponse<Balance | null>>(path, { observe: 'response' }).pipe(
      map(result => {
        if (result.body) {
          return this.balanceAdapter.fromApi(result.body);
        }
        return new BaseResponse<Balance>(null, null);
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<Balance>(error)),
    );
  }

  /**
   * Reads the balance a distributor holds with the acting partner, which the path does not name.
   *
   * A revoked or absent concession answers 403 where the booking-agent reads answered
   * `200 {data: null}`; it is normalised back to an absent balance so the form keeps opening.
   */
  getDistributorBalance(queryParameters: DistributorBalanceQuery): Observable<BaseResponse<Balance | null>> {
    const path = this.getDistributorBalanceUrl(queryParameters);

    return this.httpClient
      .get<BaseResponse<Balance | null>>(path, { observe: 'response', context: new HttpContext().set(SKIP_FORBIDDEN_TOAST, true) })
      .pipe(
        map(result => {
          if (result.body) {
            return this.balanceAdapter.fromApi(result.body);
          }
          return new BaseResponse<Balance>(null, null);
        }),
        catchError(error => {
          if (error?.status === 403) {
            return of(new BaseResponse<Balance>(null, null));
          }
          return ErrorResponseUtils.getErrorResponse<Balance>(error);
        }),
      );
  }

  getDistributorBalances(queryParameters: DistributorBalancesQuery): Observable<BaseResponse<DistributorBalances | null>> {
    const params = {
      items_per_page: queryParameters.itemsPerPage,
      page: queryParameters.page,
    };

    return this.httpClient.get<BaseResponseDTO<DistributorBalancesDto>>(this.getDistributorBalancesUrl(), { params }).pipe(
      map(response => this.distributorBalancesAdapter.fromApi(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<DistributorBalances>(error)),
    );
  }

  /**
   * Sets the balance a distributor holds with the acting partner, which the path does not name.
   *
   * A set rather than an increment: the body states what the balance should become, so re-sending a
   * value it already holds records nothing and the call is safe to retry. It replaces the
   * booking-agent deposit, which answered `204` with no body where this answers the balance as it
   * stands after the call.
   *
   * A `403` is left to surface here, unlike on the read that normalises it to an absent balance: a
   * refused write is a real authorization failure, and reporting it as success would drop the
   * partner's edit without telling anyone.
   */
  putDistributorBalance(
    queryParameters: SetDistributorBalanceQuery,
    retryConfig: RetryWithBackoffConfig | null = null,
  ): Observable<BaseResponse<Balance | null>> {
    const path = this.getDistributorBalanceUrl(queryParameters);
    const body = {
      amount: queryParameters.amount,
      currency: queryParameters.currency,
    };

    return this.httpClient
      .put<BaseResponse<Balance | null>>(path, body, {
        context: new HttpContext().set(SKIP_FORBIDDEN_TOAST, true),
        observe: 'response',
      })
      .pipe(
        map(result => this.balanceAdapter.fromApi(result.body)),
        retryConfig === null ? identity : retryWithBackoff(retryConfig),
        catchError(error => ErrorResponseUtils.getErrorResponse<Balance>(error)),
      );
  }

  private getBalanceUrl(queryParameters: BalanceQuery): string {
    if (queryParameters.userId === null) {
      return `${environment.apiGWBaseUrl}/1.0/partners/${queryParameters.partnerId}/booking-agents/${queryParameters.businessId}/balance`;
    }
    return `${environment.apiGWBaseUrl}/1.0/partners/${queryParameters.partnerId}/users/${queryParameters.userId}/booking-agents/${queryParameters.businessId}/balance`;
  }

  private getDistributorBalanceUrl(queryParameters: DistributorBalanceQuery): string {
    return `${environment.apiGWBaseUrl}/1.0/distributors/${queryParameters.distributorOrganizationId}/balance`;
  }

  private getDistributorBalancesUrl(): string {
    return `${environment.apiGWBaseUrl}/1.0/balances`;
  }

  postBalanceDeposit(queryParameters: BalanceQuery): Observable<BaseResponse<any>> {
    const path = this.getPostBalanceDepositUrl(queryParameters);
    const body = this.getPostBalanceDepositBody(queryParameters);

    return this.httpClient.post(path, body, { observe: 'response' }).pipe(
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
      retryWithBackoff(BUSINESS_NOT_FOUND_RETRY),
      catchError(error => ErrorResponseUtils.getErrorResponse<any>(error)),
    );
  }

  private getPostBalanceDepositUrl(queryParameters: BalanceQuery): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${queryParameters.partnerId}/booking-agents/${queryParameters.businessId}/balance`;
  }

  private getPostBalanceDepositBody(queryParameters: BalanceQuery): any {
    return {
      amount: queryParameters.amount,
      currency: queryParameters.currency,
    };
  }
}

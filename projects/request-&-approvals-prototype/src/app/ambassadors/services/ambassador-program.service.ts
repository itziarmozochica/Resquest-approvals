import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { AmbassadorRedeemedPointsData } from '@fz-original/app/ambassadors/models/ambassador-redeemed-points.model';
import { TableOrderBy } from '@fz-original/app/shared/components/table/model/table-order-by';
import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';
import { LinkPaginationResponse } from '@fz-original/app/shared/models/link-pagination-response';
import { PlanData, PlansData } from '@fz-original/app/shared/models/plan/plan.model';
import { GetPlansQuery } from '@fz-original/app/shared/services/plan/get-plans-query';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { forkJoin, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { AmbassadorProgramRewardAdapter } from '../adapters/ambassador-program-reward.adapter';
import { AmbassadorProgramSummaryAdapter } from '../adapters/ambassador-program-summary.adapter';
import { AmbassadorProgramAdapter } from '../adapters/ambassador-program.adapter';
import {
  AmbassadorProgramRedeemedRewardResponse,
  AmbassadorProgramReward,
  AmbassadorProgramRewardData,
  AmbassadorProgramRewardResponse,
} from '../models/ambassador-program-reward.model';
import { AmbassadorProgramsSummaryData, AmbassadorProgramSummary } from '../models/ambassador-program-summary.model';
import { AmbassadorProgram, AmbassadorProgramData, AmbassadorProgramsData } from '../models/ambassador-program.model';

@Injectable({
  providedIn: 'root',
})
export class AmbassadorProgramService {
  #ambassadorProgramAdapter = inject(AmbassadorProgramAdapter);
  #ambassadorProgramRewardAdapter = inject(AmbassadorProgramRewardAdapter);
  #ambassadorProgramSummaryAdapter = inject(AmbassadorProgramSummaryAdapter);
  #httpClient = inject(HttpClient);

  getAmbassadorProgramRewardsPaginated(
    partnerId: number,
    ambassadorProgramId: string,
    sortParams: TableOrderBy[],
    nextPageParam = 'items_per_page=25&page=1',
  ): Observable<LinkPaginationResponse<AmbassadorProgramReward[] | null> | null> {
    let path = `${this.#getAmbassadorProgramRewardsUrl(partnerId, ambassadorProgramId)}`;

    if (nextPageParam) {
      path = `${path}?${nextPageParam}`;
    }

    const params = this.#getSortingParams(sortParams);

    return this.#httpClient.get<BaseResponse<AmbassadorProgramRewardResponse>>(path, { observe: 'response', params }).pipe(
      map((result: HttpResponse<BaseResponse<AmbassadorProgramRewardResponse>>) => {
        return this.#ambassadorProgramRewardAdapter.fromApi(result);
      }),
      catchError(error => ErrorResponseUtils.getErrorForPaginatedResponse<AmbassadorProgramReward>(error)),
    );
  }

  getAmbassadorProgramsPaginated(
    partnerId: number,
    parameters: GetPlansQuery,
    nextPageParam = 'items_per_page=25&page=1',
  ): Observable<LinkPaginationResponse<(AmbassadorProgram | null)[] | null>> {
    let path = `${this.#getAmbassadorProgramsUrl(partnerId)}`;

    if (nextPageParam) {
      path = `${path}?${nextPageParam}`;
    }

    const params = this.#buildGetPlanParams(parameters);

    return this.#httpClient.get<BaseResponse<AmbassadorProgramsData>>(path, { observe: 'response', params }).pipe(
      switchMap((ambassadorProgramResponse: HttpResponse<BaseResponse<AmbassadorProgramsData>>) => {
        const programs = ambassadorProgramResponse.body?.data?.ambassador_programs;

        if (!programs || programs.length === 0) {
          return of(
            new LinkPaginationResponse<AmbassadorProgram[]>(
              ambassadorProgramResponse.headers.get('Link'),
              [],
              ambassadorProgramResponse.body?.error as BaseErrorResponse,
            ),
          );
        }

        const ambassadorPrograms = programs?.map((program: AmbassadorProgramData) => {
          const plansPath = `${this.#getPlansUrl(partnerId)}?plan_id=${program.plans[0]}`;
          return this.#httpClient.get<BaseResponse<PlansData>>(plansPath, { observe: 'response' }).pipe(
            switchMap((result: HttpResponse<BaseResponse<PlansData>>) => {
              const plan = result.body?.data?.plans[0];

              return of(this.#ambassadorProgramAdapter.fromApi({ plan, ambassadorProgram: program }));
            }),
          );
        });

        return forkJoin(ambassadorPrograms).pipe(
          map((ambassadorPrograms: (AmbassadorProgram | null)[]) => {
            return new LinkPaginationResponse<(AmbassadorProgram | null)[]>(
              ambassadorProgramResponse.headers.get('Link'),
              ambassadorPrograms,
              ambassadorProgramResponse.body?.error as BaseErrorResponse,
            );
          }),
        );
      }),
      catchError(error => ErrorResponseUtils.getErrorForPaginatedResponse<AmbassadorProgram>(error)),
    );
  }

  getPartnerAmbassadorProgramByPlanId(partnerId: number, planId: string): Observable<BaseResponse<AmbassadorProgram | null>> {
    const path = `${this.#getPlanUrl(partnerId, planId)}`;

    return this.#httpClient.get<BaseResponse<PlanData>>(path, { observe: 'response' }).pipe(
      switchMap((planResponse: HttpResponse<BaseResponse<PlanData>>) => {
        if (planResponse.body?.error || !planResponse.body?.data) {
          return of(new BaseResponse<AmbassadorProgram>(null, planResponse.body?.error as BaseErrorResponse));
        }

        const ambassadorProgramsPath = `${this.#getPartnerAmbassadorProgramsUrl(partnerId)}?plan_id=${planId}`;

        return this.#httpClient.get<BaseResponse<AmbassadorProgramsData>>(ambassadorProgramsPath, { observe: 'response' }).pipe(
          switchMap((ambassadorProgramResponse: HttpResponse<BaseResponse<AmbassadorProgramsData>>) => {
            if (ambassadorProgramResponse.body?.error || !ambassadorProgramResponse.body?.data) {
              return of(new BaseResponse<AmbassadorProgram>(null, ambassadorProgramResponse.body?.error as BaseErrorResponse));
            }

            const ambassadorProgram = ambassadorProgramResponse.body?.data?.ambassador_programs[0];

            return of(
              new BaseResponse<AmbassadorProgram>(
                this.#ambassadorProgramAdapter.fromApi({ plan: planResponse.body?.data, ambassadorProgram }),
                ambassadorProgramResponse.body?.error as BaseErrorResponse,
              ),
            );
          }),
        );
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<AmbassadorProgram>(error)),
    );
  }

  getPartnerAmbassadorProgramRedeemedRewardsPaginated({
    partnerId,
    ambassadorProgramId,
    searchTerm,
    nextPageParam = 'items_per_page=25&page=1',
    redeemId,
  }: {
    ambassadorProgramId: string;
    nextPageParam?: string;
    partnerId: number;
    redeemId?: string;
    searchTerm?: string;
  }): Observable<LinkPaginationResponse<AmbassadorProgramReward[] | null> | null> {
    let path = `${this.#getPartnerAmbassadorProgramRedeemedRewardsUrl(partnerId, ambassadorProgramId)}`;

    path = `${path}?${nextPageParam}`;

    if (searchTerm) {
      path = `${path}&search_filter=${searchTerm}`;
    }

    if (redeemId) {
      path = `${path}&redeem_id=${redeemId}`;
    }

    return this.#httpClient.get<BaseResponse<AmbassadorProgramRedeemedRewardResponse>>(path, { observe: 'response' }).pipe(
      map((result: HttpResponse<BaseResponse<AmbassadorProgramRedeemedRewardResponse>>) => {
        return this.#ambassadorProgramRewardAdapter.fromApiRedeemed(result);
      }),
      catchError(error => ErrorResponseUtils.getErrorForPaginatedResponse<AmbassadorProgramReward>(error)),
    );
  }

  getPartnerAmbassadorProgramRedeemedRewardTransaction(
    partnerId: number,
    ambassadorProgramId: string,
    transactionId: string,
  ): Observable<BaseResponse<AmbassadorProgramReward | null>> {
    const path = `${this.#getPartnerAmbassadorProgramRedeemedRewardTransactionUrl(partnerId, ambassadorProgramId, transactionId)}`;

    return this.#httpClient.get<BaseResponse<AmbassadorProgramRewardData>>(path, { observe: 'response' }).pipe(
      map((result: HttpResponse<BaseResponse<AmbassadorProgramRewardData | null>>) => {
        return this.#ambassadorProgramRewardAdapter.fromApiSingle(result);
      }),
      catchError(error => {
        return of(new BaseResponse<AmbassadorProgramReward | null>(null, error));
      }),
    );
  }

  getPartnerAmbassadorProgramRewardsPaginated({
    partnerId,
    ambassadorProgramId,
    nextPageParam = 'items_per_page=25&page=1',
  }: {
    ambassadorProgramId: string;
    nextPageParam?: string;
    partnerId: number;
  }): Observable<LinkPaginationResponse<AmbassadorProgramReward[] | null> | null> {
    let path = `${this.#getPartnerAmbassadorProgramRewardsUrl(partnerId, ambassadorProgramId)}`;

    path = `${path}?${nextPageParam}`;

    return this.#httpClient.get<BaseResponse<AmbassadorProgramRewardResponse>>(path, { observe: 'response' }).pipe(
      map((result: HttpResponse<BaseResponse<AmbassadorProgramRewardResponse>>) => {
        return this.#ambassadorProgramRewardAdapter.fromApi(result);
      }),
      catchError(error => ErrorResponseUtils.getErrorForPaginatedResponse<AmbassadorProgramReward>(error)),
    );
  }

  getPublicProgram(programId: string): Observable<AmbassadorProgram> {
    const path = `${environment.apiGWBaseUrl}/1.0/ambassador-programs/${programId}`;

    return this.#httpClient.get<BaseResponse<AmbassadorProgramData>>(path).pipe(
      map((response: BaseResponse<AmbassadorProgramData>) => {
        if (!response.data) {
          throw new Error('No program data found');
        }
        const result = this.#ambassadorProgramAdapter.fromApi({ ambassadorProgram: response.data });
        if (result === null) {
          throw new Error('Failed to process program data');
        }
        return result;
      }),
      catchError(error => throwError(() => error)),
    );
  }

  getResellerAmbassadorProgramByPlanId(
    resellerId: number,
    planId: string,
    affiliateCode: string,
    channelId: string,
  ): Observable<BaseResponse<AmbassadorProgram | null>> {
    const path = `${this.#getResellerPlansUrlByPlanId(resellerId, planId)}`;
    let params = new HttpParams();
    params = params.set('channel_id', channelId);

    return this.#httpClient.get<BaseResponse<PlanData>>(path, { observe: 'response', params }).pipe(
      switchMap((planResponse: HttpResponse<BaseResponse<PlanData>>) => {
        if (planResponse.body?.error || !planResponse.body?.data) {
          return of(new BaseResponse<AmbassadorProgram>(null, planResponse.body?.error as BaseErrorResponse));
        }

        const ambassadorProgramsPath = `${this.#getResellerAmbassadorProgramsUrl(resellerId)}?plan_id=${planId}`;

        return this.#httpClient.get<BaseResponse<AmbassadorProgramsData>>(ambassadorProgramsPath, { observe: 'response' }).pipe(
          switchMap((ambassadorProgramResponse: HttpResponse<BaseResponse<AmbassadorProgramsData>>) => {
            if (ambassadorProgramResponse.body?.error || !ambassadorProgramResponse.body?.data) {
              return of(new BaseResponse<AmbassadorProgram>(null, ambassadorProgramResponse.body?.error as BaseErrorResponse));
            }

            const ambassadorProgram = ambassadorProgramResponse.body?.data?.ambassador_programs[0];

            const redeemedPointsPath = `${this.#getResellerRedeemedPointsUrl(resellerId, ambassadorProgram.id, affiliateCode)}`;

            return this.#httpClient.get<BaseResponse<AmbassadorRedeemedPointsData>>(redeemedPointsPath, { observe: 'response' }).pipe(
              switchMap((redeemedPointsResponse: HttpResponse<BaseResponse<AmbassadorRedeemedPointsData>>) => {
                const redeemedPoints = redeemedPointsResponse.body?.data;
                return of(
                  new BaseResponse<AmbassadorProgram>(
                    this.#ambassadorProgramAdapter.fromApi({ plan: planResponse.body?.data, ambassadorProgram, redeemedPoints }),
                    redeemedPointsResponse.body?.error as BaseErrorResponse,
                  ),
                );
              }),
            );
          }),
        );
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<AmbassadorProgram>(error)),
    );
  }

  getResellerAmbassadorProgramRedeemedRewardDetail(
    resellerId: number,
    ambassadorProgramId: string,
    redemptionId: string,
  ): Observable<BaseResponse<AmbassadorProgramReward | null>> {
    const path = `${this.#getResellerAmbassadorProgramRedeemedRewardTransactionUrl(resellerId, ambassadorProgramId, redemptionId)}`;

    return this.#httpClient.get<BaseResponse<AmbassadorProgramRewardData>>(path, { observe: 'response' }).pipe(
      map((result: HttpResponse<BaseResponse<AmbassadorProgramRewardData>>) => {
        return this.#ambassadorProgramRewardAdapter.fromApiSingle(result);
      }),
      catchError(error => {
        return of(new BaseResponse<AmbassadorProgramReward | null>(null, error));
      }),
    );
  }

  getResellerAmbassadorProgramRedeemedRewardsPaginated(
    resellerId: number,
    ambassadorProgramId: string,
    sortParams: TableOrderBy[] | null,
    nextPageParam = 'items_per_page=25&page=1',
  ): Observable<LinkPaginationResponse<AmbassadorProgramReward[] | null> | null> {
    let path = `${this.#getResellerAmbassadorProgramRedeemedRewardsUrl(resellerId, ambassadorProgramId)}`;

    if (nextPageParam) {
      path = `${path}?${nextPageParam}`;
    }

    const params = this.#getSortingParams(sortParams);

    return this.#httpClient.get<BaseResponse<AmbassadorProgramRedeemedRewardResponse>>(path, { observe: 'response', params }).pipe(
      map((result: HttpResponse<BaseResponse<AmbassadorProgramRedeemedRewardResponse>>) => {
        return this.#ambassadorProgramRewardAdapter.fromApiRedeemed(result);
      }),
      catchError(error => ErrorResponseUtils.getErrorForPaginatedResponse<AmbassadorProgramReward>(error)),
    );
  }

  getResellerAmbassadorProgramRewardsPaginated(
    resellerId: number,
    ambassadorProgramId: string,
    sortParams?: TableOrderBy[] | null,
    maxPoints?: number,
    nextPageParam = 'items_per_page=25&page=1',
  ): Observable<LinkPaginationResponse<AmbassadorProgramReward[] | null> | null> {
    let path = `${this.#getResellerAmbassadorProgramRewardsUrl(resellerId, ambassadorProgramId)}`;

    if (nextPageParam) {
      path = `${path}?${nextPageParam}`;
    }

    if (maxPoints != undefined) {
      path = `${path}&max_points=${maxPoints}`;
    }

    const params = this.#getSortingParams(sortParams);

    return this.#httpClient.get<BaseResponse<AmbassadorProgramRewardResponse>>(path, { observe: 'response', params }).pipe(
      map((result: HttpResponse<BaseResponse<AmbassadorProgramRewardResponse>>) => {
        return this.#ambassadorProgramRewardAdapter.fromApi(result);
      }),
      catchError(error => ErrorResponseUtils.getErrorForPaginatedResponse<AmbassadorProgramReward>(error)),
    );
  }

  getResellerAmbassadorProgramsPaginated(
    resellerId: number,
    affiliateCode: string,
    parameters: GetPlansQuery,
    nextPageParam = 'items_per_page=25&page=1',
  ): Observable<LinkPaginationResponse<(AmbassadorProgram | null)[] | null>> {
    let path = `${this.#getResellerPlansUrl(resellerId)}`;

    if (nextPageParam) {
      path = `${path}?${nextPageParam}`;
    }

    const params = this.#buildGetPlanParams(parameters);

    return this.#httpClient.get<BaseResponse<PlansData>>(path, { observe: 'response', params }).pipe(
      switchMap((resultPlans: HttpResponse<BaseResponse<PlansData>>) => {
        const plans = resultPlans.body?.data?.plans;

        if (!plans || plans.length === 0) {
          return of(
            new LinkPaginationResponse<AmbassadorProgram[]>(
              resultPlans.headers.get('Link'),
              [],
              resultPlans.body?.error as BaseErrorResponse,
            ),
          );
        }

        const ambassadorPrograms = plans?.map((plan: PlanData) => {
          let ambassadorProgramsPath = `${this.#getResellerAmbassadorProgramsUrl(resellerId)}?plan_id=${plan.id}`;

          if (nextPageParam) {
            ambassadorProgramsPath = `${ambassadorProgramsPath}&${nextPageParam}`;
          }

          return this.#httpClient.get<BaseResponse<AmbassadorProgramsData>>(ambassadorProgramsPath, { observe: 'response' }).pipe(
            switchMap((ambassadorProgramResponse: HttpResponse<BaseResponse<AmbassadorProgramsData>>) => {
              if (ambassadorProgramResponse.body?.error || !ambassadorProgramResponse.body?.data) {
                return of(null);
              }

              const ambassadorProgram = ambassadorProgramResponse.body?.data?.ambassador_programs?.[0];

              const redeemedPointsPath = `${this.#getResellerRedeemedPointsUrl(resellerId, ambassadorProgram.id, affiliateCode)}`;
              return this.#httpClient.get<BaseResponse<AmbassadorRedeemedPointsData>>(redeemedPointsPath, { observe: 'response' }).pipe(
                switchMap((redeemedPointsResponse: HttpResponse<BaseResponse<AmbassadorRedeemedPointsData>>) => {
                  const redeemedPoints = redeemedPointsResponse.body?.data;
                  return of(this.#ambassadorProgramAdapter.fromApi({ plan, ambassadorProgram, redeemedPoints }));
                }),
              );
            }),
          );
        });

        return forkJoin(ambassadorPrograms).pipe(
          map((ambassadorPrograms: (AmbassadorProgram | null)[]) => {
            return new LinkPaginationResponse<(AmbassadorProgram | null)[]>(
              resultPlans.headers.get('Link'),
              ambassadorPrograms,
              resultPlans.body?.error as BaseErrorResponse,
            );
          }),
        );
      }),
      catchError(error => ErrorResponseUtils.getErrorForPaginatedResponse<AmbassadorProgram>(error)),
    );
  }

  getResellerAmbassadorProgramsSummaryPaginated(
    resellerId: number,
    nextPageParam = 'items_per_page=25&page=1',
    title?: string,
  ): Observable<LinkPaginationResponse<(AmbassadorProgramSummary | null)[] | null>> {
    let path = `${this.#getResellerAmbassadorProgramsSummaryUrl(resellerId)}`;

    const queryParams = new URLSearchParams();

    if (nextPageParam) {
      queryParams.append('items_per_page', nextPageParam.split('&')[0].split('=')[1]);
      queryParams.append('page', nextPageParam.split('&')[1].split('=')[1]);
    }

    if (title && title.trim()) {
      queryParams.append('title', title.trim());
    }

    if (queryParams.toString()) {
      path = `${path}?${queryParams.toString()}`;
    }

    return this.#httpClient.get<BaseResponse<AmbassadorProgramsSummaryData>>(path, { observe: 'response' }).pipe(
      map((result: HttpResponse<BaseResponse<AmbassadorProgramsSummaryData>>) => {
        return this.#ambassadorProgramSummaryAdapter.fromApiPaginated(result);
      }),
      catchError(error => ErrorResponseUtils.getErrorForPaginatedResponse<AmbassadorProgramSummary>(error)),
    );
  }

  redeemReward(
    resellerId: number,
    userId: number,
    ambassadorProgramId: string,
    affiliateCode: string,
    rewardId: string,
  ): Observable<BaseResponse<AmbassadorProgramReward | null>> {
    const path = `${this.#getResellerRedeemPointsUrl(resellerId, userId, ambassadorProgramId, affiliateCode, rewardId)}`;
    return this.#httpClient.post<BaseResponse<AmbassadorProgramRewardData>>(path, null, { observe: 'response' }).pipe(
      map((result: HttpResponse<BaseResponse<AmbassadorProgramRewardData>>) => {
        return this.#ambassadorProgramRewardAdapter.fromApiSingle(result);
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<AmbassadorProgramReward>(error)),
    );
  }

  #buildGetPlanParams(parameters: GetPlansQuery): HttpParams {
    let params = new HttpParams();

    if (parameters.status) {
      params = params.append('status', parameters.status);
    }

    if (parameters.kind) {
      params = params.append('kind', parameters.kind);
    }

    if (parameters.name) {
      params = params.append('name', parameters.name);
    }

    if (parameters.cityId) {
      params = params.append('city_id', parameters.cityId);
    }

    if (parameters.planId) {
      params = params.append('plan_id', parameters.planId);
    }

    if (parameters.placeId) {
      params = params.append('place_id', parameters.placeId);
    }

    if (parameters.channelId) {
      params = params.append('channel_id', parameters.channelId);
    }

    if (parameters.orderBy) {
      const sortingParams = this.#getSortingParams(parameters.orderBy);
      params = params.append('order_by', sortingParams.get('order_by') || '');
    }

    return params;
  }

  #getAmbassadorProgramRewardsUrl(partnerId: number, ambassadorProgramId: string): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/ambassador-programs/${ambassadorProgramId}/rewards`;
  }

  #getAmbassadorProgramsUrl(partnerId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/ambassador-programs`;
  }

  #getPartnerAmbassadorProgramRedeemedRewardsUrl(partnerId: number, ambassadorProgramId: string): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/ambassador-programs/${ambassadorProgramId}/redeemed-rewards`;
  }

  #getPartnerAmbassadorProgramRedeemedRewardTransactionUrl(partnerId: number, ambassadorProgramId: string, transactionId: string): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/ambassador-programs/${ambassadorProgramId}/redeemed-rewards/${transactionId}`;
  }

  #getPartnerAmbassadorProgramRewardsUrl(partnerId: number, ambassadorProgramId: string): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/ambassador-programs/${ambassadorProgramId}/rewards`;
  }

  #getPartnerAmbassadorProgramsUrl(partnerId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/ambassador-programs`;
  }

  #getPlansUrl(partnerID: number) {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerID}/plans-with-analytics`;
  }

  #getPlanUrl(partnerID: number, planID: string) {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerID}/plans/${planID}`;
  }

  #getResellerAmbassadorProgramRedeemedRewardsUrl(resellerId: number, ambassadorProgramId: string): string {
    return `${environment.apiGWBaseUrl}/1.0/resellers/${resellerId}/ambassador-programs/${ambassadorProgramId}/redeemed-rewards`;
  }

  #getResellerAmbassadorProgramRedeemedRewardTransactionUrl(resellerId: number, ambassadorProgramId: string, redemptionId: string): string {
    return `${environment.apiGWBaseUrl}/1.0/resellers/${resellerId}/ambassador-programs/${ambassadorProgramId}/redeemed-rewards/${redemptionId}`;
  }

  #getResellerAmbassadorProgramRewardsUrl(resellerId: number, ambassadorProgramId: string): string {
    return `${environment.apiGWBaseUrl}/1.0/resellers/${resellerId}/ambassador-programs/${ambassadorProgramId}/rewards`;
  }

  #getResellerAmbassadorProgramsSummaryUrl(resellerId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/resellers/${resellerId}/ambassador-programs-summary`;
  }

  #getResellerAmbassadorProgramsUrl(resellerId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/resellers/${resellerId}/ambassador-programs`;
  }

  #getResellerPlansUrl(resellerID: number) {
    return `${environment.apiGWBaseUrl}/1.0/resellers/${resellerID}/plans`;
  }

  #getResellerPlansUrlByPlanId(resellerID: number, planId: string) {
    return `${environment.apiGWBaseUrl}/1.0/resellers/${resellerID}/plans/${planId}`;
  }

  #getResellerRedeemedPointsUrl(resellerId: number, ambassadorProgramId: string, affiliateCode: string): string {
    return `${environment.apiGWBaseUrl}/1.0/resellers/${resellerId}/ambassador-programs/${ambassadorProgramId}/ambassadors/affiliate-code/${affiliateCode}/points`;
  }

  #getResellerRedeemPointsUrl(
    resellerId: number,
    userId: number,
    ambassadorProgramId: string,
    affiliateCode: string,
    rewardId: string,
  ): string {
    return `${environment.apiGWBaseUrl}/1.0/resellers/${resellerId}/users/${userId}/ambassador-programs/${ambassadorProgramId}/ambassadors/affiliate-code/${affiliateCode}/rewards/${rewardId}/redeem`;
  }

  #getSortingParams(parameters?: TableOrderBy[] | null): HttpParams {
    let params = new HttpParams();

    if (parameters && parameters.length > 0) {
      let orderBy = '';
      parameters.forEach(
        (orderField, index) => (orderBy += `${orderField.field}.${orderField.direction}` + (parameters.length - 1 > index ? ',' : '')),
      );
      params = params.append('order_by', orderBy);
    }

    return params;
  }
}

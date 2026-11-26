/* eslint-disable @typescript-eslint/naming-convention */
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import type { DistributorTarget } from '@fz/reservations';
import { EMPTY, from, Observable, of, throwError } from 'rxjs';
import { catchError, expand, map, mergeMap, switchMap, tap, toArray } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { TableOrderBy } from '../../components/table/model/table-order-by';
import { BaseErrorResponse, BaseResponse, IBaseResponse } from '../../models/base-response';
import { PublishChannelBodyDTO, PublishChannelDTO } from '../../models/channel/publish-channel.model';
import { LinkPaginationResponse } from '../../models/link-pagination-response';
import {
  FlexibleBundleSessions,
  FlexibleBundleSessionsDTO,
  FlexibleBundleSessionsQuery,
} from '../../models/plan/flexible-bundle-sessions.model';
import {
  Plan,
  PlanData,
  PlanDetailPublic,
  PlanDetailPublicResponse,
  PlanLiveStatusAndAnalytics,
  PlanLiveStatusAndAnalyticsDTO,
  PlansData,
} from '../../models/plan/plan.model';
import { User } from '../../models/user/user.model';
import { FeatureFlags } from '../../optimizely/feature-flags';
import { OptimizelyService } from '../../optimizely/optimizely.service';
import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { DistributorRouteService, scopedOrganizationHeader, scopedOrganizationHeaderFor } from '../distributor/distributor-route.service';
import { OnBehalfTargetService } from '../distributor/on-behalf-target.service';
import { PartnerService } from '../partner/partner.service';
import { UserService } from '../user/user.service';
import { FlexibleBundleSessionsAdapter } from './flexible-bundle-sessions.adapter';
import { GetPlansQuery } from './get-plans-query';
import { PlanDetailPublicAdapter } from './plan-detail-public.adapter';
import { PlanLiveStatusAndAnalyticsAdapter } from './plan-live-status-analytics.adapter';
import { PlanAdapter } from './plan.adapter';
import { PlansWithAnalyticsAdapter } from './plans-with-analytics.adapter';
import { PlansAdapter } from './plans.adapter';

interface GetPlansParams {
  channelId?: string;
  // Adds each place's city country (ISO 3166 alpha-2), which only the v3 listing returns.
  includeCountryIsoCode?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PlanService {
  static readonly channelVisibilityEditable: string[] = ['fever-marketplace'];
  static readonly plansItemsPerPage = 3000;
  static readonly plansFetchConcurrency = 2;
  static readonly incompletePlansPageErrorCode = 'INCOMPLETE_PLANS_PAGE';
  #distributorRoute = inject(DistributorRouteService);
  readonly #flexibleBundleSessionsAdapter = inject(FlexibleBundleSessionsAdapter);
  #onBehalfTarget = inject(OnBehalfTargetService);
  #httpClient = inject(HttpClient);
  #optimizelyService = inject(OptimizelyService);
  #partnerService = inject(PartnerService);
  #planAdapter = inject(PlanAdapter);
  #planDetailPublic = inject(PlanDetailPublicAdapter);
  #planDetails: Map<number, Map<string, BaseResponse<Plan>>> = new Map();
  #planLiveStatusAndAnalyticsAdapter: PlanLiveStatusAndAnalyticsAdapter = inject(PlanLiveStatusAndAnalyticsAdapter);
  #plansAdapter = inject(PlansAdapter);
  #plansCache: Map<string, BaseResponse<Plan[]>> = new Map();
  #plansWithAnalyticsAdapter = inject(PlansWithAnalyticsAdapter);
  #userService = inject(UserService);

  clearPlansCache(): void {
    this.#plansCache.clear();
    this.#planDetails.clear();
  }

  invalidatePlanDetail(planId: number): void {
    this.#planDetails.delete(planId);
  }

  genPlanLiveStatusAndAnalytics(planId: number): Observable<PlanLiveStatusAndAnalytics> {
    const url = this.#getGetPlanLiveStatusAndAnalyticsUrl(planId);
    return this.#httpClient.get<IBaseResponse<PlanLiveStatusAndAnalyticsDTO>>(url).pipe(
      map(({ data, error }) => {
        if (data === null) {
          throw error;
        }
        return this.#planLiveStatusAndAnalyticsAdapter.fromApi(data);
      }),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  getBookingAgentPlans(
    partnerId: number,
    buisinessId: string,
    params?: {
      planIds: number[];
    },
  ): Observable<BaseResponse<Plan[] | null>> | never {
    const user: User | null = this.#userService.getUser();
    if (user === null) {
      throw new Error('User not found');
    }
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }

    // The distributor twin of this listing drops the agent business and the user: the pair is the organization.
    const target = this.#distributorRoute.pairTarget();
    const onBehalfTarget = target === null ? this.#onBehalfTarget.target() : null;
    let path =
      target !== null
        ? `${environment.apiGWBaseUrl}/4.0/partners/${target.targetOrganizationId}/plans`
        : `${this.#getGetBookingAgentMyPlansUrl(partnerId, buisinessId, user.id)}`;
    if (onBehalfTarget !== null) {
      path = this.#getGetDistributorPlansUrl(onBehalfTarget.distributorId);
    } else if (target === null && !this.#userService.isBusiness()) {
      path = `${this.#getGetBookingAgentPlansUrl(partnerId, buisinessId)}`;
    }
    let queryParams = new HttpParams();
    if (params !== undefined && params?.planIds.length > 0) {
      queryParams = queryParams.append('plan_ids', params?.planIds.join(','));
    }
    const headers = new HttpHeaders(this.#bookingAgentPlansHeaders(target, onBehalfTarget));

    return this.#httpClient.get<BaseResponse<PlansData>>(path, { headers, observe: 'response', params: queryParams }).pipe(
      map((result: HttpResponse<BaseResponse<PlansData>>) => this.#plansAdapter.fromApi(result)),
      catchError(error => ErrorResponseUtils.getErrorResponse(error)),
    );
  }

  getFlexibleBundleSessions(
    partnerId: number,
    planId: number,
    query: FlexibleBundleSessionsQuery,
  ): Observable<BaseResponse<FlexibleBundleSessions | null>> {
    const url = this.#getFlexibleBundleSessionsUrl(partnerId, planId);
    const params = new HttpParams().set('channel', query.channelId);

    return this.#httpClient.get<BaseResponse<FlexibleBundleSessionsDTO>>(url, { params }).pipe(
      map((result: BaseResponse<FlexibleBundleSessionsDTO>) => this.#flexibleBundleSessionsAdapter.fromApi(result)),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  getPartnerResellerPlansPaginated(
    resellerId: number,
    parameters: GetPlansQuery,
    nextPage?: string | null,
  ): Observable<LinkPaginationResponse<Plan[] | null>> {
    const nextPageParam = nextPage || 'items_per_page=25&page=1';
    const path = `${this.#getGetPartnerResellerPlansUrl(parameters.partnerId, resellerId, nextPageParam)}`;
    const params = this.#buildGetPlanParams(parameters);

    return this.#httpClient.get<BaseResponse<PlansData>>(path, { observe: 'response', params }).pipe(
      map((result: HttpResponse<BaseResponse<PlansData>>) => this.#plansWithAnalyticsAdapter.fromApi(result)),
      catchError(error => ErrorResponseUtils.getErrorForPaginatedResponse<Plan[]>(error)),
    );
  }

  getPlan(partnerID: number, planID: number): Observable<BaseResponse<Plan | null>> {
    const planDetailVariant = this.#planDetailVariant(partnerID);
    const planDetailsStored: BaseResponse<Plan> | undefined = this.#readPlanDetail(planID, planDetailVariant);
    if (planDetailsStored !== undefined) {
      return of(planDetailsStored);
    }
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const path = `${this.#getGetPlanUrl(partnerID, planID)}`;
    const target = this.#distributorRoute.pairTarget();
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});

    return this.#httpClient.get<BaseResponse<PlanData>>(path, { headers }).pipe(
      map((result: BaseResponse<PlanData>) => this.#planAdapter.fromApi(result)),
      tap(response => this.#writePlanDetail(planID, planDetailVariant, response)),
      catchError(error => ErrorResponseUtils.getErrorResponse(error)),
    );
  }

  getPlans(partnerId: number, planIds: number[] = [], params?: GetPlansParams): Observable<BaseResponse<Plan[] | null>> {
    const cacheKey = this.#createCacheKey(partnerId, planIds, params);
    const cachedResponse = this.#plansCache.get(cacheKey);
    if (cachedResponse) {
      return of(cachedResponse);
    }

    const fetchedPlans: Plan[] | null = this.#readFetchedPlans(partnerId, planIds, params);
    if (fetchedPlans !== null) {
      return of(new BaseResponse<Plan[] | null>(fetchedPlans, null));
    }

    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }

    // The optimized fetch walks v3 pages, and the pair route has no v3 twin: it declares `plan_ids` and
    // nothing else, and answers everything in one request - which is what this flag is reaching for. So a
    // distributor session takes the single-request path below, the one that knows the pair URL.
    if (
      this.#distributorRoute.pairTarget() === null &&
      (params?.includeCountryIsoCode === true || this.#optimizelyService.isFeatureEnabled(FeatureFlags.OPTIMIZE_PLANS_REQUEST))
    ) {
      return this.#fetchAllPlans(partnerId, planIds, params).pipe(
        tap(response => {
          if (response.data && !response.error) {
            this.#plansCache.set(cacheKey, response as BaseResponse<Plan[]>);
          }
        }),
        catchError(error => {
          console.error('API error:', error);
          return ErrorResponseUtils.getErrorResponse(error);
        }),
      );
    }

    const path = `${this.#getGetPlansUrl(partnerId)}`;
    const target = this.#distributorRoute.pairTarget();
    const isDistributorRoute = target !== null;
    let queryParams = new HttpParams();
    planIds.forEach(id => {
      queryParams = queryParams.append('plan_ids', id);
    });
    if (params?.channelId && !isDistributorRoute) {
      queryParams = queryParams.append('channel_id', params?.channelId);
    }
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});

    return this.#httpClient.get<BaseResponse<PlansData>>(path, { headers, observe: 'response', params: queryParams }).pipe(
      map((result: HttpResponse<BaseResponse<PlansData>>) => this.#plansAdapter.fromApi(result)),
      tap(response => this.#plansCache.set(cacheKey, response)),
      catchError(error => {
        console.error('API error:', error);
        return ErrorResponseUtils.getErrorResponse(error);
      }),
    );
  }

  getPlansWithAnalytics(
    parameters: GetPlansQuery,
    nextPageParam = 'items_per_page=25&page=1',
  ): Observable<LinkPaginationResponse<Plan[] | null>> {
    const path = `${this.#getGetPlansWithAnalyticsUrl(parameters.partnerId, nextPageParam)}`;
    const params = this.#buildGetPlanParams(parameters);

    return this.#httpClient.get<BaseResponse<PlansData>>(path, { observe: 'response', params }).pipe(
      map((result: HttpResponse<BaseResponse<PlansData>>) => this.#plansWithAnalyticsAdapter.fromApi(result)),
      catchError(error => ErrorResponseUtils.getErrorForPaginatedResponse<Plan[]>(error)),
    );
  }

  getPublicPlan(planID: number, channelId: string): Observable<PlanDetailPublic> {
    const path = `${this.#getGetPublicPlanUrl(planID, channelId)}`;

    return this.#httpClient.get<PlanDetailPublicResponse>(path).pipe(
      map((result: PlanDetailPublicResponse) => this.#planDetailPublic.fromApi(result)),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  getResellerPlan(resellerID: number, planID: number, channelId?: string): Observable<BaseResponse<Plan | null>> {
    const planDetailVariant = this.#planDetailVariant(resellerID, channelId);
    const planDetailsStored = this.#readPlanDetail(planID, planDetailVariant);
    if (planDetailsStored) {
      return of(planDetailsStored);
    }
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }

    // A distributor is of type RESELLER, so it lands here - but it may not read a reseller's own catalogue.
    const target = this.#distributorRoute.pairTarget();
    const path =
      target !== null
        ? `${environment.apiGWBaseUrl}/2.0/partners/${target.targetOrganizationId}/plans/${planID}`
        : `${this.#getGetResellerPlanUrl(resellerID, planID)}`;
    let params = new HttpParams();
    if (channelId !== undefined && target === null) {
      params = params.set('channel_id', channelId);
    }
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});

    return this.#httpClient.get<BaseResponse<PlanData>>(path, { headers, params }).pipe(
      map((result: BaseResponse<PlanData>) => this.#planAdapter.fromApi(result)),
      tap(response => this.#writePlanDetail(planID, planDetailVariant, response)),
      catchError(error => ErrorResponseUtils.getErrorResponse(error)),
    );
  }

  getResellerPlans(resellerId: number, parameters: GetPlansQuery): Observable<BaseResponse<Plan[] | null>> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const target = this.#distributorRoute.pairTarget();
    const path =
      target !== null
        ? `${environment.apiGWBaseUrl}/4.0/partners/${target.targetOrganizationId}/plans`
        : `${this.#getGetResellerPlansUrl(resellerId)}`;
    const params = target !== null ? this.#buildGetDistributorPlansParams(parameters) : this.#buildGetPlanParams(parameters);
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});

    return this.#httpClient.get<BaseResponse<PlansData>>(path, { headers, observe: 'response', params }).pipe(
      map((result: HttpResponse<BaseResponse<PlansData>>) => this.#plansAdapter.fromApi(result)),
      catchError(error => ErrorResponseUtils.getErrorResponse<Plan[]>(error)),
    );
  }

  getResellerPlansPaginated(
    resellerId: number,
    parameters: GetPlansQuery,
    nextPageParam = 'items_per_page=25&page=1',
  ): Observable<LinkPaginationResponse<Plan[] | null>> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const target = this.#distributorRoute.pairTarget();
    let path =
      target !== null
        ? `${environment.apiGWBaseUrl}/4.0/partners/${target.targetOrganizationId}/plans`
        : `${this.#getGetResellerPlansUrl(resellerId)}`;
    // The distributor route answers everything in one shot and declares no pagination params.
    if (nextPageParam && target === null) {
      path = `${path}?${nextPageParam}`;
    }
    const params = target !== null ? this.#buildGetDistributorPlansParams(parameters) : this.#buildGetPlanParams(parameters);
    const headers = new HttpHeaders(target !== null ? scopedOrganizationHeader(target) : {});

    return this.#httpClient.get<BaseResponse<PlansData>>(path, { headers, observe: 'response', params }).pipe(
      map((result: HttpResponse<BaseResponse<PlansData>>) => this.#plansWithAnalyticsAdapter.fromApi(result)),
      catchError(error => ErrorResponseUtils.getErrorForPaginatedResponse<Plan[]>(error)),
    );
  }

  publishPlan(
    partnerId: number,
    planId: number,
    userId: number,
    channels: string[],
    visibleChannels: string[] = [],
    visibilityFeatureEnabled: boolean = false,
    paymentCollectorByChannel: Record<string, string> = {},
  ): Observable<BaseResponse<void | null>> {
    const url = `${this.#getPublishPlanUrl(partnerId, planId)}`;
    const body: PublishChannelBodyDTO = this.#getBodyPublishChannels(
      userId,
      channels,
      visibleChannels,
      visibilityFeatureEnabled,
      paymentCollectorByChannel,
    );
    if (body.data.length === 0) {
      return of(new BaseResponse(null, null));
    }

    return this.#httpClient.post(url, body, { observe: 'response' }).pipe(
      map((response: HttpResponse<unknown>) => {
        if (response.status === 204) {
          return new BaseResponse(null, null);
        }
        const responseBody = response.body as { error?: { code?: unknown; message?: unknown } } | null;
        const error = {
          code: responseBody?.error?.code || response.status,
          message: responseBody?.error?.message || 'errors.generic',
        };

        return new BaseResponse(null, error);
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<void>(error)),
    );
  }

  refreshPlan(planId: number): Observable<void> {
    const url = this.#getRefreshPlanUrl(planId);

    return this.#httpClient
      .post<void>(url, null)
      .pipe(catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))));
  }

  // Unlike the `name` and `plan_id` filters, `q` matches the plan name or ID as a substring, so "129" finds plan 129841.
  searchPlans(
    partnerId: number,
    searchTerm: string,
    nextPageParam = 'items_per_page=25&page=1',
  ): Observable<LinkPaginationResponse<Plan[] | null>> {
    const path = `${this.#getGetPlansUrlV3(partnerId)}?${nextPageParam}`;
    const params = new HttpParams().set('q', searchTerm);

    return this.#httpClient.get<BaseResponse<PlansData>>(path, { observe: 'response', params }).pipe(
      map((result: HttpResponse<BaseResponse<PlansData>>) => this.#plansWithAnalyticsAdapter.fromApi(result)),
      catchError(error => ErrorResponseUtils.getErrorForPaginatedResponse<Plan[]>(error)),
    );
  }

  setPlanDefaultCapacityPerTimeSlot(partnerId: number, planId: number, defaultCapacityPerTimeSlot: number | null): Observable<void> {
    const url = `${this.#getSetPlanDefaultCapacityPerTimeSlotUrl(partnerId, planId)}`;
    const dto = { default_capacity_per_time_slot: defaultCapacityPerTimeSlot };

    return this.#httpClient
      .patch<void>(url, dto)
      .pipe(catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))));
  }

  setPlanStatusAsReadyThroughPartners(partnerId: number, planId: number): Observable<BaseResponse<unknown>> {
    const url = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/set-as-ready`;

    return this.#httpClient.post(url, null, { observe: 'response' }).pipe(
      map((response: HttpResponse<unknown>) => {
        if (response.status === 204) {
          return new BaseResponse(null, null);
        }
        const body = response.body as { error?: { code?: unknown; message?: unknown } } | null;
        const error = {
          code: body?.error?.code ?? response.status,
          message: body?.error?.message ?? 'errors.generic',
        };

        return new BaseResponse(null, error);
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse(error)),
    );
  }

  unpublishPlan(partnerId: number, planId: number, userId: number, channels: string[]): Observable<BaseResponse<void>> {
    const url = `${this.#getUnpublishPlanUrl(partnerId, planId)}`;

    return this.#httpClient.post(url, { channels: channels, b2b_user_id: userId }, { observe: 'response' }).pipe(
      map((response: HttpResponse<unknown>) => {
        if (response.status === 204) {
          return new BaseResponse(null, null);
        }
        const responseBody = response.body as { error?: { code?: unknown; message?: unknown } } | null;
        const error = {
          code: responseBody?.error?.code || response.status,
          message: responseBody?.error?.message || 'errors.generic',
        };
        return new BaseResponse(null, error);
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<void>(error)),
    );
  }

  updateIsHiddenFeed(planId: number, isHiddenFeed: boolean): Observable<unknown> {
    const userId = this.#userService.getUser()?.id;
    const url = this.#getUpdateHiddenFeedUrl(planId);

    return this.#httpClient
      .patch(url, {
        is_hidden_feed: isHiddenFeed,
        b2b_user_id: userId,
      })
      .pipe(catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))));
  }

  /** The distributor plans route declares `plan_ids` alone and rejects any other query param. */
  #buildGetDistributorPlansParams(parameters: GetPlansQuery): HttpParams {
    let params = new HttpParams();
    if (parameters.planId) {
      params = params.append('plan_ids', parameters.planId);
    }
    return params;
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
    if (parameters.reviewStatus?.length) {
      const reviewStatuses = Array.isArray(parameters.reviewStatus) ? parameters.reviewStatus : [parameters.reviewStatus];
      reviewStatuses.forEach(reviewStatus => (params = params.append('review_status', reviewStatus)));
    }
    if (parameters.orderBy) {
      let orderBy = '';
      parameters.orderBy.forEach(
        (orderField, index) =>
          (orderBy +=
            `${orderField.field}.${orderField.direction}` + ((parameters.orderBy as TableOrderBy[]).length - 1 > index ? ',' : '')),
      );
      params = params.append('order_by', orderBy);
    }

    return params;
  }

  #createCacheKey(partnerId: number, planIds: number[], params?: GetPlansParams): string {
    const planIdsStr = planIds.sort().join(',');
    const channelId = params?.channelId || '';
    const countryScope = params?.includeCountryIsoCode === true ? '-with-country' : '';
    return `${this.#distributorScope()}${partnerId}-${planIdsStr}-${channelId}${countryScope}`;
  }

  #distributorScope(): string {
    const target = this.#distributorRoute.pairTarget();

    return target === null ? '' : `for-${target.targetOrganizationId}-`;
  }

  #fetchAllPlans(partnerId: number, planIds: number[], params?: GetPlansParams): Observable<BaseResponse<Plan[] | null>> {
    return this.#fetchPlansPage(partnerId, planIds, 1, params).pipe(
      switchMap((firstPage: LinkPaginationResponse<Plan[] | null>) => {
        if (this.#isPlansPageError(firstPage)) {
          return of(new BaseResponse<Plan[] | null>(null, this.#plansPageError(firstPage)));
        }
        const lastPage: number | null = firstPage.getLastPaginationPage();
        if (lastPage !== null && lastPage >= 2) {
          return this.#fetchRemainingPagesInParallel(partnerId, planIds, firstPage, lastPage, params);
        }
        if (firstPage.getNextPaginationPage() !== null) {
          return this.#followNextPlanPages(partnerId, planIds, firstPage, params);
        }
        return of(this.#combinePlanPages([firstPage]));
      }),
    );
  }

  #fetchRemainingPagesInParallel(
    partnerId: number,
    planIds: number[],
    firstPage: LinkPaginationResponse<Plan[] | null>,
    lastPage: number,
    params?: GetPlansParams,
  ): Observable<BaseResponse<Plan[] | null>> {
    const remainingPages: number[] = Array.from({ length: lastPage - 1 }, (_, index: number) => index + 2);
    return from(remainingPages).pipe(
      mergeMap(
        (page: number) =>
          this.#fetchPlansPage(partnerId, planIds, page, params).pipe(
            map((pageResponse: LinkPaginationResponse<Plan[] | null>) => ({ page, pageResponse })),
          ),
        PlanService.plansFetchConcurrency,
      ),
      toArray(),
      map((pageResults: { page: number; pageResponse: LinkPaginationResponse<Plan[] | null> }[]) => {
        const orderedPages = [...pageResults]
          .sort((first, second) => first.page - second.page)
          .map((result: { page: number; pageResponse: LinkPaginationResponse<Plan[] | null> }) => result.pageResponse);
        return this.#combinePlanPages([firstPage, ...orderedPages]);
      }),
    );
  }

  #followNextPlanPages(
    partnerId: number,
    planIds: number[],
    firstPage: LinkPaginationResponse<Plan[] | null>,
    params?: GetPlansParams,
  ): Observable<BaseResponse<Plan[] | null>> {
    return of(firstPage).pipe(
      expand((page: LinkPaginationResponse<Plan[] | null>) => {
        const nextPage: number | null = page.getNextPaginationPage();
        return nextPage !== null && !this.#isPlansPageError(page) ? this.#fetchPlansPage(partnerId, planIds, nextPage, params) : EMPTY;
      }),
      toArray(),
      map((pages: LinkPaginationResponse<Plan[] | null>[]) => this.#combinePlanPages(pages)),
    );
  }

  #combinePlanPages(orderedPages: LinkPaginationResponse<Plan[] | null>[]): BaseResponse<Plan[] | null> {
    const errorPageIndex = orderedPages.findIndex(page => this.#isPlansPageError(page));
    if (errorPageIndex !== -1) {
      const accumulated = orderedPages.slice(0, errorPageIndex).flatMap(page => page.data ?? []);
      return new BaseResponse<Plan[] | null>(
        accumulated.length > 0 ? accumulated : null,
        this.#plansPageError(orderedPages[errorPageIndex]),
      );
    }
    return new BaseResponse<Plan[] | null>(
      orderedPages.flatMap(page => page.data ?? []),
      null,
    );
  }

  #fetchPlansPage(
    partnerId: number,
    planIds: number[],
    page: number,
    params?: GetPlansParams,
  ): Observable<LinkPaginationResponse<Plan[] | null>> {
    const path: string = this.#getGetPlansUrlV3(partnerId);
    let queryParams = new HttpParams().set('items_per_page', PlanService.plansItemsPerPage.toString()).set('page', page.toString());
    planIds.forEach((id: number) => {
      queryParams = queryParams.append('plan_ids', id);
    });
    if (params !== undefined && params?.channelId !== undefined) {
      queryParams = queryParams.append('channel_id', params.channelId);
    }
    if (params?.includeCountryIsoCode === true || this.#optimizelyService.isFeatureEnabled(FeatureFlags.DEPOSITS)) {
      queryParams = queryParams.append('include', 'country_iso_code');
    }
    return this.#httpClient.get<BaseResponse<PlansData>>(path, { observe: 'response', params: queryParams }).pipe(
      map((result: HttpResponse<BaseResponse<PlansData>>) => {
        const response: BaseResponse<Plan[] | null> = this.#plansAdapter.fromApi(result);
        return new LinkPaginationResponse<Plan[] | null>(result.headers.get('Link'), response.data, response.error);
      }),
    );
  }

  #isPlansPageError(response: LinkPaginationResponse<Plan[] | null>): boolean {
    return response.error?.code !== undefined || response.error?.message !== undefined || !response.data;
  }

  // A failed page with no readable error would otherwise pass the earlier pages off as the whole listing.
  #plansPageError(page: LinkPaginationResponse<Plan[] | null>): BaseErrorResponse {
    if (page.error?.code !== undefined || page.error?.message !== undefined) {
      return page.error;
    }
    return { code: PlanService.incompletePlansPageErrorCode, message: 'A plans page came back without plans' };
  }
  #getBodyPublishChannels(
    userId: number,
    channels: string[],
    visibleChannels: string[] = [],
    visibilityFeatureEnabled: boolean,
    paymentCollectorByChannel: Record<string, string> = {},
  ): PublishChannelBodyDTO {
    const publishChannels: PublishChannelDTO[] = [];
    channels.map((channelId: string) => {
      let channel: PublishChannelDTO = { channel: channelId };
      const addVisibleField = visibilityFeatureEnabled && PlanService.channelVisibilityEditable.includes(channelId);
      channel = addVisibleField ? { ...channel, is_visible: visibleChannels.includes(channelId) } : channel;
      if (paymentCollectorByChannel[channelId]) {
        channel = { ...channel, payment_collector: paymentCollectorByChannel[channelId] };
      }
      publishChannels.push(channel);
    });
    return {
      data: publishChannels,
      b2b_user_id: userId,
      send_push_notifications: false,
    };
  }

  #getFlexibleBundleSessionsUrl(partnerId: number, planId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/flexible-bundle-sessions/`;
  }

  #getGetBookingAgentMyPlansUrl(partnerId: number, buisinessId: string, userId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/users/${userId}/booking-agents/${buisinessId}/plans`;
  }

  #bookingAgentPlansHeaders(target: DistributorTarget | null, onBehalfTarget: DistributorTarget | null): Record<string, string> {
    if (target !== null) {
      return scopedOrganizationHeader(target);
    }
    if (onBehalfTarget !== null) {
      return scopedOrganizationHeaderFor(onBehalfTarget.targetOrganizationId);
    }
    return {};
  }

  #getGetDistributorPlansUrl(distributorOrganizationId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/distributors/${distributorOrganizationId}/plans`;
  }

  #getGetBookingAgentPlansUrl(partnerId: number, buisinessId: string): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/booking-agents/${buisinessId}/plans`;
  }

  #getGetPartnerResellerPlansUrl(partnerID: number | undefined, resellerID: number, nextPageParam = 'items_per_page=25&page=1') {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerID}/resellers/${resellerID}/plans?${nextPageParam}`;
  }

  #getGetPlanLiveStatusAndAnalyticsUrl(planId: number): string {
    const partnerId: number | undefined = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined) {
      throw new Error('Partner not found');
    }
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/refresh`;
  }

  #getGetPlanUrl(partnerID: number, planID: number) {
    const target = this.#distributorRoute.pairTarget();
    if (target !== null) {
      return `${environment.apiGWBaseUrl}/2.0/partners/${target.targetOrganizationId}/plans/${planID}`;
    }
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerID}/plans/${planID}`;
  }

  #getGetPlansUrl(partnerID: number) {
    const target = this.#distributorRoute.pairTarget();
    if (target !== null) {
      // The distributor twin lives at 4.0 and takes the channel from the concession, not from a param.
      return `${environment.apiGWBaseUrl}/4.0/partners/${target.targetOrganizationId}/plans`;
    }
    return `${environment.apiGWBaseUrl}/2.0/partners/${partnerID}/plans`;
  }

  #getGetPlansUrlV3(partnerId: number): string {
    return `${environment.apiGWBaseUrl}/3.0/partners/${partnerId}/plans`;
  }

  #getGetPlansWithAnalyticsUrl(partnerID: number | undefined, nextPageParam = 'items_per_page=25&page=1') {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerID}/plans-with-analytics?${nextPageParam}`;
  }

  #getGetPublicPlanUrl(planId: number, channelId: string) {
    return `${environment.apiB2CBaseUrl}/api/4.4/plans/${planId}/?channel=${channelId}`;
  }

  #getGetResellerPlanUrl(resellerID: number, planID: number) {
    return `${environment.apiGWBaseUrl}/1.0/resellers/${resellerID}/plans/${planID}`;
  }

  #getGetResellerPlansUrl(resellerID: number) {
    return `${environment.apiGWBaseUrl}/1.0/resellers/${resellerID}/plans`;
  }

  #getPublishPlanUrl(partnerId: number, planId: number): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/plans/${planId}/publish/`;
  }

  #getRefreshPlanUrl(planId: number): string {
    const partnerId: number | undefined = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined) {
      throw new Error('Partner not found');
    }
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/refresh`;
  }

  #getSetPlanDefaultCapacityPerTimeSlotUrl(partnerId: number, planId: number): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/plans/${planId}/default-capacity-per-time-slot/`;
  }

  #getUnpublishPlanUrl(partnerId: number, planId: number): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/plans/${planId}/unpublish/`;
  }

  #getUpdateHiddenFeedUrl(planId: number): string {
    const partner: Partner | null = this.#partnerService.getPartner();
    if (partner === null) {
      throw new Error('Partner not found');
    }
    const partnerId = partner.id;

    return `${environment.apiBaseUrl}/partners/${partnerId}/plans/${planId}/hidden-feed/update/`;
  }

  #planDetailVariant(addressedOrganizationId: number, channelId?: string): string {
    return `${this.#distributorScope()}${addressedOrganizationId}-${channelId ?? ''}`;
  }

  /**
   * The plans a lookup by ids can take from what is already loaded: the plan detail cached for each id under the current distributor
   * scope, else the same id in any plans list cached for the partner and scope. A lookup filtered by channel asks which
   * plans are on that channel, a different question, and an id never loaded needs the network: both answer null.
   */
  #readFetchedPlans(partnerId: number, planIds: number[], params?: { channelId?: string }): Plan[] | null {
    if (planIds.length === 0 || params?.channelId !== undefined) {
      return null;
    }
    const detailVariant: string = this.#planDetailVariant(partnerId);
    const listedPlans: Map<number, Plan> = this.#readListedPlans(partnerId);
    const plans: (Plan | undefined)[] = planIds.map(
      (planId: number) => this.#readPlanDetail(planId, detailVariant)?.data ?? listedPlans.get(planId),
    );
    return plans.every((plan: Plan | undefined): plan is Plan => plan !== undefined) ? plans : null;
  }

  #readListedPlans(partnerId: number): Map<number, Plan> {
    const keyPrefix = `${this.#distributorScope()}${partnerId}-`;
    const listedPlans = new Map<number, Plan>();
    this.#plansCache.forEach((response: BaseResponse<Plan[]>, key: string) => {
      if (!key.startsWith(keyPrefix)) {
        return;
      }
      (response.data ?? []).forEach((plan: Plan) => {
        if (plan.id !== undefined) {
          listedPlans.set(plan.id, plan);
        }
      });
    });
    return listedPlans;
  }

  #readPlanDetail(planID: number, variant: string): BaseResponse<Plan> | undefined {
    return this.#planDetails.get(planID)?.get(variant);
  }

  #writePlanDetail(planID: number, variant: string, response: BaseResponse<Plan>): void {
    const variants = this.#planDetails.get(planID) ?? new Map<string, BaseResponse<Plan>>();
    variants.set(variant, response);
    this.#planDetails.set(planID, variants);
  }
}

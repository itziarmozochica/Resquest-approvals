import { HttpClient, HttpContext, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { PermissionsData } from '@fz-original/app/shared/services/user/adapters/permissions.model';
import { STORAGE_SERVICE } from '@fz/storage';
import { Observable, of, ReplaySubject, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay, switchMap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { StorageKey } from '../../../app/enums/storage.enum';
import { ReservationFlowTypeEnum } from '../../../modules/reservation/models/reservation_flow_type.enum';
import { BusinessTypeEnum } from '../../../modules/settings/shared/models/business-type.enum';
import { BusinessService } from '../../../modules/settings/shared/services/business.service';
import { BusinessRoleLabel } from '../../enums/business-role-label.enum';
import { BaseResponse } from '../../models/base-response';
import { LinkPaginationResponse } from '../../models/link-pagination-response';
import { OrganizationSummary, OrganizationSummaryData } from '../../models/organization/organization-summary.model';
import { Organization } from '../../models/organization/organization.model';
import { UserInterfaceType } from '../../models/user/user-interface.enum';
import { UserMfaStatus } from '../../models/user/user-mfa.model';
import { mapUserSecurityFromApi, UserSecuritySnapshot } from '../../models/user/user-security.model';
import { User, UserData } from '../../models/user/user.model';
import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { BusinessInitializationService } from '../distributor/business-initialization.service';
import { DistributorSessionStore } from '../distributor/distributor-session.store';
import { PartnerService } from '../partner/partner.service';
import { Channel } from '../session-availability/channel.enum';
import { PermissionsAdapter } from './adapters/permissions.adapter';
import { UserOrganizationAdapter } from './adapters/user-organization.adapter';
import { UserAdapter } from './adapters/user.adapter';
import { FirstActiveUrlByPermissionService } from './first-active-url-by-permission.service';
import { Permissions } from './permissions';
import { UserOrganizationQuery } from './user-query';

const businessRoles = new Set<string>(Object.values(BusinessRoleLabel));

@Injectable({
  providedIn: 'root',
})
export class UserService {
  static readonly organizationCountKey = 'organization_count';
  static readonly selectedOrganizationRoleKey = 'selected_organization_role';
  static readonly userKey = 'user';
  #firstActiveUrlByPermission = '/plans';
  #http = inject(HttpClient);
  #permissionsAdapter = inject(PermissionsAdapter);
  #userAdapter = inject(UserAdapter);
  #userEmail = '';
  #userId: number | typeof NaN | undefined;
  #userOrganizationAdapter = inject(UserOrganizationAdapter);
  #businessService = inject(BusinessService);
  #businessInitialization = inject(BusinessInitializationService, { optional: true });
  #distributorSession = inject(DistributorSessionStore);
  #firstActiveUrlByPermissionService = inject(FirstActiveUrlByPermissionService);
  #storage = inject(STORAGE_SERVICE);
  #meRequest$: Observable<BaseResponse<UserData>> | null = null;
  #permissionsRequest$: Observable<BaseResponse<string[] | null>> | null = null;
  #selectedOrganizationRoleLabel: string | null = localStorage.getItem(UserService.selectedOrganizationRoleKey);
  partnerId: number | undefined;
  permissions$ = new ReplaySubject<void>(1);
  permissionsInOrganization: string[] = [];
  user: User | null = null;
  user$ = new ReplaySubject<User>(1);

  clearPermissions(): void {
    this.permissionsInOrganization = [];
    this.#permissionsRequest$ = null;
  }

  getBusinessChannel(): Channel {
    if (this.user?.business?.channel) {
      return this.user?.business?.channel as Channel;
    }

    return Channel.Business;
  }

  getChannelFromBusinessType(businessType?: BusinessTypeEnum): Channel {
    if (businessType === BusinessTypeEnum.AGENCY) {
      return Channel.ResellerTravelAgency;
    }
    if (businessType === BusinessTypeEnum.GUIDE) {
      return Channel.ResellerTouristGuide;
    }
    if (businessType === BusinessTypeEnum.CULTURAL) {
      return Channel.ResellerCulturalGroup;
    }
    if (businessType === BusinessTypeEnum.EDUCATIONAL) {
      return Channel.ResellerEducationalGroup;
    }
    if (businessType === BusinessTypeEnum.CORPORATE) {
      return Channel.ResellerCorporateGroup;
    }
    if (businessType === BusinessTypeEnum.LARGE_GROUP) {
      return Channel.ResellerLargeGroup;
    }
    if (businessType === BusinessTypeEnum.PREMIUM_SERVICES) {
      return Channel.ResellerPremiumServices;
    }
    if (businessType === BusinessTypeEnum.SALES_REPRESENTATIVE) {
      return Channel.ResellerSalesRepresentative;
    }
    if (businessType === BusinessTypeEnum.INTERNAL_OPERATIONS) {
      return Channel.ResellerInternalOperations;
    }
    if (businessType === BusinessTypeEnum.PARTNERSHIPS) {
      return Channel.ResellerPartnerships;
    }
    if (businessType === BusinessTypeEnum.INTERNAL_COMPS) {
      return Channel.ResellerInternalComps;
    }
    if (businessType === BusinessTypeEnum.INVITATIONS) {
      return Channel.ResellerInvitations;
    }
    if (businessType === BusinessTypeEnum.DOMESTIC_SCHOOL) {
      return Channel.ResellerDomesticSchool;
    }
    if (businessType === BusinessTypeEnum.OVERSEAS_SCHOOL) {
      return Channel.ResellerOverseasSchool;
    }
    if (businessType === BusinessTypeEnum.GROUP) {
      return Channel.ResellerGroup;
    }
    if (businessType === BusinessTypeEnum.MEMBERSHIP) {
      return Channel.ResellerMembership;
    }
    if (businessType === BusinessTypeEnum.PACKAGE_TOUR) {
      return Channel.ResellerPackageTour;
    }
    if (businessType === BusinessTypeEnum.EMPLOYEE_BENEFIT) {
      return Channel.ResellerEmployeeBenefit;
    }
    if (businessType === BusinessTypeEnum.IN_MARKET) {
      return Channel.ResellerInMarket;
    }
    if (businessType === BusinessTypeEnum.CITY_PASS) {
      return Channel.ResellerCityPass;
    }
    if (businessType === BusinessTypeEnum.RETAIL) {
      return Channel.ResellerRetail;
    }
    if (businessType === BusinessTypeEnum.ONLINE_TRAVEL_AGENT) {
      return Channel.ResellerOnlineTravelAgent;
    }
    if (businessType === BusinessTypeEnum.GIFTING) {
      return Channel.ResellerGifting;
    }
    if (businessType === BusinessTypeEnum.LOYALTY) {
      return Channel.ResellerLoyalty;
    }
    if (businessType === BusinessTypeEnum.MICE) {
      return Channel.ResellerMice;
    }
    if (businessType === BusinessTypeEnum.COMMERCIAL_PARTNERSHIP) {
      return Channel.ResellerCommercialPartnership;
    }

    return Channel.Business;
  }

  getFirstActiveUrlByPermission(): string {
    return this.#firstActiveUrlByPermission;
  }

  fetchMe(): Observable<BaseResponse<User | null>> {
    return this.#requestMe().pipe(catchError(error => ErrorResponseUtils.getErrorResponse<User>(error)));
  }

  getMe(options?: { skipBusinessDetailsEnrichment?: boolean }): Observable<BaseResponse<User | null>> {
    return this.#requestMe().pipe(
      switchMap(userResponse => {
        if (options?.skipBusinessDetailsEnrichment === true) {
          return of(userResponse);
        }
        return this.#fetchBusinessDetailsForBusinessUser(userResponse);
      }),
      catchError(error => ErrorResponseUtils.getErrorResponse<User>(error)),
      map(finalResponse => this.#persistUserAndReturn(finalResponse)),
    );
  }

  /**
   * Reads MFA and SSO from /me without persisting the user or emitting on {@link user$}.
   *
   * MFA enrollment and SSO status change auth presentation, not the user identity.
   * Refreshing via {@link getMe} would broadcast on user$ and can trigger unrelated
   * side effects. Callers that need a fresh security snapshot should use this instead.
   */
  getUserSecurityFromMe(): Observable<UserSecuritySnapshot> {
    return this.#requestMeRaw().pipe(map((raw: BaseResponse<UserData>): UserSecuritySnapshot => mapUserSecurityFromApi(raw.data)));
  }

  /**
   * Reads MFA from /me without persisting the user or emitting on {@link user$}.
   * Prefer {@link getUserSecurityFromMe} when SSO status is also needed.
   */
  getUserMfa(): Observable<UserMfaStatus | null> {
    return this.getUserSecurityFromMe().pipe(map((snapshot: UserSecuritySnapshot): UserMfaStatus | null => snapshot.mfa));
  }

  getNumberOfOrganizations(): number {
    const organizationCount = localStorage.getItem(UserService.organizationCountKey);
    if (organizationCount === null) {
      return 0;
    }

    return JSON.parse(organizationCount) as number;
  }

  getOrganizations(
    queryParameters: UserOrganizationQuery,
    context: HttpContext = new HttpContext(),
  ): Observable<LinkPaginationResponse<OrganizationSummary | null>> {
    const path: string = this.#getOrganizationsUrl(queryParameters.userId);
    const params: HttpParams = this.#getOrganizationParameters(queryParameters);

    return this.#http.get<BaseResponse<OrganizationSummaryData>>(path, { context, observe: 'response', params }).pipe(
      map((result: HttpResponse<BaseResponse<OrganizationSummaryData>>) => {
        const organizationSummaryResponse: LinkPaginationResponse<OrganizationSummary> = this.#userOrganizationAdapter.fromApi(result);
        if (
          !queryParameters.search &&
          !queryParameters.withPermission &&
          queryParameters.organizationCategory === undefined &&
          (queryParameters.organizationIds === undefined || queryParameters.organizationIds.length === 0)
        ) {
          this.#saveNumberOfOrganizations(organizationSummaryResponse.data?.total ?? null);
        }

        return organizationSummaryResponse;
      }),
      catchError(error => ErrorResponseUtils.getErrorForPaginatedResponse<OrganizationSummary>(error)),
    );
  }

  getPermissionsInOrganization(): Observable<BaseResponse<string[] | null>> {
    if (this.permissionsInOrganization.length > 0) {
      return of(new BaseResponse(this.permissionsInOrganization, null));
    }

    if (this.#permissionsRequest$) {
      return this.#permissionsRequest$;
    }

    const localStorageUserId = localStorage.getItem('userId');
    const localStoragePartner = localStorage.getItem(PartnerService.partnerStorageKey);
    const userId: number | typeof NaN = this.#userId ?? (localStorageUserId != null ? parseInt(localStorageUserId, 10) : NaN);
    const partnerId: number | undefined = this.partnerId ?? (localStoragePartner != null ? JSON.parse(localStoragePartner)?.id : undefined);
    if (isNaN(userId)) {
      throw new Error('User Id not set');
    }
    if (partnerId === undefined) {
      throw new Error('Partner Id not set');
    }
    this.#userId = userId;
    this.partnerId = partnerId;

    if (this.#userId !== undefined && !isNaN(this.#userId) && this.partnerId !== undefined) {
      const path = this.#getPermissionsInOrganizationUrl(this.partnerId);

      this.#permissionsRequest$ = this.#http.get<BaseResponse<PermissionsData>>(path).pipe(
        map((result: BaseResponse<PermissionsData>) => {
          const response: BaseResponse<string[]> = this.#permissionsAdapter.fromApi(result);
          if (response.data !== null) {
            this.permissionsInOrganization = response.data;
          }
          this.setFirstActiveUrlByPermission(this.permissionsInOrganization);
          this.permissions$.next();

          return response;
        }),
        catchError(error => ErrorResponseUtils.getErrorResponse<string[]>(error)),
        finalize(() => {
          this.#permissionsRequest$ = null;
        }),
        shareReplay(1),
      );

      return this.#permissionsRequest$;
    }

    return of(new BaseResponse([], null));
  }

  reloadPermissionsInOrganization(): Observable<string[]> {
    if (this.partnerId === undefined) {
      return throwError(() => new Error('Partner Id not set'));
    }
    return this.#http.get<BaseResponse<PermissionsData>>(this.#getPermissionsInOrganizationUrl(this.partnerId)).pipe(
      map((result: BaseResponse<PermissionsData>) => {
        // The adapter turns a missing `data` into an empty list, which would wipe every permission here.
        if (!result.data) {
          throw result.error ?? new Error('Permissions response without data');
        }
        const permissions: string[] = this.#permissionsAdapter.fromApi(result).data ?? [];
        this.permissionsInOrganization = permissions;
        this.permissions$.next();
        return permissions;
      }),
    );
  }

  getReservationFlowType(): ReservationFlowTypeEnum {
    if (this.hasPermission(Permissions.CAN_RESERVE_CART)) {
      return ReservationFlowTypeEnum.as_business;
    }
    if (this.hasPermission(Permissions.CAN_RESERVE_ON_BEHALF)) {
      return ReservationFlowTypeEnum.on_behalf;
    }

    return ReservationFlowTypeEnum.none;
  }

  getSelectedOrganizationRole(): string | null {
    return this.#selectedOrganizationRoleLabel;
  }

  getUser(): User | null {
    if (this.user !== null) {
      return this.user;
    }
    const storedUser: string | null = this.#readStoredUser();
    if (storedUser !== null) {
      const user: User = JSON.parse(storedUser);
      return new User(
        user.id,
        user.email,
        user.language,
        user.name,
        user.type,
        user.interfaceType,
        user.username,
        user.business,
        user.phoneNumber,
      );
    }

    return null;
  }

  updateCachedUserName(name: string): void {
    const user = this.getUser();
    if (!user) {
      return;
    }
    user.name = name;
    this.#persistUserAndReturn(new BaseResponse(user, null));
  }

  getUserEmail(): string {
    return this.#userEmail;
  }

  getUserId(): number | undefined {
    if (this.#userId !== undefined && !isNaN(this.#userId)) {
      return this.#userId;
    }
    const localStorageData: string | null = localStorage.getItem('userId');
    if (localStorageData !== null && localStorageData.trim() !== '' && !isNaN(+localStorageData)) {
      return +localStorageData;
    }

    return undefined;
  }

  getUserObservable(): Observable<User> {
    return this.user$.asObservable();
  }

  hasPermission(action: string): boolean {
    return !!this.permissionsInOrganization?.includes(action);
  }

  isBusiness(): boolean {
    return this.hasPermission(Permissions.CAN_VIEW_MY_RESERVATIONS);
  }

  isFeverUser(): boolean {
    if (this.user?.email === undefined) {
      return false;
    }

    return /^[^@]+@feverup\.com$/.test(this.user?.email);
  }

  isKioskUser(): boolean {
    return this.getUser()?.interfaceType === UserInterfaceType.KIOSK;
  }

  observePermissions(): Observable<void> {
    return this.permissions$.asObservable();
  }

  setFirstActiveUrlByPermission(permissions: string[]): void {
    this.#firstActiveUrlByPermission = this.#firstActiveUrlByPermissionService.resolve(
      new Set(permissions),
      this.#distributorSession.isDistributorSession() || (this.#businessInitialization?.applies() ?? false),
    );
  }

  setNumberOfOrganizations(total: number): void {
    this.#saveNumberOfOrganizations(total);
  }

  setPartnerId(partnerId: number): void {
    this.partnerId = partnerId;
  }

  setSelectedOrganizationRole(roleLabel: string | null | undefined): void {
    this.#selectedOrganizationRoleLabel = roleLabel ?? null;

    if (this.#selectedOrganizationRoleLabel === null) {
      localStorage.removeItem(UserService.selectedOrganizationRoleKey);
      return;
    }

    localStorage.setItem(UserService.selectedOrganizationRoleKey, this.#selectedOrganizationRoleLabel);
  }

  saveSelectedOrganization(organization: Organization | undefined): void {
    if (organization === undefined) {
      this.#storage.remove(StorageKey.selectedOrganization);
      return;
    }

    this.#storage.set(StorageKey.selectedOrganization, organization);
  }

  setSelectedOrganizationRoleFromOrganizations(organizations: Organization[], organizationId: number): void {
    const selectedOrganization = organizations.find(organization => organization.id === organizationId);
    this.saveSelectedOrganization(selectedOrganization);
    this.setSelectedOrganizationRole(selectedOrganization?.userRoleInOrganization ?? null);
  }

  setPermissions(permissions: string[]): void {
    this.permissionsInOrganization = permissions;
  }

  setUserEmail(userEmail: string): void {
    this.#userEmail = userEmail;
  }

  setUserId(userId: number): void {
    if (isNaN(userId)) {
      throw new Error('User id must be a number');
    }
    this.#userId = userId;
  }

  #getMeUrl(): string {
    return `${environment.apiIamBaseUrl}/1.0/users/me`;
  }

  #requestMeRaw(): Observable<BaseResponse<UserData>> {
    if (this.#meRequest$ !== null) {
      return this.#meRequest$;
    }

    // shareReplay shares one in-flight /me request across concurrent subscribers.
    // finalize clears #meRequest$ when that request ends so later calls start a new GET.
    this.#meRequest$ = this.#http.get<BaseResponse<UserData>>(this.#getMeUrl()).pipe(
      finalize((): void => {
        this.#meRequest$ = null;
      }),
      shareReplay(1),
    );

    return this.#meRequest$;
  }

  #requestMe(): Observable<BaseResponse<User>> {
    return this.#requestMeRaw().pipe(
      map((result: BaseResponse<UserData>) => {
        const response = this.#userAdapter.fromApi(result);
        if (!response.data) {
          throw response.error || new Error('User not found');
        }
        return response;
      }),
    );
  }

  #getOrganizationParameters(parameters: UserOrganizationQuery): HttpParams {
    let params = new HttpParams();
    if (!parameters.omitPagination) {
      params = params.set('items_per_page', parameters.itemsPerPage ? parameters.itemsPerPage.toString() : 10);
      params = params.set('page', parameters.page ? parameters.page.toString() : 1);
    }
    params = params.set('include_deleted', parameters.showDeleted ? 'true' : 'false');
    params = params.set('include_booking_agents', parameters.showBookingAgents ? 'true' : 'false');
    if (parameters.includeRole === true) {
      params = params.set('include_role', 'true');
    }
    if (parameters.strictMembership === true) {
      params = params.set('strict_membership', 'true');
    }
    if (parameters.withPermission) {
      params = params.set('with_permission', parameters.withPermission);
    }
    if (parameters.search) {
      params = params.set('search', parameters.search.trim());
    }
    if (parameters.organizationCategory !== undefined) {
      params = params.set('organization_category', parameters.organizationCategory);
    }
    if (parameters.operatingPlatform !== undefined) {
      params = params.set('operating_platform', parameters.operatingPlatform);
    }
    if (parameters.organizationIds !== undefined && parameters.organizationIds.length > 0) {
      params = params.set('organization_ids', parameters.organizationIds.join(','));
    }
    return params;
  }

  #getOrganizationsUrl(userId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/users/${userId}/organizations`;
  }

  #getPermissionsInOrganizationUrl(organizationId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/organizations/${organizationId}/permissions`;
  }

  #saveNumberOfOrganizations(total: number | null): void {
    if (total === null) {
      localStorage.setItem(UserService.organizationCountKey, '0');
      return;
    }

    localStorage.setItem(UserService.organizationCountKey, JSON.stringify(total));
  }

  patchMe(body: { name: string }): Observable<BaseResponse<User | null>> {
    const path = this.#getMeUrl();

    return this.#http.patch(path, body, { observe: 'response' }).pipe(
      switchMap(() => this.getMe()),
      catchError(error => ErrorResponseUtils.getErrorResponse<User>(error)),
    );
  }

  #actingPartnerId(): number | undefined {
    if (this.partnerId !== undefined) {
      return this.partnerId;
    }

    return this.#storage.get<{ id?: number }>(StorageKey.partner)?.id ?? undefined;
  }

  #fetchBusinessDetailsForBusinessUser(userResponse: BaseResponse<User | null>): Observable<BaseResponse<User | null>> {
    if (!userResponse?.data) {
      return of(userResponse);
    }

    const user = userResponse.data;

    const partnerId = this.#actingPartnerId();
    if (this.#businessInitialization !== null && partnerId) {
      return this.#businessInitialization.initializeOrFallBack(user, partnerId, () => this.#userScopedBusinessEnrichment(userResponse));
    }

    // Nothing will attempt distributor initialization for this user, so settle the session here rather
    // than leave a gate waiting for an answer that is never coming.
    this.#distributorSession.markNotADistributor();

    return this.#userScopedBusinessEnrichment(userResponse);
  }

  #userScopedBusinessEnrichment(userResponse: BaseResponse<User | null>): Observable<BaseResponse<User | null>> {
    const user = userResponse.data;
    // `business` arrives as null, not undefined, when the account has none - /users/me returns it
    // that way. Treating only `undefined` as "nothing to enrich" sent those users into the fetch
    // below, which throws on a missing id.
    if (!user?.business) {
      return of(userResponse);
    }

    if (!this.#shouldFetchBusinessDetails()) {
      return of(new BaseResponse(user, null));
    }

    return this.#fetchBusinessDetailsFromUser(userResponse);
  }

  #fetchBusinessDetailsFromUser(userResponse: BaseResponse<User | null>): Observable<BaseResponse<User | null>> {
    const user = userResponse.data;
    if (!user) {
      return of(userResponse);
    }

    if (!user.business?.id || !this.partnerId) {
      throw new Error('Business user requires business ID and partner ID to fetch business details');
    }

    return this.#businessService
      .getMyBusiness({
        organizationId: this.partnerId,
        businessId: user.business.id,
        userId: user.id,
      })
      .pipe(
        map(businessResponse => {
          if (businessResponse.error) {
            throw businessResponse.error;
          }

          if (!businessResponse.data) {
            throw new Error('Business details fetch returned empty data');
          }

          if (businessResponse.data.channel === null || businessResponse.data.channel === undefined) {
            throw new Error('Business details missing required channel information');
          }

          if (businessResponse.data.hasCustomChannel === undefined || businessResponse.data.hasCustomChannel === null) {
            throw new Error('Business details missing has_custom_channel field');
          }

          user.business = businessResponse.data;
          return new BaseResponse(user, null);
        }),
        catchError(error => {
          return throwError(() => error);
        }),
      );
  }

  #shouldFetchBusinessDetails(): boolean {
    if (this.#selectedOrganizationRoleLabel === null) {
      return false;
    }

    return businessRoles.has(this.#selectedOrganizationRoleLabel);
  }

  #persistUserAndReturn(finalResponse: BaseResponse<User | null>): BaseResponse<User | null> {
    if (finalResponse?.data && !finalResponse.error) {
      this.user = finalResponse.data;
      localStorage.setItem(UserService.userKey, JSON.stringify(this.user));
      this.user$.next(this.user);
    }
    return finalResponse;
  }

  #readStoredUser(): string | null {
    try {
      return localStorage.getItem(UserService.userKey);
    } catch {
      return null;
    }
  }
}

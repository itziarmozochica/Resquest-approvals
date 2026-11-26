import { HttpClient, HttpContext, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { RoutePrimaryPath } from '@fz-original/app/app/enums/route.enum';
import { StorageKey } from '@fz-original/app/app/enums/storage.enum';
import { SsoLogin, SsoLoginData } from '@fz-original/app/core/authentication/sso-login.model';
import { PlanStateService } from '@fz-original/app/modules/reservation/services/plan-state.service';
import { ReservationBusinessChooseStateService } from '@fz-original/app/modules/reservation/services/reservation-state.service';
import { STORAGE_SERVICE } from '@fz/storage';
import { BehaviorSubject, combineLatest, defer, from, fromEvent, Observable, of, throwError } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, switchMap, take, tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { ReservationsFiltersService } from '../../modules/reservation/services/reservations-filters.service';
import { NfcPinTokenValidation } from '../../modules/user/set-nfc-pin-form/nfc-pin-token-validation.model';
import { UpdatePasswordData } from '../../modules/user/update-password-form/update-password-data';
import { WhitelabelAccessService } from '../../modules/whitelabel-management/services/whitelabel-access.service';
import { SKIP_AUTHENTICATION_INTERCEPTOR } from '../../shared/interceptors/skip-authentication.token';
import { SKIP_RETRY_INTERCEPTOR } from '../../shared/interceptors/skip-retry.token';
import { SKIP_SESSION_AUTHORIZATION } from '../../shared/interceptors/skip-session-authorization.token';
import { BaseErrorResponse, BaseResponse, BaseResponseDTO } from '../../shared/models/base-response';
import { SearchBarService } from '../../shared/search-bar/service/search-bar.service';
import { OrganizationPreferencesService } from '../../shared/services/organization-preferences/organization-preferences.service';
import { PartnerService } from '../../shared/services/partner/partner.service';
import { SurvicateService } from '../../shared/services/script-loader/survicate/survicate.service';
import { UserService } from '../../shared/services/user/user.service';
import { ErrorResponseUtils } from '../../shared/utils/error-response.utils';
import { BackofficeLoginAdapter } from './backoffice-login.adapter';
import { BackofficeLogin } from './backoffice-login.model';
import { ImpersonationMetadataService } from './impersonation-metadata.service';
import { isLogoutRouteUrl } from './is-logout-route-url.util';
import { loginNextStep } from './login-next-step.enum';
import { LoginAdapter } from './login.adapter';
import { Login, LoginData } from './login.model';
import { MfaAuthenticatedVerification, MfaAuthenticatedVerificationData } from './mfa-authenticated-verification.model';
import { MfaEnrollmentAdapter, toMfaEnrollment } from './mfa-enrollment.adapter';
import { MfaEnrollment, MfaEnrollmentData } from './mfa-enrollment.model';
import { MfaRecoveryAdapter } from './mfa-recovery.adapter';
import { MfaRecovery, MfaRecoveryData } from './mfa-recovery.model';
import { MfaVerificationAdapter } from './mfa-verification.adapter';
import { MfaVerification, MfaVerificationData } from './mfa-verification.model';
import { toOdooHandoffLogin } from './odoo-handoff-login.adapter';
import { OdooHandoffLogin, OdooHandoffLoginDto } from './odoo-handoff-login.model';
import { OneboxLoginAdapter } from './onebox-login.adapter';
import { OneboxLogin } from './onebox-login.model';
import { SessionTokenCookieStore } from './session-token-cookie.store';
import { SsoLoginAdapter } from './sso-login.adapter';
import { SsoPkceCodes } from './sso-pkce-codes.model';
import { SsoPkceService } from './sso-pkce.service';

/** Both NFC PIN calls run behind the full-screen spinner, so a hung request would strand the holder. */
const NFC_PIN_TIMEOUT_MS = '30000';

@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {
  static readonly defaultRedirectUrl = '/project-management/projects';
  #backofficeLoginAdapter = inject(BackofficeLoginAdapter);
  #ENROLLMENT_ID = 'enrollmentId';
  #httpClient = inject(HttpClient);
  readonly #impersonationMetadataService = inject(ImpersonationMetadataService);
  readonly #organizationPreferencesService = inject(OrganizationPreferencesService);
  #LOCAL_STORAGE_KEYS_TO_KEEP = [
    StorageKey.paymentConfig,
    StorageKey.kioskApi,
    StorageKey.skipPrice,
    StorageKey.adyenMobilePosSerial,
    StorageKey.impersonationActive,
    StorageKey.impersonatedUserName,
    StorageKey.impersonatedUserRole,
    StorageKey.impersonationSessionId,
    StorageKey.visibility,
    StorageKey.onsiteSetupConfig,
    StorageKey.dualScreen,
    StorageKey.entryPointClient,
    StorageKey.odooTillLockLink,
    StorageKey.zebraPrinter,
    StorageKey.shiftListPreferences,
    StorageKey.ossTourCompleted,
    StorageKey.recentOnsiteSetups,
    StorageKey.recentOrganizations,
    StorageKey.secondScreenCustomTextForLoggedOutBanner,
    StorageKey.closedDistributorGroupPublications,
    StorageKey.closedRunningDistributorGroupPublications,
    StorageKey.b2bPublishingOnboardingWelcomeSeen,
    StorageKey.contactSupportBannerDismissed,
    StorageKey.versionReloadAttempt,
  ];
  #loginAdapter = inject(LoginAdapter);
  #mfaEnrollmentAdapter = inject(MfaEnrollmentAdapter);
  #mfaRecoveryAdapter = inject(MfaRecoveryAdapter);
  #mfaVerificationAdapter = inject(MfaVerificationAdapter);
  #oneboxLoginAdapter = inject(OneboxLoginAdapter);
  #partnerService = inject(PartnerService);
  #planStateService = inject(PlanStateService);
  readonly #reservationBusinessChooseService = inject(ReservationBusinessChooseStateService);
  #reservationsFiltersService = inject(ReservationsFiltersService);
  #router = inject(Router);
  #searchBarService = inject(SearchBarService);
  #sessionTokenCookieStore = inject(SessionTokenCookieStore);
  #ssoLoginAdapter = inject(SsoLoginAdapter);
  readonly #ssoPkceService = inject(SsoPkceService);
  #storage = inject(STORAGE_SERVICE);
  #survicateService = inject(SurvicateService);
  #TOKEN_KEY = 'token';
  #USER_ID_KEY = 'userId';
  #USER_NAME_KEY = 'userName';
  #userInfo = new BehaviorSubject<number | null>(this.getUserId());
  #userName = new BehaviorSubject<string | null>(this.getUserName());
  #userService = inject(UserService);
  #whitelabelAccessService = inject(WhitelabelAccessService);

  applyToken(token: string, userId: number): void {
    this.#storage.set(this.#TOKEN_KEY, token);
    this.#storage.set(this.#USER_ID_KEY, userId);
    this.#userInfo.next(userId);
  }

  /**
   * Same persistence as {@link applyToken} without emitting on `observeUser()`.
   *
   * Used by the impersonation stop flow that reloads the page right after: emitting there would
   * kick off the logged-out teardown a few milliseconds before the reload replaces the app anyway.
   * It exists so the token still has a single write path through `STORAGE_SERVICE`.
   */
  applyTokenSilently(token: string, userId: number): void {
    this.#storage.set(this.#TOKEN_KEY, token);
    this.#storage.set(this.#USER_ID_KEY, userId);
  }

  backofficeLogin(token: string): Observable<BaseResponse<BackofficeLogin>> {
    const path = this.#getBackofficeLoginUrl();

    return this.#httpClient.post(path, { token }).pipe(
      switchMap((data: any): Observable<BaseResponse<BackofficeLogin>> => {
        const loginResponse = this.#backofficeLoginAdapter.fromApi(data);
        if (!loginResponse.data) {
          return throwError(() => ErrorResponseUtils.getErrorResponseError({ error: { error: {} } }));
        }
        this.#saveToken(loginResponse.data);
        return of(loginResponse);
      }),
      catchError(error => {
        return throwError(() => ErrorResponseUtils.getErrorResponseError(error));
      }),
    );
  }

  clearData(): void {
    if (environment.survicate.enable) {
      this.#survicateService.stop();
    }

    this.#partnerService.clearPartner();
    this.#userService.clearPermissions();
    this.#whitelabelAccessService.clear();
    this.#searchBarService.clearPlanList();
    this.#reservationsFiltersService.resetFilters();
    this.#planStateService.reset();
    this.#organizationPreferencesService.clear();

    this.#reservationBusinessChooseService.reset();

    this.#storage
      .keys()
      .filter(key => !this.#LOCAL_STORAGE_KEYS_TO_KEEP.map(storageKey => storageKey.toString()).includes(key))
      .forEach(key => this.#storage.remove(key));

    // Mirrors the token outside `STORAGE_SERVICE`, so `keys()` above cannot reach it.
    this.#sessionTokenCookieStore.clear();

    this.#userInfo.next(null);
    this.#userName.next(null);
  }

  clearDataForExternalLogin(): void {
    this.clearData();
    this.#impersonationMetadataService.clear();

    combineLatest([this.observeUserRemoved(), this.#partnerService.observePartnerRemoved()])
      .pipe(take(1))
      .subscribe(() => {});
  }

  createPassword(updatePasswordData: UpdatePasswordData): Observable<BaseResponse<any>> {
    const path = this.#getCreatePasswordUrl();
    return this.#httpClient.post(path, updatePasswordData, { observe: 'response' }).pipe(
      switchMap((response: HttpResponse<any>) => {
        if (response.status === 200) {
          return of(new BaseResponse({}, null));
        }
        let error = null;
        if (response.body.error) {
          error = { code: response.body.error.code, message: 'errors.generic' };
        }
        return of(new BaseResponse(null, error));
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<any>(error);
      }),
    );
  }
  getApiKey(): string | null {
    const apiKey = this.#storage.get(StorageKey.kioskApi);

    if (apiKey == null) {
      return null;
    }

    if (typeof apiKey !== 'string') {
      if (typeof apiKey === 'number' || typeof apiKey === 'boolean') {
        return String(apiKey);
      }

      return null;
    }

    return apiKey.trim() === '' ? null : apiKey;
  }

  getEnrollmentId(): string | null {
    return this.#storage.get(this.#ENROLLMENT_ID);
  }

  getToken(): string | null {
    return this.#storage.get(this.#TOKEN_KEY);
  }

  getUserId(): number | null {
    return this.#storage.get<number>(this.#USER_ID_KEY);
  }

  getUserName(): string | null {
    return this.#storage.get(this.#USER_NAME_KEY);
  }

  hasApiKey(): boolean {
    return this.getApiKey() !== null;
  }

  isLoggedIn(): boolean {
    return null !== this.getToken() || this.hasApiKey();
  }

  listenToApiKey(): Observable<string> {
    return fromEvent<StorageEvent>(window, 'storage').pipe(
      filter((event: StorageEvent) => event.key === StorageKey.kioskApi),
      map(e => e.newValue || ''),
      distinctUntilChanged((a, b) => a === b),
    );
  }

  login(username: string, password: string): Observable<BaseResponse<Login | null>> {
    const path = this.#getLoginUrl();
    return this.#httpClient.post(path, { password, username }).pipe(
      switchMap((data: any): Observable<BaseResponse<Login>> => {
        const loginResponse = this.#loginAdapter.fromApi(data);
        if (
          loginResponse.data?.nextStep === loginNextStep.mfaEnrollment ||
          loginResponse.data?.nextStep === loginNextStep.mfaVerification
        ) {
          this.#saveEnrollmentId(loginResponse.data);
        } else {
          this.#saveToken(loginResponse.data);
        }
        return of(loginResponse);
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<any>(error);
      }),
    );
  }

  /**
   * Logs out the user by calling the logout API endpoint and cleaning up user data.
   * Always runs cleanup (reset) even if the API call fails.
   * @returns Observable that emits true when logout completes
   */
  logout(): Observable<boolean> {
    return from(this.#router.navigate(['/logout'], { skipLocationChange: true })).pipe(
      switchMap((navigationSucceeded: boolean) => {
        if (!navigationSucceeded) {
          return of(false);
        }
        const path = this.#getLogoutUrl();
        return this.#httpClient.post(path, null).pipe(
          map(() => true),
          tap(() => {
            this.reset();
          }),
          catchError(() => {
            return of(false);
          }),
        );
      }),
    );
  }

  mfaAuthenticatedEnroll(): Observable<MfaEnrollment> {
    const path = this.#getMfaAuthenticatedEnrollUrl();
    return this.#httpClient.post<BaseResponseDTO<MfaEnrollmentData>>(path, null).pipe(
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
      map(response => {
        if (!response?.data) {
          throw ErrorResponseUtils.getErrorResponseError({ error: response });
        }
        return toMfaEnrollment(response.data);
      }),
    );
  }

  mfaAuthenticatedVerify(enrollmentId: string, code: string, rememberDevice: boolean = false): Observable<MfaAuthenticatedVerification> {
    const path = this.#getMfaAuthenticatedVerifyUrl();
    // Wrong TOTP returns HTTP 401 AUTHENTICATION_PROBLEM; skip the session-expired guard so the user stays logged in.
    // Verify is not idempotent: skip retry so a lost 200 is not replayed after the enrollment is already completed.
    const context = new HttpContext().set(SKIP_AUTHENTICATION_INTERCEPTOR, true).set(SKIP_RETRY_INTERCEPTOR, true);
    return this.#httpClient
      .post<BaseResponseDTO<MfaAuthenticatedVerificationData>>(path, this.#buildMfaVerifyBody(enrollmentId, code, rememberDevice), {
        context,
      })
      .pipe(
        catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
        map(response => {
          if (!response?.data) {
            throw ErrorResponseUtils.getErrorResponseError({ error: response });
          }
          return { recoveryCodes: response.data.recovery_codes };
        }),
      );
  }

  mfaEnroll(enrollmentId: string): Observable<BaseResponse<MfaEnrollment | null>> {
    const path = this.#getMfaEnrollUrl();
    return this.#httpClient.post<BaseResponse<MfaEnrollmentData>>(path, { enrollment_id: enrollmentId }).pipe(
      switchMap((data: BaseResponse<MfaEnrollmentData>): Observable<BaseResponse<MfaEnrollment>> => {
        const enrollmentResponse = this.#mfaEnrollmentAdapter.fromApi(data);
        return of(enrollmentResponse);
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<MfaEnrollment>(error);
      }),
    );
  }

  mfaRecoveryVerify(enrollmentId: string, recoveryCode: string): Observable<BaseResponse<MfaRecovery | null>> {
    const path = this.#getMfaRecoveryVerifyUrl();
    return this.#httpClient.post<BaseResponse<MfaRecoveryData>>(path, { code: recoveryCode, enrollment_id: enrollmentId }).pipe(
      switchMap((data: BaseResponse<MfaRecoveryData>): Observable<BaseResponse<MfaRecovery>> => {
        const recoveryResponse = this.#mfaRecoveryAdapter.fromApi(data);
        if (recoveryResponse.data) {
          const loginData: Login = {
            token: recoveryResponse.data.token,
            userId: recoveryResponse.data.userId,
          };
          this.#saveToken(loginData);
          this.#storage.remove(this.#ENROLLMENT_ID);
        }
        return of(recoveryResponse);
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<MfaRecovery>(error);
      }),
    );
  }

  mfaTotpVerify(enrollmentId: string, code: string, rememberDevice: boolean = false): Observable<BaseResponse<MfaVerification | null>> {
    const path = this.#getMfaTotpVerifyUrl();
    return this.#httpClient
      .post<BaseResponse<MfaVerificationData>>(path, this.#buildMfaVerifyBody(enrollmentId, code, rememberDevice))
      .pipe(
        switchMap((data: BaseResponse<MfaVerificationData>): Observable<BaseResponse<MfaVerification>> => {
          const verificationResponse = this.#mfaVerificationAdapter.fromApi(data);
          if (verificationResponse.data) {
            const loginData: Login = {
              token: verificationResponse.data.token,
              userId: verificationResponse.data.userId,
            };
            this.#saveToken(loginData);
            this.#storage.remove(this.#ENROLLMENT_ID);
          }
          return of(verificationResponse);
        }),
        catchError(error => {
          return ErrorResponseUtils.getErrorResponse<MfaVerification>(error);
        }),
      );
  }

  mfaVerify(enrollmentId: string, code: string, rememberDevice: boolean = false): Observable<BaseResponse<MfaVerification | null>> {
    const path = this.#getMfaVerifyUrl();
    return this.#httpClient
      .post<BaseResponse<MfaVerificationData>>(path, this.#buildMfaVerifyBody(enrollmentId, code, rememberDevice))
      .pipe(
        switchMap((data: BaseResponse<MfaVerificationData>): Observable<BaseResponse<MfaVerification>> => {
          const verificationResponse = this.#mfaVerificationAdapter.fromApi(data);
          if (verificationResponse.data) {
            const loginData: Login = {
              token: verificationResponse.data.token,
              userId: verificationResponse.data.userId,
            };
            this.#saveToken(loginData);
            this.#storage.remove(this.#ENROLLMENT_ID);
          }
          return of(verificationResponse);
        }),
        catchError(error => {
          return ErrorResponseUtils.getErrorResponse<MfaVerification>(error);
        }),
      );
  }

  nfcLogin(nfcUid: string, pin: string): Observable<BaseResponse<Login>> {
    const path = this.#getNfcLoginUrl();
    return this.#httpClient.post<BaseResponse<LoginData>>(path, { nfc_uid: nfcUid, pin }, { observe: 'response' }).pipe(
      switchMap((response: HttpResponse<BaseResponse<LoginData>>): Observable<BaseResponse<Login>> => {
        if (response.status !== 200 || response.body === null) {
          return throwError(() => ErrorResponseUtils.getErrorResponseError(response));
        }
        const loginResponse = this.#loginAdapter.fromApi(response.body);
        if (!loginResponse.data) {
          return throwError(() => ErrorResponseUtils.getErrorResponseError({ error: { error: {} } }));
        }
        return of(loginResponse);
      }),
      tap((loginResponse: BaseResponse<Login>) => {
        if (loginResponse.data) {
          this.#saveToken(loginResponse.data);
        }
      }),
      catchError(error => {
        return throwError(() => ErrorResponseUtils.getErrorResponseError(error));
      }),
    );
  }

  observeUser(): Observable<number | null> {
    return this.#userInfo.asObservable();
  }

  observeUserName(): Observable<string | null> {
    return this.#userName.asObservable();
  }

  observeUserRemoved(): Observable<number | null> {
    return this.#userInfo.asObservable().pipe(
      filter(userId => !userId),
      take(1),
    );
  }

  /**
   * Signs in the user Odoo hands off, keeping the session in place until b2b-iam answers.
   *
   * The stored session is never cleared while the exchange is in flight: the app boots with it and
   * its first authenticated requests are still running, and a request that finds no token makes the
   * authentication interceptor reset the session and navigate to `/login`, which cancels this
   * handoff's navigation. b2b-iam keeps one token per user, so the same user clicking again gets
   * the token the browser already holds: that session is kept as it is. A user with more than
   * box-office access is only let through when the browser already holds their own token, proven
   * with a password beforehand. Any other answer replaces the session, and a failed exchange drops
   * it, so the browser never stays signed in as someone Odoo no longer vouches for.
   */
  loginWithOdooHandoff(assertion: string): Observable<void> {
    return this.odooHandoffLogin(assertion).pipe(
      switchMap(login => {
        if (this.#isCurrentSession(login)) {
          return of(undefined);
        }

        return this.#startOdooHandoffSession(login);
      }),
      catchError(error => {
        this.clearDataForExternalLogin();
        return throwError(() => error);
      }),
    );
  }

  odooHandoffLogin(assertion: string): Observable<OdooHandoffLogin> {
    const path = this.#getOdooHandoffLoginUrl();
    const context = new HttpContext()
      .set(SKIP_AUTHENTICATION_INTERCEPTOR, true)
      .set(SKIP_RETRY_INTERCEPTOR, true)
      .set(SKIP_SESSION_AUTHORIZATION, this.#impersonationMetadataService.isImpersonating());
    const headers = this.#getOdooHandoffHeaders();

    return this.#httpClient.post<BaseResponseDTO<OdooHandoffLoginDto>>(path, { assertion }, { context, headers }).pipe(
      switchMap(data => {
        if (!data.data) {
          return throwError(() => ErrorResponseUtils.getErrorResponseError({ error: { error: {} } }));
        }

        return of(toOdooHandoffLogin(data.data));
      }),
      catchError(error => {
        return throwError(() => ErrorResponseUtils.getErrorResponseError(error));
      }),
    );
  }

  oneboxLogin(entityId: string, token: string): Observable<BaseResponse<OneboxLogin>> {
    const path = this.#getOneboxLoginUrl();
    return this.#httpClient.post(path, { entity_id: entityId, token }).pipe(
      switchMap((data: any): Observable<BaseResponse<OneboxLogin>> => {
        const loginResponse = this.#oneboxLoginAdapter.fromApi(data);
        if (!loginResponse.data) {
          return throwError(() => ErrorResponseUtils.getErrorResponseError({ error: { error: {} } }));
        }
        this.#saveToken(loginResponse.data);
        this.#storage.set(StorageKey.oneboxLogin, 'true');
        return of(loginResponse);
      }),
      catchError(error => {
        return throwError(() => ErrorResponseUtils.getErrorResponseError(error));
      }),
    );
  }

  redirectToLogin(state: { url?: string } = {}, partnerId?: number): void {
    if (
      this.#router.url.split('?')[0] === '/login' ||
      this.#router.url === `/${RoutePrimaryPath[RoutePrimaryPath['obo-second-screen']]}` ||
      this.#router.url.split('?')[0] === '/login/onebox' ||
      this.#router.url.split('?')[0] === '/login/backoffice' ||
      this.#router.url.split('?')[0] === '/login/handoff'
    ) {
      return;
    }

    const queryParams: { forcedPartnerId?: string; next?: string } = {};

    if (state.url !== undefined && state.url !== AuthenticationService.defaultRedirectUrl && !isLogoutRouteUrl(state.url)) {
      queryParams.next = state.url;
    }

    if (partnerId !== undefined) {
      queryParams.forcedPartnerId = partnerId.toString();
    }

    this.#router.navigate(['/login'], {
      state,
      ...(Object.keys(queryParams).length > 0 && { queryParams }),
    });
  }

  requestPassword(username: string): Observable<BaseResponse<boolean | null>> {
    const path = this.#getRequestPasswordUrl();

    return this.#httpClient.post(path, { username }, { observe: 'response' }).pipe(
      switchMap((response: HttpResponse<any>) => {
        if (response.status === 200) {
          return of(new BaseResponse(true, null));
        }
        let error = null;
        if (response.body.error) {
          error = { code: response.body.error.code, message: 'errors.generic' };
        }
        return of(new BaseResponse(null, error));
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<any>(error);
      }),
    );
  }

  reset(urlToPreserve?: string, partnerId?: number): void {
    this.clearData();
    this.#impersonationMetadataService.clear();

    combineLatest([this.observeUserRemoved(), this.#partnerService.observePartnerRemoved()])
      .pipe(take(1))
      .subscribe(() => {
        if (urlToPreserve) {
          this.redirectToLogin({ url: urlToPreserve }, partnerId);
        } else {
          this.redirectToLogin();
        }
      });
  }

  resetPassword(updatePasswordData: UpdatePasswordData): Observable<BaseResponse<boolean | null>> {
    const path = this.#getResetPasswordUrl();
    return this.#httpClient.post(path, updatePasswordData, { observe: 'response' }).pipe(
      switchMap((response: HttpResponse<any>) => {
        if (response.status === 200) {
          return of(new BaseResponse(true, null));
        }
        let error = null;
        if (response.body.error) {
          error = { code: response.body.error.code, message: 'errors.generic' };
        }
        return of(new BaseResponse(null, error));
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<any>(error);
      }),
    );
  }

  setUserId(userId: number): void {
    this.#storage.set(this.#USER_ID_KEY, userId);
  }

  setUserName(userName: string): void {
    this.#storage.set(this.#USER_NAME_KEY, userName);
    this.#userName.next(userName);
  }

  ssoLogin(username: string): Observable<BaseResponse<SsoLogin | null>> {
    return defer(() =>
      from(this.#ssoPkceService.generate()).pipe(
        switchMap(pkceCodes => this.#requestSsoLoginUrl(username, this.#keepVerifierFor(pkceCodes))),
      ),
    ).pipe(
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<any>(error);
      }),
    );
  }

  ssoLoginCallback(code: string): Observable<BaseResponse<Login | null>> {
    return defer(() => this.#httpClient.post(this.#getSsoLoginCallbackUrl(), this.#buildSsoCallbackBody(code))).pipe(
      switchMap((data: any): Observable<BaseResponse<Login>> => {
        const loginResponse = this.#loginAdapter.fromApi(data);
        this.#saveToken(loginResponse.data);
        return of(loginResponse);
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<any>(error);
      }),
    );
  }

  validateNfcPinToken(token: string): Observable<BaseResponse<NfcPinTokenValidation | null>> {
    const path = this.#getValidateNfcPinTokenUrl();
    return this.#httpClient
      .post<BaseResponseDTO<null>>(
        path,
        { token: token },
        {
          context: this.#emailedTokenContext(),
          headers: { timeout: NFC_PIN_TIMEOUT_MS },
          observe: 'response',
        },
      )
      .pipe(
        switchMap((response: HttpResponse<BaseResponseDTO<null>>) => {
          if (response.status === 200) {
            return of(new BaseResponse<NfcPinTokenValidation | null>({}, null));
          }
          return of(new BaseResponse<NfcPinTokenValidation | null>(null, this.#toNfcPinError(response)));
        }),
        catchError(error => {
          return ErrorResponseUtils.getErrorResponse<NfcPinTokenValidation | null>(error);
        }),
      );
  }

  setNfcPin(token: string, pin: string): Observable<BaseResponse<boolean | null>> {
    const path = this.#getSetNfcPinUrl();
    return this.#httpClient
      .post<BaseResponseDTO<boolean>>(
        path,
        { pin, token },
        {
          context: this.#emailedTokenContext(),
          headers: { timeout: NFC_PIN_TIMEOUT_MS },
          observe: 'response',
        },
      )
      .pipe(
        switchMap((response: HttpResponse<BaseResponseDTO<boolean>>) => {
          if (response.status === 200) {
            return of(new BaseResponse<boolean | null>(true, null));
          }
          return of(new BaseResponse<boolean | null>(null, this.#toNfcPinError(response)));
        }),
        catchError(error => {
          return ErrorResponseUtils.getErrorResponse<boolean | null>(error);
        }),
      );
  }

  validatePasswordToken(token: string): Observable<BaseResponse<any>> {
    const path = this.#getValidatePasswordTokenUrl();
    return this.#httpClient.post(path, { token: token }, { observe: 'response' }).pipe(
      switchMap((response: HttpResponse<any>) => {
        if (response.status === 200) {
          return of(new BaseResponse({}, null));
        }
        let error = null;
        if (response.body.error) {
          error = { code: response.body.error.code, message: 'errors.generic' };
        }
        return of(new BaseResponse(null, error));
      }),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<any>(error);
      }),
    );
  }

  /**
   * A stored verifier means the login in flight asked for a challenge, so it is the only thing this
   * has to look at. Reading the flag again here would break the round trip: the decision can come
   * from `?ofeat=sso_improvement`, and that parameter is not in the URL any more by the time the
   * identity provider sends the browser back.
   */
  #buildMfaVerifyBody(
    enrollmentId: string,
    code: string,
    rememberDevice: boolean,
  ): { code: string; enrollment_id: string; remember_device?: true } {
    if (rememberDevice) {
      return { code, enrollment_id: enrollmentId, remember_device: true };
    }
    return { code, enrollment_id: enrollmentId };
  }

  #buildSsoCallbackBody(code: string): { code: string; code_verifier?: string } {
    const codeVerifier = this.#ssoPkceService.consume();
    if (codeVerifier === null) {
      return { code };
    }
    return { code, code_verifier: codeVerifier };
  }

  #getBackofficeLoginUrl(): string {
    return environment.apiIamBaseUrl + '/1.0/login/backoffice';
  }

  #getCreatePasswordUrl(): string {
    return `${environment.apiIamBaseUrl}/1.0/users/create-password`;
  }

  #getLoginUrl(): string {
    return environment.apiIamBaseUrl + '/1.0/login';
  }

  #getLogoutUrl(): string {
    return environment.apiIamBaseUrl + '/1.0/users/' + this.#storage.get(this.#USER_ID_KEY) + '/logout';
  }

  #getMfaAuthenticatedEnrollUrl(): string {
    return `${environment.apiIamBaseUrl}/1.0/users/me/mfa/enroll`;
  }

  #getMfaAuthenticatedVerifyUrl(): string {
    return `${environment.apiIamBaseUrl}/1.0/users/me/mfa/enroll/verify`;
  }

  #getMfaEnrollUrl(): string {
    return environment.apiIamBaseUrl + '/1.0/mfa/enroll';
  }

  #getMfaRecoveryVerifyUrl(): string {
    return environment.apiIamBaseUrl + '/1.0/mfa/recovery/verify';
  }

  #getMfaTotpVerifyUrl(): string {
    return environment.apiIamBaseUrl + '/1.0/mfa/totp/verify';
  }

  #getMfaVerifyUrl(): string {
    return environment.apiIamBaseUrl + '/1.0/mfa/enroll/verify';
  }

  #getNfcLoginUrl(): string {
    return environment.apiIamBaseUrl + '/1.0/login/alternative/nfc-pin';
  }

  #getOneboxLoginUrl(): string {
    return environment.apiIamBaseUrl + '/1.0/login/onebox';
  }

  /**
   * b2b-iam lets a user with more than box-office access through only when the browser already holds
   * that user's own token, so the session token is attached here. An impersonation token is never
   * sent, since it proves nobody's password: `odooHandoffLogin()` also sets
   * `SKIP_SESSION_AUTHORIZATION` while impersonating, or `AddHeadersInterceptor` would attach it.
   */
  #getOdooHandoffHeaders(): HttpHeaders {
    const token = this.getToken();
    if (!token || this.#impersonationMetadataService.isImpersonating()) {
      return new HttpHeaders();
    }

    return new HttpHeaders({ Authorization: `B2bToken ${token}` });
  }

  #getOdooHandoffLoginUrl(): string {
    return `${environment.apiIamBaseUrl}/1.0/login/handoff`;
  }

  #getRequestPasswordUrl(): string {
    return environment.apiIamBaseUrl + '/1.0/users/request-password';
  }

  #getResetPasswordUrl(): string {
    return `${environment.apiIamBaseUrl}/1.0/users/reset-password`;
  }

  #getSsoLoginCallbackUrl(): string {
    return environment.apiIamBaseUrl + '/1.0/sso/login/callback';
  }

  #getSsoLoginUrl(): string {
    return environment.apiIamBaseUrl + '/1.0/sso/login';
  }

  /**
   * Two opt-outs, both required by the emailed link.
   *
   * Whoever opens it is signed out, so the session guard must not cancel the call. And the token is
   * single use, so the generic retry must not replay it: a TimeoutError carries no HTTP status, so
   * RetryInterceptor would treat a hung request as retryable and fire the POST up to
   * `httpMaxRetries` more times, each with a fresh 30s timer. An attempt the server did process but
   * whose response never arrived would spend the token, and the replay would then land the holder
   * on the expired page after they had in fact succeeded.
   */
  #emailedTokenContext(): HttpContext {
    return new HttpContext().set(SKIP_AUTHENTICATION_INTERCEPTOR, true).set(SKIP_RETRY_INTERCEPTOR, true);
  }

  #toNfcPinError(response: HttpResponse<BaseResponseDTO<unknown>>): BaseErrorResponse | null {
    const error = response.body?.error;
    return error ? { code: error.code, message: 'errors.generic' } : null;
  }

  #getSetNfcPinUrl(): string {
    return `${environment.apiIamBaseUrl}/1.0/users/set-nfc-pin`;
  }

  #getValidateNfcPinTokenUrl(): string {
    return `${environment.apiIamBaseUrl}/1.0/validate-nfc-pin-token`;
  }

  #getValidatePasswordTokenUrl(): string {
    return `${environment.apiIamBaseUrl}/1.0/validate-password-token`;
  }

  /**
   * The token is compared, not only the user: b2b-iam returns the token this browser already holds
   * for the same user, while an impersonation token or an expired one never matches, so both are
   * replaced instead of kept.
   */
  #isCurrentSession(login: OdooHandoffLogin): boolean {
    return (
      this.getToken() === login.token &&
      this.getUserId() === login.userId &&
      this.#partnerService.getActingOrganizationId() === login.organizationId
    );
  }

  /**
   * A challenge the identity provider binds to a verifier we could not persist is a login that
   * cannot be completed, so a storage that refused the write drops us back to the plain flow.
   */
  #keepVerifierFor(pkceCodes: SsoPkceCodes): SsoPkceCodes | null {
    return this.#ssoPkceService.store(pkceCodes.codeVerifier) ? pkceCodes : null;
  }

  #requestSsoLoginUrl(username: string, pkceCodes: SsoPkceCodes | null): Observable<BaseResponse<SsoLogin | null>> {
    const path = this.#getSsoLoginUrl();
    let params: HttpParams = new HttpParams().set('username', username).set('redirect_uri', environment.baseUrl + '/login');
    if (window.location.search) {
      params = params.set('state', window.location.search);
    }
    if (pkceCodes !== null) {
      params = params.set('code_challenge', pkceCodes.codeChallenge).set('code_challenge_method', 'S256');
    }
    const options: { params: HttpParams } = { params };
    return this.#httpClient.get<BaseResponse<SsoLoginData>>(path, options).pipe(
      switchMap((data: BaseResponse<SsoLoginData>): Observable<BaseResponse<SsoLogin>> => {
        const ssoLoginResponse = this.#ssoLoginAdapter.fromApi(data);
        if (pkceCodes !== null && !ssoLoginResponse.data?.redirectTo) {
          this.#ssoPkceService.forget();
        }
        return of(ssoLoginResponse);
      }),
    );
  }

  #saveEnrollmentId(loginResponse: Login | null): void {
    if (loginResponse === null) {
      return;
    }
    if (loginResponse.enrollmentId != null) {
      this.#storage.set(this.#ENROLLMENT_ID, loginResponse.enrollmentId);
    }
  }

  #saveToken(loginResponse: Login | null): void {
    if (loginResponse === null || loginResponse.token === null) {
      return;
    }
    this.applyToken(loginResponse.token, loginResponse.userId);
  }

  /** Clearing and applying the new token run back to back, so no request ever sees an empty session. */
  #startOdooHandoffSession(login: OdooHandoffLogin): Observable<void> {
    this.clearDataForExternalLogin();
    this.applyToken(login.token, login.userId);

    return this.#partnerService.get(login.organizationId).pipe(
      switchMap(response => {
        if (!response?.data) {
          return throwError(() => new Error('Organization not found'));
        }

        this.#partnerService.select(response.data);

        return defer(() => this.#userService.getPermissionsInOrganization()).pipe(map((): void => undefined));
      }),
    );
  }
}

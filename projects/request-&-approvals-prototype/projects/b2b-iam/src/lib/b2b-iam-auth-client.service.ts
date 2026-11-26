import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import type { BaseResponse, HttpErrorResponseWithBaseError } from '@fz/http-models';
import { STORAGE_SERVICE } from '@fz/storage';
import { catchError, finalize, map, of, tap, type Observable } from 'rxjs';

import { B2B_IAM_CONFIG } from './b2b-iam.config';
import {
  adaptAgreementPermissions,
  adaptBackofficeLogin,
  adaptCreatedOrganizationUser,
  adaptDistributor,
  adaptLogin,
  adaptMfaEnrollment,
  adaptMfaRecovery,
  adaptMfaVerification,
  adaptOneboxLogin,
  adaptOrganizationPermissions,
  adaptOrganizationRoles,
  adaptOrganizationUsers,
  adaptSsoLogin,
  adaptUser,
  adaptUserOrganizationListing,
  adaptUserOrganizations,
  agreementPermissions,
  backofficeLogin,
  createOrganizationUser,
  deactivateOrganizationUser,
  distributor,
  login,
  LoginNextStep,
  logout,
  me,
  mfaEnroll,
  mfaEnrollVerify,
  mfaRecoveryVerify,
  mfaTotpVerify,
  oneboxLogin,
  organizationPermissions,
  organizationRoles,
  organizationUsers,
  reactivateOrganizationUser,
  requestPassword,
  resetPassword,
  ssoLogin,
  ssoLoginCallback,
  toCreateOrganizationUserRequest,
  toUpdateDistributorRequest,
  toUpdateOrganizationUserRequest,
  updateDistributor,
  updateOrganizationUser,
  userOrganizations,
  validatePasswordToken,
  type AgreementPermission,
  type AgreementPermissionsApi,
  type AuthRequest,
  type BackofficeLogin,
  type BackofficeLoginApi,
  type CreatedOrganizationUser,
  type CreatedOrganizationUserApi,
  type CreateOrganizationUser,
  type Distributor,
  type DistributorApi,
  type Login,
  type LoginApi,
  type MfaEnrollment,
  type MfaEnrollmentApi,
  type MfaRecovery,
  type MfaRecoveryApi,
  type MfaVerification,
  type MfaVerificationApi,
  type OneboxLogin,
  type OneboxLoginApi,
  type OrganizationPermission,
  type OrganizationPermissionsApi,
  type OrganizationRole,
  type OrganizationRolesApi,
  type OrganizationRolesQuery,
  type OrganizationUsersApi,
  type OrganizationUsersPage,
  type OrganizationUsersQuery,
  type SsoLogin,
  type SsoLoginApi,
  type UpdateDistributor,
  type UpdateOrganizationUser,
  type User,
  type UserApi,
  type UserOrganization,
  type UserOrganizationListing,
  type UserOrganizationsApi,
  type UserOrganizationsFilter,
} from './core';

/**
 * Angular facade for the b2b-iam auth client.
 *
 * The only public entry point alongside `provideB2bIam`. It executes the
 * framework-free request descriptors (`core/requests`) via `HttpClient`,
 * prepends the configured `baseUrl`, sends the `X-Client-Version` header, and
 * maps each response through the functional adapters to a typed domain model.
 * The auth token (and the user id needed for logout) is persisted via the shared
 * `STORAGE_SERVICE` under the consumer-owned `tokenKey`, so B2BM never collides
 * with FeverZone's `'token'` (OQ-3 / R5).
 */
@Injectable()
export class B2bIamAuthClient {
  readonly #http = inject(HttpClient);
  readonly #config = inject(B2B_IAM_CONFIG);
  readonly #storage = inject(STORAGE_SERVICE);

  /**
   * Authenticates a backoffice user with a backoffice-issued token.
   * @param {string} token - Backoffice authentication token.
   * @returns {Observable<BaseResponse<BackofficeLogin>>} The authenticated backoffice session.
   */
  backofficeLogin(token: string): Observable<BaseResponse<BackofficeLogin>> {
    return this.#send<BackofficeLoginApi>(backofficeLogin(token)).pipe(
      map(adaptBackofficeLogin),
      tap(response => {
        this.#persist(response);
      }),
    );
  }

  /** Drop the persisted session token + user id (used by `refresh()`/`logout()`). */
  clearToken(): void {
    this.#storage.remove(this.#config.tokenKey);
    this.#storage.remove(this.#userIdKey());
  }

  /**
   * Adds a member to an organization via `POST /1.0/organizations/{organizationId}/users`, with access
   * to all of its resources. The member is active as soon as the call succeeds.
   * @param {number} organizationId - The organization the member joins.
   * @param {CreateOrganizationUser} user - The member's name, email and role id.
   * @returns {Observable<BaseResponse<CreatedOrganizationUser>>} The new member's id, or an error envelope.
   */
  createOrganizationUser(organizationId: number, user: CreateOrganizationUser): Observable<BaseResponse<CreatedOrganizationUser>> {
    return this.#send<CreatedOrganizationUserApi>(createOrganizationUser(organizationId, toCreateOrganizationUserRequest(user))).pipe(
      map(adaptCreatedOrganizationUser),
    );
  }

  /**
   * Stops a member from acting as the organization via
   * `POST /1.0/organizations/{organizationId}/users/{userId}/deactivate`.
   * @param {number} organizationId - The organization the member belongs to.
   * @param {number} userId - The member to deactivate.
   * @returns {Observable<BaseResponse<null>>} An empty envelope on success.
   */
  deactivateOrganizationUser(organizationId: number, userId: number): Observable<BaseResponse<null>> {
    return this.#send<null>(deactivateOrganizationUser(organizationId, userId));
  }

  /**
   * Starts MFA enrollment for a login that requires a second factor.
   * @param {string} enrollmentId - Enrollment identifier returned by a prior login step.
   * @returns {Observable<BaseResponse<MfaEnrollment>>} The enrollment challenge details.
   */
  enrollMfa(enrollmentId: string): Observable<BaseResponse<MfaEnrollment>> {
    return this.#send<MfaEnrollmentApi>(mfaEnroll(enrollmentId)).pipe(map(adaptMfaEnrollment));
  }

  /**
   * The permissions this organization resolves **for a counterparty**, via
   * `GET /1.0/organizations/{organizationId}/agreement-permissions?target_organization_id=…`.
   *
   * The reply is the **whole resolved set** for the `(organizationId, targetOrganizationId, user)`
   * triple, not a verdict on any single operation. Which member of it authorizes a given action is
   * the caller's rule, not this library's — nothing here names a permission, so a consumer's gate
   * can be renamed or re-scoped without a library release (invariant 7).
   *
   * `data === null` means *no answer* (the request failed, or the body carried none) and is
   * distinct from `data === []`, which means the engine resolved an empty set. A caller gating on
   * this must keep the two apart and fail closed on the first.
   */
  getAgreementPermissions(organizationId: number, targetOrganizationId: number): Observable<BaseResponse<AgreementPermission[]>> {
    return this.#send<AgreementPermissionsApi>(agreementPermissions(organizationId, targetOrganizationId)).pipe(
      map(adaptAgreementPermissions),
    );
  }

  /**
   * Fetches the distributor an organization is, via `GET /1.0/distributors/{organizationId}`.
   *
   * Keyed by organization id, so a consumer that already knows which organization it is in needs no
   * extra lookup. The reply carries the business and every partner config together, so a session
   * needs one request rather than two.
   *
   * A `404` with `ORGANIZATION_NOT_OF_EXPECTED_CATEGORY` means the organization is simply not a
   * distributor — use {@link isNotADistributorOrganization} to tell that apart from a real failure,
   * rather than treating every error as one.
   * @param {number} organizationId - The organization to look up, not the business id.
   * @param {HttpContext} [context] - Passed to the host's interceptors, e.g. so a caller that reads a `403` as an
   * answer can opt out of a generic error toast.
   * @returns {Observable<BaseResponse<Distributor>>} The distributor, or an error envelope.
   */
  getDistributor(organizationId: number, context?: HttpContext): Observable<BaseResponse<Distributor>> {
    return this.#send<DistributorApi>(distributor(organizationId), context).pipe(map(adaptDistributor));
  }

  /**
   * The roles an organization can assign, via `GET /1.0/organizations/{organizationId}/roles`.
   * @param {number} organizationId - The organization whose roles to list.
   * @param {OrganizationRolesQuery} query - Optional filters.
   * @returns {Observable<BaseResponse<OrganizationRole[]>>} The roles, or an error envelope.
   */
  getOrganizationRoles(organizationId: number, query: OrganizationRolesQuery = {}): Observable<BaseResponse<OrganizationRole[]>> {
    return this.#send<OrganizationRolesApi>(organizationRoles(organizationId, query)).pipe(map(adaptOrganizationRoles));
  }

  /**
   * One page of an organization's members, via `GET /1.0/organizations/{organizationId}/users`.
   * @param {number} organizationId - The organization whose members to list.
   * @param {OrganizationUsersQuery} query - 1-based page and page size.
   * @returns {Observable<BaseResponse<OrganizationUsersPage>>} The page and the total, or an error envelope.
   */
  getOrganizationUsers(organizationId: number, query: OrganizationUsersQuery = {}): Observable<BaseResponse<OrganizationUsersPage>> {
    return this.#send<OrganizationUsersApi>(organizationUsers(organizationId, query)).pipe(map(adaptOrganizationUsers));
  }

  /** Read the persisted session token, or `null` when none is stored. */
  getToken(): string | null {
    return this.#storage.get(this.#config.tokenKey);
  }

  /**
   * Reads the id of the authenticated user, persisted alongside the token at login.
   * @returns {string | null} The user id, or `null` when no session is stored.
   */
  getUserId(): string | null {
    return this.#storage.get(this.#userIdKey());
  }

  /**
   * Authenticates a user with username and password credentials.
   * @param {string} username - The user's login name.
   * @param {string} password - The user's password.
   * @returns {Observable<BaseResponse<Login>>} The authenticated session (or an MFA challenge).
   */
  login(username: string, password: string): Observable<BaseResponse<Login>> {
    return this.#send<LoginApi>(login(username, password)).pipe(
      map(adaptLogin),
      tap(response => {
        // Persist only on a completed login. An MFA-pending response may still
        // carry an interim token; storing it here would let the route guard
        // admit the user before they finish MFA (verifyMfa/recoverMfa persist
        // the real session token once the challenge is passed).
        if (!this.#isMfaPending(response.data)) {
          this.#persist(response);
        }
      }),
    );
  }

  /**
   * Invalidate the session server-side (`/1.0/users/{userId}/logout`) and clear the
   * locally-persisted token + user id. If no user id was stored, clears locally only.
   * @returns {Observable<BaseResponse<null>>} The logout result.
   */
  logout(): Observable<BaseResponse<null>> {
    const userId = this.#storage.get(this.#userIdKey());
    if (userId === null) {
      this.clearToken();
      return of<BaseResponse<null>>({ data: null, error: null });
    }
    return this.#send<null>(logout(userId)).pipe(
      finalize(() => {
        this.clearToken();
      }),
    );
  }

  /**
   * Fetches the current authenticated user via `GET /1.0/users/me` (mirrors the
   * FeverZone partners app). Requires a persisted session token, sent as
   * `Authorization: B2bToken <token>` by `#send`.
   * @returns {Observable<BaseResponse<User>>} The current user (name, email, business), or an error envelope.
   */
  me(): Observable<BaseResponse<User>> {
    return this.#send<UserApi>(me()).pipe(map(adaptUser));
  }

  /**
   * Authenticates a user through the Onebox flow for a given entity.
   * @param {string} entityId - Onebox entity identifier.
   * @param {string} token - Onebox-issued authentication token.
   * @returns {Observable<BaseResponse<OneboxLogin>>} The authenticated Onebox session.
   */
  oneboxLogin(entityId: string, token: string): Observable<BaseResponse<OneboxLogin>> {
    return this.#send<OneboxLoginApi>(oneboxLogin(entityId, token)).pipe(
      map(adaptOneboxLogin),
      tap(response => {
        this.#persist(response);
      }),
    );
  }

  organizationListing(userId: number, filter: UserOrganizationsFilter = {}): Observable<BaseResponse<UserOrganizationListing>> {
    return this.#send<UserOrganizationsApi>(userOrganizations(userId, filter)).pipe(map(adaptUserOrganizationListing));
  }

  organizationPermissions(organizationId: number): Observable<BaseResponse<OrganizationPermission[]>> {
    return this.#send<OrganizationPermissionsApi>(organizationPermissions(organizationId)).pipe(map(adaptOrganizationPermissions));
  }

  /**
   * Fetches the user's organizations via `GET /1.0/users/{userId}/organizations`, optionally
   * scoped by permission, organization type and category.
   * @param {number} userId - The authenticated user's id (from `me()`).
   * @param {UserOrganizationsFilter} filter - Optional permission/type/category scoping.
   * @returns {Observable<BaseResponse<UserOrganization[]>>} The user's organizations.
   */
  organizations(userId: number, filter: UserOrganizationsFilter = {}): Observable<BaseResponse<UserOrganization[]>> {
    return this.#send<UserOrganizationsApi>(userOrganizations(userId, filter)).pipe(map(adaptUserOrganizations));
  }

  /**
   * Lets a deactivated member act as the organization again via
   * `POST /1.0/organizations/{organizationId}/users/{userId}/reactivate`.
   * @param {number} organizationId - The organization the member belongs to.
   * @param {number} userId - The member to reactivate.
   * @returns {Observable<BaseResponse<null>>} An empty envelope on success.
   */
  reactivateOrganizationUser(organizationId: number, userId: number): Observable<BaseResponse<null>> {
    return this.#send<null>(reactivateOrganizationUser(organizationId, userId));
  }

  /**
   * Recovers access to an MFA-protected account using a recovery code.
   * @param {string} enrollmentId - MFA enrollment identifier.
   * @param {string} code - MFA recovery code.
   * @returns {Observable<BaseResponse<MfaRecovery>>} The recovery result.
   */
  recoverMfa(enrollmentId: string, code: string): Observable<BaseResponse<MfaRecovery>> {
    return this.#send<MfaRecoveryApi>(mfaRecoveryVerify(enrollmentId, code)).pipe(
      map(adaptMfaRecovery),
      tap(response => {
        this.#persist(response);
      }),
    );
  }

  /**
   * Refresh the session. b2b-iam has no confirmed refresh endpoint yet
   * (OQ-4 / WI-3 backend spike); until it lands, `refresh()` follows the agreed
   * fallback — drop the stored token and signal the consumer to re-authenticate.
   * @returns {Observable<BaseResponse<Login>>} A `401 reauth_required` envelope.
   */
  refresh(): Observable<BaseResponse<Login>> {
    this.clearToken();
    return of<BaseResponse<Login>>({ data: null, error: { code: 401, message: 'reauth_required' } });
  }

  /**
   * Requests a password-reset email for the given username/email.
   * @param {string} username - The account's login name.
   * @returns {Observable<BaseResponse<boolean>>} Whether the reset email was sent. No token is returned, so nothing is persisted.
   */
  requestPassword(username: string): Observable<BaseResponse<boolean>> {
    return this.#send<boolean>(requestPassword(username));
  }

  /**
   * Sets a new password using a reset token from the emailed link.
   * @param {string} password - The new password.
   * @param {string} token - The reset token from the emailed link.
   * @returns {Observable<BaseResponse<boolean>>} Whether the password was reset.
   */
  resetPassword(password: string, token: string): Observable<BaseResponse<boolean>> {
    return this.#send<boolean>(resetPassword(password, token));
  }

  /**
   * Initiates an SSO login and returns the provider redirect details.
   * @param {string} username - The user's login name.
   * @param {string} redirectUri - URI the SSO provider redirects back to after authentication.
   * @param {string} [state] - Optional opaque value echoed back on the callback (CSRF/state).
   * @returns {Observable<BaseResponse<SsoLogin>>} The SSO redirect payload.
   */
  ssoLogin(username: string, redirectUri: string, state?: string): Observable<BaseResponse<SsoLogin>> {
    return this.#send<SsoLoginApi>(ssoLogin(username, redirectUri, state)).pipe(map(adaptSsoLogin));
  }

  /**
   * Completes an SSO login by exchanging the provider callback code for a session.
   * @param {string} code - Authorization code returned by the SSO provider.
   * @returns {Observable<BaseResponse<Login>>} The authenticated session.
   */
  ssoLoginCallback(code: string): Observable<BaseResponse<Login>> {
    return this.#send<LoginApi>(ssoLoginCallback(code)).pipe(
      map(adaptLogin),
      tap(response => {
        // Same guard as login(): an SSO callback can also return an MFA-pending
        // step with an interim token, which must not be persisted as a session.
        if (!this.#isMfaPending(response.data)) {
          this.#persist(response);
        }
      }),
    );
  }

  /**
   * Updates the distributor's own business details via `PUT /1.0/distributors/{organizationId}`.
   *
   * The dark twin of the my-business update: the business is resolved from the organization, so the
   * path names no user and no business.
   * @param {number} organizationId - The distributor organization's id.
   * @param {UpdateDistributor} body - The business details to change; send only what changed.
   * @returns {Observable<BaseResponse<null>>} An empty envelope on success.
   */
  updateDistributor(organizationId: number, body: UpdateDistributor): Observable<BaseResponse<null>> {
    return this.#send<null>(updateDistributor(organizationId, toUpdateDistributorRequest(body)));
  }

  /**
   * Changes a member's name and role via `PUT /1.0/organizations/{organizationId}/users/{userId}`,
   * sending back the resource scope the member already has.
   * @param {number} organizationId - The organization the member belongs to.
   * @param {number} userId - The member to change.
   * @param {UpdateOrganizationUser} user - The member's name, current resource access type and new role id.
   * @returns {Observable<BaseResponse<null>>} An empty envelope on success.
   */
  updateOrganizationUser(organizationId: number, userId: number, user: UpdateOrganizationUser): Observable<BaseResponse<null>> {
    return this.#send<null>(updateOrganizationUser(organizationId, userId, toUpdateOrganizationUserRequest(user)));
  }

  /**
   * Validates a password-reset token before showing the set-password form.
   * @param {string} token - The reset token from the emailed link.
   * @returns {Observable<BaseResponse<null>>} An empty envelope; `error` set when the token is invalid/expired.
   */
  validatePasswordToken(token: string): Observable<BaseResponse<null>> {
    return this.#send<null>(validatePasswordToken(token));
  }

  /**
   * Verifies an MFA TOTP code for an existing enrollment.
   * @param {string} enrollmentId - MFA enrollment identifier.
   * @param {string} code - Time-based one-time passcode.
   * @returns {Observable<BaseResponse<MfaVerification>>} The verification result.
   */
  verifyMfa(enrollmentId: string, code: string): Observable<BaseResponse<MfaVerification>> {
    return this.#send<MfaVerificationApi>(mfaTotpVerify(enrollmentId, code)).pipe(
      map(adaptMfaVerification),
      tap(response => {
        this.#persist(response);
      }),
    );
  }

  /**
   * Verifies the TOTP code that confirms a new MFA enrollment.
   * @param {string} enrollmentId - MFA enrollment identifier.
   * @param {string} code - Time-based one-time passcode entered during enrollment.
   * @returns {Observable<BaseResponse<MfaVerification>>} The verification result.
   */
  verifyMfaEnrollment(enrollmentId: string, code: string): Observable<BaseResponse<MfaVerification>> {
    return this.#send<MfaVerificationApi>(mfaEnrollVerify(enrollmentId, code)).pipe(
      map(adaptMfaVerification),
      tap(response => {
        this.#persist(response);
      }),
    );
  }

  #buildHeaders(request: AuthRequest): Record<string, string> {
    const token = request.authenticated === true ? this.getToken() : null;
    return {
      'X-Client-Version': this.#config.clientVersion,
      ...(token !== null && token !== '' ? { Authorization: `B2bToken ${token}` } : {}),
    };
  }

  /**
   * A `204` carries no body, so the envelope is synthesised by `#send` rather than parsed.
   */
  #dispatch<T>(
    request: AuthRequest,
    url: string,
    headers: Record<string, string>,
    context?: HttpContext,
  ): Observable<BaseResponse<T> | null> {
    if (request.method === 'GET') {
      return this.#http.get<BaseResponse<T>>(url, { context, headers, params: request.query ?? {} });
    }

    if (request.method === 'PUT') {
      return this.#http.put<BaseResponse<T>>(url, request.body ?? {}, { context, headers });
    }

    return this.#http.post<BaseResponse<T>>(url, request.body ?? {}, { context, headers });
  }

  #isMfaPending(data: Login | null): boolean {
    return data?.nextStep === LoginNextStep.MfaVerification || data?.nextStep === LoginNextStep.MfaEnrollment;
  }

  #persist<T extends { token?: string | null; userId?: number }>(response: BaseResponse<T>): void {
    const data = response.data;
    if (data === null) {
      return;
    }
    if (typeof data.token === 'string' && data.token !== '') {
      this.#storage.set(this.#config.tokenKey, data.token);
    }
    if (typeof data.userId === 'number') {
      this.#storage.set(this.#userIdKey(), String(data.userId));
    }
  }

  #send<T>(request: AuthRequest, context?: HttpContext): Observable<BaseResponse<T>> {
    const url = `${this.#config.baseUrl}${request.path}`;
    const headers = this.#buildHeaders(request);
    const request$ = this.#dispatch<T>(request, url, headers, context);
    // b2b-iam returns the { data, error } envelope even on non-2xx responses.
    // Without this catchError those would reach consumers as a raw
    // HttpErrorResponse instead of a normalized BaseResponse.error — matching
    // the error handling in FeverZone's AuthenticationService (R6, no drift).
    //
    // The `map` reads an empty body as an empty envelope. `updateDistributor` and the member writes
    // answer 204 today, but this sits in the shared `#send`, so it holds for **every** verb: any
    // endpoint that ever replies with no body now yields `{ data: null, error: null }` rather than a
    // null reaching the consumer. That is deliberate — the alternative is each caller guarding — but
    // it does mean an unexpectedly empty response reads as a quiet success instead of failing loudly.
    return request$.pipe(
      map(response => response ?? { data: null, error: null }),
      catchError((error: HttpErrorResponse) => of(this.#toErrorResponse<T>(error))),
    );
  }

  #toErrorResponse<T>(error: HttpErrorResponse): BaseResponse<T> {
    const body = (error as HttpErrorResponseWithBaseError).error;
    return { data: null, error: body?.error ?? { code: error.status, message: error.message } };
  }

  #userIdKey(): string {
    return `${this.#config.tokenKey}.user-id`;
  }
}

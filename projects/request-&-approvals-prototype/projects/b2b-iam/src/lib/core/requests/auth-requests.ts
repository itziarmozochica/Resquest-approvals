/**
 * Framework-free request builders for the b2b-iam auth flows (B2BR-5291 · WI-4).
 *
 * Each builder is a standalone pure function (individually tree-shakeable) that
 * returns a transport-agnostic {@link AuthRequest} descriptor — an HTTP verb, a
 * path relative to the b2b-iam base URL (`/1.0/…`), and a body/query. The
 * Angular facade (WI-5) prepends `baseUrl` and executes it via `HttpClient`;
 * nothing here imports Angular (R4).
 *
 * Paths and payloads are a faithful copy of FeverZone's `AuthenticationService`
 * (extract-only) so behaviour cannot drift (R6). FZ keeps its own copy until
 * the cutover ticket (OQ-1 / WI-8).
 *
 * Request bodies/query use the b2b-iam wire format (snake_case); `camelcase` is
 * configured lib-wide with `properties: 'never'` (eslint.config.mjs), so wire
 * keys lint cleanly while variables/params stay camelCase.
 */
import type { AuthRequest } from '../models/auth-request.model';
import type { UpdateDistributorRequest } from '../models/distributor.model';
import type { OrganizationRolesQuery } from '../models/organization-role.model';
import type {
  CreateOrganizationUserRequest,
  OrganizationUsersQuery,
  UpdateOrganizationUserRequest,
} from '../models/organization-user.model';
import type { UserOrganizationsFilter } from '../models/user-organization.model';

/** The permissions an organization resolves for a **counterparty** → `adaptAgreementPermissions`. */
export function agreementPermissions(organizationId: number, targetOrganizationId: number): AuthRequest {
  return {
    authenticated: true,
    method: 'GET',
    path: `/1.0/organizations/${organizationId}/agreement-permissions`,
    query: { target_organization_id: String(targetOrganizationId) },
  };
}

export function organizationPermissions(organizationId: number): AuthRequest {
  return { authenticated: true, method: 'GET', path: `/1.0/organizations/${organizationId}/permissions` };
}

/** One page of an organization's members → `adaptOrganizationUsers`. Pages are 1-based. */
export function organizationUsers(organizationId: number, query: OrganizationUsersQuery = {}): AuthRequest {
  return {
    authenticated: true,
    method: 'GET',
    path: `/1.0/organizations/${organizationId}/users`,
    query: {
      items_per_page: String(query.itemsPerPage ?? 25),
      page: String(query.page ?? 1),
      ...(query.search === undefined || query.search === '' ? {} : { search: query.search }),
      ...(query.status === undefined ? {} : { status_in_organization: query.status }),
    },
  };
}

/** The roles an organization can assign → `adaptOrganizationRoles`. */
export function organizationRoles(organizationId: number, query: OrganizationRolesQuery = {}): AuthRequest {
  return {
    authenticated: true,
    method: 'GET',
    path: `/1.0/organizations/${organizationId}/roles`,
    ...(query.includeHidden === undefined ? {} : { query: { include_hidden: String(query.includeHidden) } }),
  };
}

/** Add a member to an organization → `adaptCreatedOrganizationUser`. */
export function createOrganizationUser(
  organizationId: number,
  body: CreateOrganizationUserRequest,
): AuthRequest<CreateOrganizationUserRequest> {
  return { authenticated: true, body, method: 'POST', path: `/1.0/organizations/${organizationId}/users` };
}

/** Change a member's name and role. */
export function updateOrganizationUser(
  organizationId: number,
  userId: number,
  body: UpdateOrganizationUserRequest,
): AuthRequest<UpdateOrganizationUserRequest> {
  return { authenticated: true, body, method: 'PUT', path: `/1.0/organizations/${organizationId}/users/${userId}` };
}

/** Stop a member from acting as the organization. */
export function deactivateOrganizationUser(organizationId: number, userId: number): AuthRequest {
  return { authenticated: true, method: 'POST', path: `/1.0/organizations/${organizationId}/users/${userId}/deactivate` };
}

/** Let a deactivated member act as the organization again. */
export function reactivateOrganizationUser(organizationId: number, userId: number): AuthRequest {
  return { authenticated: true, method: 'POST', path: `/1.0/organizations/${organizationId}/users/${userId}/reactivate` };
}

/** Backoffice token login → `adaptBackofficeLogin`. */
export function backofficeLogin(token: string): AuthRequest {
  return { body: { token }, method: 'POST', path: '/1.0/login/backoffice' };
}

/** Standard username/password login → `adaptLogin`. */
export function login(username: string, password: string): AuthRequest {
  return { body: { password, username }, method: 'POST', path: '/1.0/login' };
}

/** Invalidate the session token for a user (server-side logout). */
export function logout(userId: string): AuthRequest {
  return { authenticated: true, method: 'POST', path: `/1.0/users/${userId}/logout` };
}

/** Fetch the current authenticated user → `adaptUser`. Requires the session token. */
export function me(): AuthRequest {
  return { authenticated: true, method: 'GET', path: '/1.0/users/me' };
}

/**
 * The distributor an organization is, if it is one → `adaptDistributor`.
 *
 * Keyed by **organization** id, so a consumer that already knows which organization it is in needs
 * no extra lookup. A `404` carrying `ORGANIZATION_NOT_OF_EXPECTED_CATEGORY` means it is not a
 * distributor — see `isNotADistributorOrganization`.
 */
export function distributor(organizationId: number): AuthRequest {
  return { authenticated: true, method: 'GET', path: `/1.0/distributors/${organizationId}` };
}

/** Update the distributor's own business details. The dark twin of the my-business update. */
export function updateDistributor(organizationId: number, body: UpdateDistributorRequest): AuthRequest<UpdateDistributorRequest> {
  return { authenticated: true, body, method: 'PUT', path: `/1.0/distributors/${organizationId}` };
}

/**
 * Fetch the user's organizations → `adaptUserOrganizations`. Requires the session token.
 * `withPermission` resolves through the authorization engine (not the membership table), so it
 * reflects every access path; `organizationType` matters because the server scopes the
 * permission lookup to partner organizations when it is omitted; `includeBookingAgents` matters
 * because the server excludes distributor organizations from the listing when it is omitted;
 * `strict_membership` is always sent and defaults to `true` because the server drops the
 * membership scope for a superuser otherwise — pass `strictMembership: false` to opt out.
 */
export function userOrganizations(userId: number, filter: UserOrganizationsFilter = {}): AuthRequest {
  const query: Record<string, string> = { strict_membership: String(filter.strictMembership ?? true) };
  if (filter.withPermission !== undefined) {
    query.with_permission = filter.withPermission;
  }
  if (filter.organizationType !== undefined) {
    query.organization_type = filter.organizationType;
  }
  if (filter.organizationCategory !== undefined) {
    query.organization_category = filter.organizationCategory;
  }
  if (filter.includeBookingAgents !== undefined) {
    query.include_booking_agents = String(filter.includeBookingAgents);
  }
  if (filter.operatingPlatform !== undefined) {
    query.operating_platform = filter.operatingPlatform;
  }
  return { authenticated: true, method: 'GET', path: `/1.0/users/${userId}/organizations`, query };
}

/** Begin MFA enrollment → `adaptMfaEnrollment`. */
export function mfaEnroll(enrollmentId: string): AuthRequest {
  return { body: { enrollment_id: enrollmentId }, method: 'POST', path: '/1.0/mfa/enroll' };
}

/** Verify the enrollment OTP → `adaptMfaVerification`. */
export function mfaEnrollVerify(enrollmentId: string, code: string): AuthRequest {
  return { body: { code, enrollment_id: enrollmentId }, method: 'POST', path: '/1.0/mfa/enroll/verify' };
}

/** Verify an MFA recovery code → `adaptMfaRecovery`. */
export function mfaRecoveryVerify(enrollmentId: string, code: string): AuthRequest {
  return { body: { code, enrollment_id: enrollmentId }, method: 'POST', path: '/1.0/mfa/recovery/verify' };
}

/** Verify a TOTP code for an already-enrolled user → `adaptMfaVerification`. */
export function mfaTotpVerify(enrollmentId: string, code: string): AuthRequest {
  return { body: { code, enrollment_id: enrollmentId }, method: 'POST', path: '/1.0/mfa/totp/verify' };
}

/** Onebox login → `adaptOneboxLogin`. */
export function oneboxLogin(entityId: string, token: string): AuthRequest {
  return { body: { entity_id: entityId, token }, method: 'POST', path: '/1.0/login/onebox' };
}

/** Request a password-reset email for a username/email (send-reset). */
export function requestPassword(username: string): AuthRequest {
  return { body: { username }, method: 'POST', path: '/1.0/users/request-password' };
}

/** Set a new password using a reset token from the emailed link. */
export function resetPassword(password: string, token: string): AuthRequest {
  return { body: { password, token }, method: 'POST', path: '/1.0/users/reset-password' };
}

/**
 * SSO login → `adaptSsoLogin`. `redirectUri` is supplied by the consumer
 * (B2BM passes its own base URL) — the library stays app/domain-agnostic.
 * `state` mirrors FZ passing `window.location.search` when present.
 */
export function ssoLogin(username: string, redirectUri: string, state?: string): AuthRequest {
  return {
    method: 'GET',
    path: '/1.0/sso/login',
    query: {
      redirect_uri: redirectUri,
      username,
      ...(state !== undefined && state !== '' ? { state } : {}),
    },
  };
}

/** SSO callback exchange → `adaptLogin`. */
export function ssoLoginCallback(code: string): AuthRequest {
  return { body: { code }, method: 'POST', path: '/1.0/sso/login/callback' };
}

/** Validate a password-reset token before showing the set-password form. */
export function validatePasswordToken(token: string): AuthRequest {
  return { body: { token }, method: 'POST', path: '/1.0/validate-password-token' };
}

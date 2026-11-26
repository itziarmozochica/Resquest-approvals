/**
 * Internal barrel for the framework-free `core/` client layer (B2BR-5291 · WI-4).
 *
 * These symbols are consumed by the Angular facade (WI-5) and re-exported
 * selectively from the library's public API (`src/public-api.ts`). The `core/`
 * folder itself is NOT public and must never import `@angular/*` (R4).
 */

// enum
export { LoginNextStep } from './models/login-next-step.enum';

// models
export type { AgreementPermission, AgreementPermissionsApi } from './models/agreement-permissions.model';
export type { OrganizationPermission, OrganizationPermissionsApi } from './models/organization-permissions.model';
export type { OrganizationRole, OrganizationRoleApi, OrganizationRolesApi, OrganizationRolesQuery } from './models/organization-role.model';
export type {
  CreatedOrganizationUser,
  CreatedOrganizationUserApi,
  CreateOrganizationUser,
  CreateOrganizationUserRequest,
  OrganizationUser,
  OrganizationUserApi,
  OrganizationUserResourceAccessType,
  OrganizationUsersApi,
  OrganizationUsersPage,
  OrganizationUsersQuery,
  OrganizationUserStatus,
  UpdateOrganizationUser,
  UpdateOrganizationUserRequest,
} from './models/organization-user.model';
export type { Login, LoginApi } from './models/login.model';
export type { BackofficeLogin, BackofficeLoginApi } from './models/backoffice-login.model';
export type { OneboxLogin, OneboxLoginApi } from './models/onebox-login.model';
export type { SsoLogin, SsoLoginApi } from './models/sso-login.model';
export type { MfaEnrollment, MfaEnrollmentApi } from './models/mfa-enrollment.model';
export type { MfaRecovery, MfaRecoveryApi } from './models/mfa-recovery.model';
export type { MfaVerification, MfaVerificationApi } from './models/mfa-verification.model';
export type { User, UserApi, UserBusiness, UserBusinessApi } from './models/user.model';
export type {
  Distributor,
  DistributorApi,
  DistributorBusiness,
  DistributorCapability,
  DistributorCheckoutPath,
  DistributorPartnerConfig,
  UpdateDistributor,
  UpdateDistributorRequest,
} from './models/distributor.model';
export type {
  UserOrganization,
  UserOrganizationApi,
  UserOrganizationCategory,
  UserOrganizationListing,
  UserOrganizationOperatingPlatform,
  UserOrganizationPermission,
  UserOrganizationsApi,
  UserOrganizationsFilter,
  UserOrganizationType,
} from './models/user-organization.model';

// adapters (plain functions — no AdapterInterface / fromApi class)
export { adaptAgreementPermissions } from './adapters/adapt-agreement-permissions';
export { adaptOrganizationPermissions } from './adapters/adapt-organization-permissions';
export { adaptOrganizationRoles } from './adapters/adapt-organization-roles';
export { adaptCreatedOrganizationUser, adaptOrganizationUsers } from './adapters/adapt-organization-users';
export { toCreateOrganizationUserRequest, toUpdateOrganizationUserRequest } from './adapters/to-organization-user-request';
export { adaptLogin } from './adapters/adapt-login';
export { adaptBackofficeLogin } from './adapters/adapt-backoffice-login';
export { adaptOneboxLogin } from './adapters/adapt-onebox-login';
export { adaptSsoLogin } from './adapters/adapt-sso-login';
export { adaptMfaEnrollment } from './adapters/adapt-mfa-enrollment';
export { adaptMfaRecovery } from './adapters/adapt-mfa-recovery';
export { adaptMfaVerification } from './adapters/adapt-mfa-verification';
export { adaptUser } from './adapters/adapt-user';
export { adaptDistributor } from './adapters/adapt-distributor';
export { toUpdateDistributorRequest } from './adapters/to-update-distributor-request';
export { isNotADistributorOrganization, NOT_A_DISTRIBUTOR_CODE } from './models/distributor-error';
export { adaptUserOrganizationListing, adaptUserOrganizations } from './adapters/adapt-user-organizations';

// request builders (standalone pure functions — individually tree-shakeable)
export {
  agreementPermissions,
  organizationPermissions,
  organizationRoles,
  organizationUsers,
  createOrganizationUser,
  updateOrganizationUser,
  deactivateOrganizationUser,
  reactivateOrganizationUser,
  backofficeLogin,
  distributor,
  updateDistributor,
  login,
  logout,
  me,
  mfaEnroll,
  mfaEnrollVerify,
  mfaRecoveryVerify,
  mfaTotpVerify,
  oneboxLogin,
  requestPassword,
  resetPassword,
  ssoLogin,
  ssoLoginCallback,
  userOrganizations,
  validatePasswordToken,
} from './requests/auth-requests';
export type { AuthRequest, HttpMethod } from './models/auth-request.model';

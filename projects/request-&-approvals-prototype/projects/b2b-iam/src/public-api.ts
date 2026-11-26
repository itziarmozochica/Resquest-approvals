/**
 * Public API of the @fz/b2b-iam client library (B2BR-5291).
 *
 * Consumers use `provideB2bIam(...)` + the `B2bIamAuthClient` facade, plus the
 * typed domain models and the `LoginNextStep` enum to type responses and branch
 * on the next step. Nothing from `src/lib/core/**` internals (adapters, request
 * builders) is public.
 *
 *   - WI-5: `B2bIamAuthClient` facade, `provideB2bIam` + `B2B_IAM_CONFIG`
 *   - WI-6: token persistence (via the shared `STORAGE_SERVICE`) + `refresh()`
 *   - WI-15: `getAgreementPermissions()` — the resolved permission set for a
 *     `(organization, target organization, user)` triple; no permission name is exported.
 */
export { B2bIamAuthClient } from './lib/b2b-iam-auth-client.service';
export { provideB2bIam } from './lib/provide-b2b-iam';
export { B2B_IAM_CONFIG, type B2bIamConfig } from './lib/b2b-iam.config';

// Result contract: consumers need these to type responses and branch on next step.
export type { BaseResponse } from '@fz/http-models';
export { isNotADistributorOrganization, LoginNextStep, NOT_A_DISTRIBUTOR_CODE } from './lib/core';
export type {
  AgreementPermission,
  BackofficeLogin,
  Distributor,
  DistributorBusiness,
  DistributorCapability,
  DistributorCheckoutPath,
  DistributorPartnerConfig,
  UpdateDistributor,
  Login,
  MfaEnrollment,
  MfaRecovery,
  MfaVerification,
  OneboxLogin,
  SsoLogin,
  User,
  UserBusiness,
  OrganizationPermission,
  CreatedOrganizationUser,
  CreateOrganizationUser,
  OrganizationRole,
  OrganizationRolesQuery,
  OrganizationUser,
  OrganizationUsersPage,
  OrganizationUsersQuery,
  OrganizationUserStatus,
  UpdateOrganizationUser,
  UserOrganization,
  UserOrganizationCategory,
  UserOrganizationListing,
  UserOrganizationOperatingPlatform,
  UserOrganizationPermission,
  UserOrganizationsFilter,
  UserOrganizationType,
} from './lib/core';

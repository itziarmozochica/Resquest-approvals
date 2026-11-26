/** Raw (snake_case) SSO-login envelope as returned by the b2b-iam auth API. */
export interface SsoLoginApi {
  /** IdP redirect URL for an SSO-enabled account; `null`/empty for a non-SSO email. */
  redirect_to: string | null;
}

/** Domain (camelCase) SSO-login result consumed by b2b-iam clients. */
export interface SsoLogin {
  /** IdP redirect URL for an SSO-enabled account; `null`/empty for a non-SSO email. */
  redirectTo: string | null;
}

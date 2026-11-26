/** The shape b2b-iam enforces on both PKCE codes: RFC 7636's unreserved set, 43 to 128 characters. */
export const SSO_PKCE_CODE_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/;

export interface SsoPkceCodes {
  codeChallenge: string;
  codeVerifier: string;
}

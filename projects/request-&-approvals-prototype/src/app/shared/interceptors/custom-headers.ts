/**
 * Custom (non CORS-safelisted) request headers the app attaches to internal
 * requests via the AddHeadersInterceptor. Shared so both the interceptor and
 * the b2b-iam CORS preflight E2E test rely on the same source of truth.
 */
export const CUSTOM_HEADERS = {
  authorization: 'Authorization',
  clientVersion: 'X-Client-Version',
  apiKey: 'x-api-key',
  applicationId: 'X-Application-Id',
} as const;

export const CUSTOM_HEADER_NAMES: readonly string[] = Object.values(CUSTOM_HEADERS);

/**
 * Names the organization the caller is acting in, for routes built to the B2BM contract: those name
 * the *resource* in the path, so the acting organization travels in a header instead.
 *
 * Added by `scopedOrganizationInterceptor` on its allowlisted base URLs, and deliberately outside
 * `CUSTOM_HEADERS` / `CUSTOM_HEADER_NAMES`, which every internal request carries.
 */
export const SCOPED_ORGANIZATION_HEADER = 'X-Scoped-Organization-Id';

/** HTTP verbs used by the b2b-iam auth request builders. */
export type HttpMethod = 'GET' | 'POST' | 'PUT';

/**
 * Transport-agnostic descriptor for a single b2b-iam auth request. The Angular
 * facade (WI-5) prepends `baseUrl` and executes it via `HttpClient`; nothing
 * about it depends on a transport, so `core/` stays framework-free (R4).
 */
export interface AuthRequest<TBody = unknown> {
  /** HTTP verb to issue the request with. */
  method: HttpMethod;
  /** Path relative to the b2b-iam base URL, e.g. `/1.0/login`. */
  path: string;
  /** Send the persisted session token as `Authorization: B2bToken <token>`. Defaults to false. */
  authenticated?: boolean;
  /** Request body in the b2b-iam wire format (snake_case), when present. */
  body?: TBody;
  /** Query-string parameters (wire format), when present. */
  query?: Record<string, string>;
}

const SENSITIVE_QUERY_PARAM_PATTERN = /([?&])(code|state|token)(?:=[^&#]*)?(?=[&#]|$)/gi;

export function redactSensitiveQueryParams(url: string): string {
  return url.replace(SENSITIVE_QUERY_PARAM_PATTERN, '$1$2=[redacted]');
}

const OTOKEN_PARAM = 'otoken';

/**
 * Extracts the `otoken` (order-group access token) query parameter from a
 * booking-portal URL.
 *
 * The backend returns the portal link with the token embedded as `?otoken=...`.
 * The kiosk reads it from that URL to drive the native booking screens.
 * Absolute URLs are parsed with the `URL` API; anything the `URL` constructor
 * cannot parse (e.g. a relative URL) falls back to reading the query string.
 *
 * @param url - The booking-portal URL (may be empty/null/undefined).
 * @returns The otoken, or `null` when absent.
 */
export function extractOtokenFromUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).searchParams.get(OTOKEN_PARAM) || null;
  } catch {
    return extractOtokenFromQuery(url);
  }
}

function extractOtokenFromQuery(url: string): string | null {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) {
    return null;
  }
  const query = url.slice(queryStart + 1).split('#')[0];
  return new URLSearchParams(query).get(OTOKEN_PARAM) || null;
}

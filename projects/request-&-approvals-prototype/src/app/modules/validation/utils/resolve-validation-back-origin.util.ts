import { ModifiedOrderModeEnum } from '../../box-office/one-stop-shop/models/oss-modified-order-mode.model';

const VALIDATION_PATH = '/validation';
const SKIP_PATH_PREFIXES = [VALIDATION_PATH, '/login', '/logout', '/reschedule', '/cancellation'] as const;
const OPENER_PATH_PREFIXES = [
  '/order-list',
  '/attendees',
  '/box-office/purchased-cart',
  '/box-office/shift',
  '/asset-based/calendar',
  '/asset-based/calendar-list',
] as const;
const BOX_OFFICE_PATH = '/box-office';
const BOX_OFFICE_MODE_QUERY_PARAM = 'mode';
const SKIP_BOX_OFFICE_MODES = new Set<string>(Object.values(ModifiedOrderModeEnum));

export interface ResolveValidationBackOriginOptions {
  fromScan?: boolean;
}

function parseHistoryUrl(url: string): URL {
  return new URL(url, 'http://local.invalid');
}

function matchesPathPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function shouldSkipHistoryUrl(url: string, currentUrl: string): boolean {
  if (url === currentUrl) {
    return true;
  }

  const { pathname, searchParams } = parseHistoryUrl(url);

  if (matchesPathPrefix(pathname, SKIP_PATH_PREFIXES)) {
    return true;
  }

  if (pathname === BOX_OFFICE_PATH) {
    const mode = searchParams.get(BOX_OFFICE_MODE_QUERY_PARAM);
    if (mode !== null && SKIP_BOX_OFFICE_MODES.has(mode)) {
      return true;
    }
  }

  return false;
}

export function isValidationUrl(url: string): boolean {
  return matchesPathPrefix(parseHistoryUrl(url).pathname, [VALIDATION_PATH]);
}

export function resolveValidationBackOrigin(
  history: readonly string[],
  currentUrl: string,
  { fromScan = false }: ResolveValidationBackOriginOptions = {},
): string | undefined {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const url = history[index];
    if (shouldSkipHistoryUrl(url, currentUrl)) {
      continue;
    }
    return fromScan || matchesPathPrefix(parseHistoryUrl(url).pathname, OPENER_PATH_PREFIXES) ? url : undefined;
  }

  return undefined;
}

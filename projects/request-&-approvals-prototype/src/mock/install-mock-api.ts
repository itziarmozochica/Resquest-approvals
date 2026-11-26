import { mockRoutes, type MockRequest, type MockResponse } from './routes';
import { PARTNER_ID, USER_ID } from './data';

const API_LIKE = /\/(api|api-[a-z-]+|apigw|agents|efr)\/|\/\d\.\d\//;
const jsonHeaders = 'content-type: application/json\r\n';

function resolve(req: MockRequest): MockResponse | null {
  const target = req.url.pathname + req.url.search;
  for (const route of mockRoutes) {
    if (route.method && route.method !== req.method) {
      continue;
    }
    const match = target.match(route.test);
    if (match) {
      return route.handler(req, match);
    }
  }
  if (API_LIKE.test(req.url.pathname)) {
    console.warn(`[mock-api] not implemented: ${req.method} ${req.url.pathname}${req.url.search}`);
    return { status: 404, body: { data: null, error: { message: 'mock-api: not implemented' } } };
  }
  return null;
}

function parseBody(body: unknown): unknown {
  if (typeof body !== 'string') {
    return null;
  }
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function patchXhr(): void {
  const proto = XMLHttpRequest.prototype;
  const originalOpen = proto.open;
  const originalSend = proto.send;
  const originalSetHeader = proto.setRequestHeader;

  proto.open = function (this: XMLHttpRequest & { __mock?: { method: string; url: string } }, method: string, url: string | URL, ...rest: unknown[]): void {
    this.__mock = { method: method.toUpperCase(), url: String(url) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (originalOpen as any).call(this, method, url, ...rest);
  };
  proto.setRequestHeader = function (this: XMLHttpRequest, name: string, value: string): void {
    originalSetHeader.call(this, name, value);
  };
  proto.send = function (this: XMLHttpRequest & { __mock?: { method: string; url: string } }, body?: Document | XMLHttpRequestBodyInit | null): void {
    const info = this.__mock;
    if (!info) {
      return originalSend.call(this, body);
    }
    let url: URL;
    try {
      url = new URL(info.url, window.location.href);
    } catch {
      return originalSend.call(this, body);
    }
    const response = resolve({ method: info.method, url, body: parseBody(body) });
    if (!response) {
      return originalSend.call(this, body);
    }
    const text = JSON.stringify(response.body);
    const status = response.status ?? 200;
    const xhr = this;
    const define = (name: string, value: unknown): void => {
      Object.defineProperty(xhr, name, { configurable: true, get: () => value });
    };
    setTimeout(() => {
      define('readyState', 4);
      define('status', status);
      define('statusText', status === 200 ? 'OK' : 'Error');
      define('responseURL', url.href);
      define('response', xhr.responseType === 'json' ? response.body : text);
      define('responseText', text);
      xhr.getAllResponseHeaders = (): string => jsonHeaders;
      xhr.getResponseHeader = (name: string): string | null => (name.toLowerCase() === 'content-type' ? 'application/json' : null);
      xhr.dispatchEvent(new Event('readystatechange'));
      xhr.dispatchEvent(new ProgressEvent('load'));
      xhr.dispatchEvent(new ProgressEvent('loadend'));
    }, 10);
  };
}

function patchFetch(): void {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase();
    const response = resolve({ method, url: new URL(raw, window.location.href), body: parseBody(init?.body) });
    if (!response) {
      return await originalFetch(input, init);
    }
    return new Response(JSON.stringify(response.body), { status: response.status ?? 200, headers: { 'content-type': 'application/json' } });
  };
}

/**
 * Pre-seeds the session so the app opens already logged in, with its one organisation already selected.
 * Overwritten on every load on purpose: a browser that once ran the real app must not keep a real partner here.
 */
function seedSession(): void {
  const organization: Record<string, unknown> = {
    id: PARTNER_ID,
    name: 'Fever Demo Partner',
    countryCode: 'ES',
    cityCode: 1023191,
    type: 'partner',
    deletedAt: null,
    userRoleInOrganization: null,
    category: 'partners',
  };
  const partner: Record<string, unknown> = {
    id: PARTNER_ID,
    name: 'Fever Demo Partner',
    email: 'noreply@example.com',
    brand: { kioskLogoHeader: null, feverzoneLogoHeader: null },
    type: 'partner',
    currency: 'EUR',
    currencies: ['EUR', 'GBP', 'USD'],
    terminology: null,
    countryCode: 'ES',
    hasMemberships: false,
    hasMemberAccounts: false,
    isBillingPeriodsActive: false,
    externalId: null,
    externalProvider: null,
  };
  try {
    localStorage.setItem('token', 'mock-token');
    localStorage.setItem('userId', String(USER_ID));
    localStorage.setItem('selected-organization', JSON.stringify(organization));
    localStorage.setItem('partner', JSON.stringify(partner));
    localStorage.setItem('organization_count', '1');
    localStorage.removeItem('business-as-organization-session');
  } catch {
    // storage blocked: the (mocked) login page still works with any credentials
  }
}

export function installMockApi(): void {
  patchXhr();
  patchFetch();
  seedSession();
}

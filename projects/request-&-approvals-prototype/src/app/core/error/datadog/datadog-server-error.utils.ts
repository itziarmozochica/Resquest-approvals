import { HttpStatusCode } from '@angular/common/http';

import { RumEvent, RumResourceEvent } from '@datadog/browser-rum-slim';

import { environment } from '../../../../environments/environment';

const FIRST_PARTY_BASE_URLS = [
  environment.accessControlApiBaseUrl,
  environment.apiBaseUrl,
  environment.apiGWBaseUrl,
  environment.apiIamBaseUrl,
  environment.agentsBaseUrl,
  environment.apiB2cSiteBaseUrl,
  environment.notificationsInboxApiBaseUrl,
  environment.adsApiBaseUrl,
  environment.crmApiBaseUrl,
];

export function isIndexedResourceEvent(event: RumEvent): event is RumResourceEvent {
  return event.type === 'resource' && !event._dd?.discarded;
}

export function isRequestResource(event: RumResourceEvent): boolean {
  return event.resource.type === 'xhr' || event.resource.type === 'fetch';
}

export function isFirstPartyRequest(event: RumResourceEvent): boolean {
  return FIRST_PARTY_BASE_URLS.some(baseUrl => event.resource.url.startsWith(baseUrl));
}

export function isServerError(event: RumResourceEvent): boolean {
  return (event.resource.status_code ?? 0) >= HttpStatusCode.InternalServerError;
}

export function isHeadlessBrowser(): boolean {
  return window.navigator.userAgent.toLowerCase().includes('headless');
}

export function stripUrlParams(url: string): string {
  try {
    const { origin, pathname } = new URL(url);
    return origin + pathname;
  } catch {
    return url;
  }
}

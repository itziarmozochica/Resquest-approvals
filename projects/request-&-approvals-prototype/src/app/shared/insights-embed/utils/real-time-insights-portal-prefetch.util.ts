import { DestroyRef } from '@angular/core';

/** Marks the `<link>` this util owns, so a second Real Time screen does not append a duplicate. */
export const REAL_TIME_INSIGHTS_PORTAL_DNS_PREFETCH_ATTRIBUTE = 'data-app-real-time-insights-portal-dns-prefetch';

/**
 * The origin is received, not computed, so `RealTimeEmbeddedMessagingService` stays the only place
 * deriving it from the environment. Call it from the page, not from the iframe wrapper: prefetching
 * at the moment the iframe is created gains nothing.
 */
export function setupRealTimeInsightsPortalDnsPrefetch(portalOrigin: string, destroyRef: DestroyRef): void {
  if (document.head.querySelector<HTMLLinkElement>(`link[${REAL_TIME_INSIGHTS_PORTAL_DNS_PREFETCH_ATTRIBUTE}]`) !== null) {
    return;
  }

  const link = document.createElement('link');
  link.rel = 'dns-prefetch';
  link.href = portalOrigin;
  link.setAttribute(REAL_TIME_INSIGHTS_PORTAL_DNS_PREFETCH_ATTRIBUTE, '');
  document.head.appendChild(link);

  destroyRef.onDestroy(() => {
    link.remove();
  });
}

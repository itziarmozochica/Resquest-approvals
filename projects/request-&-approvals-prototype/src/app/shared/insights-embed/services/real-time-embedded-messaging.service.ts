import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { environment } from '@fz-original/environments/environment';
import { TranslateService } from '@ngx-translate/core';
import { fromEvent, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { INSIGHTS_EMBED_LANGUAGE_QUERY_PARAM } from '../models/insights-embed-language';
import { INSIGHTS_EMBED_THEME_QUERY_PARAM, InsightsEmbedTheme } from '../models/insights-embed-theme';
import { RealTimeFiltersEmbeddedSelection } from '../models/real-time-embedded-selection.model';

/**
 * The `postMessage` channel shared by every screen that embeds the Insights Portal (PRD-4267): the
 * `/reports/real-time/*` routes and 360's Real Time tabs. Since PRD-4859 removed 360's own copy it is
 * the only one, so `FEVERZONE_EMBEDDED_READY` and the `b2b_embedded_auth_token` cookie are named in
 * exactly one place on this side — a rename on the portal side now breaks one file, not two.
 */
@Injectable({ providedIn: 'root' })
export class RealTimeEmbeddedMessagingService {
  static readonly filtersUpdateMessageType = 'FEVERZONE_EMBEDDED_FILTERS_UPDATE';
  static readonly iframeReadyMessageType = 'FEVERZONE_EMBEDDED_READY';

  readonly #translate = inject(TranslateService);

  readonly portalOrigin = new URL(environment.insightsDashboardsPortalBaseUrl).origin;

  /**
   * A signal, so a language switch rebuilds the URL and reloads the frame: the portal reads the
   * language once off its route snapshot, so nothing short of a new URL reaches it.
   */
  readonly #language = toSignal(this.#translate.onLangChange.pipe(map(event => event.lang)), {
    initialValue: this.#translate.currentLang || this.#translate.defaultLang,
  });

  /**
   * Both params are omitted rather than defaulted, leaving the portal its own fallback: a host that
   * asks for no theme, or i18n that has applied no language yet, has nothing to state.
   * `lang=undefined` would only be a worse way of saying nothing.
   */
  buildEmbedUrl(dashboardId: string, theme: InsightsEmbedTheme | null = null): string {
    const embedUrl = `${environment.insightsDashboardsPortalBaseUrl}/real-time-embedded/${dashboardId}`;
    const params = new URLSearchParams();
    const language = this.#language();

    if (theme !== null) {
      params.set(INSIGHTS_EMBED_THEME_QUERY_PARAM, theme);
    }
    if (language) {
      params.set(INSIGHTS_EMBED_LANGUAGE_QUERY_PARAM, language);
    }

    const query = params.toString();

    return query === '' ? embedUrl : `${embedUrl}?${query}`;
  }

  createReadyMessageStream(isFromExpectedSource: (event: MessageEvent<unknown>) => boolean = () => true): Observable<void> {
    return fromEvent<MessageEvent<unknown>>(window, 'message').pipe(
      filter(event => this.isReadyMessage(event) && isFromExpectedSource(event)),
      map((): undefined => undefined),
    );
  }

  isReadyMessage(event: MessageEvent<unknown>): boolean {
    const { data, origin } = event;
    const isExpectedOrigin = origin === this.portalOrigin;
    const isExpectedMessageType =
      typeof data === 'object' && data !== null && 'type' in data && data.type === RealTimeEmbeddedMessagingService.iframeReadyMessageType;

    return isExpectedOrigin && isExpectedMessageType;
  }

  isReadyMessageForSource(event: MessageEvent<unknown>, expectedSource: MessageEventSource | null): boolean {
    return this.isReadyMessage(event) && expectedSource !== null && event.source !== null && event.source === expectedSource;
  }

  postFiltersUpdate(target: Window, selection: RealTimeFiltersEmbeddedSelection): void {
    target.postMessage({ payload: selection, type: RealTimeEmbeddedMessagingService.filtersUpdateMessageType }, this.portalOrigin);
  }
}

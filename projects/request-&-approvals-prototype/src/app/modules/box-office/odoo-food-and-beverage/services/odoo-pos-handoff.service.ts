import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { SKIP_AUTHENTICATION_INTERCEPTOR } from '@fz-original/app/shared/interceptors/skip-authentication.token';
import { SKIP_RETRY_INTERCEPTOR } from '@fz-original/app/shared/interceptors/skip-retry.token';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { environment } from '@fz-original/environments/environment';
import { assertIsDefined } from '@fz/utils/assert-is-defined';
import { catchError, map, of, switchMap, timeout, type Observable } from 'rxjs';

import type { OdooHandoffIssue, OdooHandoffIssueData } from '../models/odoo-handoff.api';
import type { OdooPointOfSaleLink } from '../models/odoo-point-of-sale-link.model';
import { buildOdooSsoCallbackUrl } from '../utils/build-odoo-sso-callback-url.util';
import { OdooPosLinkService } from './odoo-pos-link.service';

/**
 * The global loader (F&B route) or the open button's spinner (order tab) stays up while the link
 * resolves, so a hung Shops or IAM call would leave the operator with no way out. Past this, the
 * hand-off fails and the caller takes over: the setup modal, or an error toast.
 */
export const ODOO_POS_HANDOFF_TIMEOUT_MS = 15_000;

@Injectable({ providedIn: 'root' })
export class OdooPosHandoffService {
  readonly #http = inject(HttpClient);
  readonly #odooPosLinkService = inject(OdooPosLinkService);

  resolveRedirectUrl(channelId: string, onsiteSetupId: string | undefined, organizationId: number): Observable<string> {
    return this.#odooPosLinkService.getPointOfSaleLink(channelId, onsiteSetupId).pipe(
      switchMap(pointOfSaleLink => this.#wrapWithSsoHandoff(pointOfSaleLink, organizationId)),
      timeout(ODOO_POS_HANDOFF_TIMEOUT_MS),
    );
  }

  resolveTabRedirectUrl(tabId: string, organizationId: number): Observable<string> {
    return this.#odooPosLinkService.getTabLink(tabId).pipe(
      switchMap(tabLink => this.#wrapWithSsoHandoff(tabLink, organizationId)),
      timeout(ODOO_POS_HANDOFF_TIMEOUT_MS),
    );
  }

  #wrapWithSsoHandoff(pointOfSaleLink: OdooPointOfSaleLink, organizationId: number): Observable<string> {
    if (!this.#canUseSsoHandoffInBrowser()) {
      return of(pointOfSaleLink.link);
    }

    const connectionId = pointOfSaleLink.accountId.trim();
    if (connectionId === '') {
      return of(pointOfSaleLink.link);
    }

    return this.#issueHandoff(organizationId, connectionId).pipe(
      map(handoff => buildOdooSsoCallbackUrl(pointOfSaleLink.link, handoff)),
      catchError(() => of(pointOfSaleLink.link)),
    );
  }

  #canUseSsoHandoffInBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * A failed handoff falls back to the plain POS link, so its 401 or 403 must not also reach the
   * session guard: the expired-session modal or forbidden toast would race the redirect. Nor is it
   * retried: each attempt mints a short-lived token, and an IAM outage should reach the fallback at once.
   */
  #handoffContext(): HttpContext {
    return new HttpContext().set(SKIP_AUTHENTICATION_INTERCEPTOR, true).set(SKIP_RETRY_INTERCEPTOR, true);
  }

  #issueHandoff(organizationId: number, connectionId: string): Observable<OdooHandoffIssue> {
    return this.#http
      .post<BaseResponse<OdooHandoffIssueData>>(
        `${environment.apiIamBaseUrl}/1.0/handoff`,
        {
          connection_id: connectionId,
          organization_id: organizationId,
        },
        { context: this.#handoffContext() },
      )
      .pipe(
        map((response: BaseResponse<OdooHandoffIssueData>): OdooHandoffIssue => {
          assertIsDefined(response.data);

          return {
            token: response.data.token,
          };
        }),
      );
  }
}

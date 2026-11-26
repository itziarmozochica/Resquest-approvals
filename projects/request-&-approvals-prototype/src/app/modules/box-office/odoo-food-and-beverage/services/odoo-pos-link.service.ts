import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { SKIP_FORBIDDEN_TOAST } from '@fz-original/app/shared/interceptors/skip-forbidden-toast.token';
import { SKIP_RETRY_INTERCEPTOR } from '@fz-original/app/shared/interceptors/skip-retry.token';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { defer, map, type Observable } from 'rxjs';

import type { GenerateLinkResponse, GenerateLinkType } from '../models/generate-link.api';
import type { OdooOrderTab } from '../models/odoo-order-tab.model';
import type { OdooPointOfSaleLink } from '../models/odoo-point-of-sale-link.model';
import type { OrderTabsResponse } from '../models/order-tabs.api';
import { adaptGenerateLinkResponse } from '../utils/adapt-generate-link-response.util';
import { adaptOrderTabsResponse } from '../utils/adapt-order-tabs-response.util';
import { generateLinkChannelParams, generateLinkUrl } from '../utils/generate-link.util';

export const GENERATE_LINK_PATH = 'generate-link';
export const ORDERS_PATH = 'orders';
export const TABS_PATH = 'tabs';

@Injectable({ providedIn: 'root' })
export class OdooPosLinkService {
  readonly #http = inject(HttpClient);
  readonly #partnerService = inject(PartnerService);

  createOrderTabs(orderId: number): Observable<OdooOrderTab[]> {
    return defer(() =>
      this.#http.post<OrderTabsResponse>(this.#orderTabsUrl(orderId), null, {
        context: new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true).set(SKIP_FORBIDDEN_TOAST, true),
      }),
    ).pipe(map(adaptOrderTabsResponse));
  }

  getOrderTabs(orderId: number): Observable<OdooOrderTab[]> {
    return defer(() => this.#http.get<OrderTabsResponse>(this.#orderTabsUrl(orderId))).pipe(map(adaptOrderTabsResponse));
  }

  getPointOfSaleLink(channelId: string, onsiteSetupId: string | undefined): Observable<OdooPointOfSaleLink> {
    const channelParams = generateLinkChannelParams(channelId);
    const params = onsiteSetupId ? channelParams.set('onsite_setup_id', onsiteSetupId) : channelParams;

    return defer(() => this.#http.get<GenerateLinkResponse>(this.#generateLinkUrl('pos'), { params })).pipe(map(adaptGenerateLinkResponse));
  }

  getTabLink(tabId: string): Observable<OdooPointOfSaleLink> {
    return defer(() =>
      this.#http.get<GenerateLinkResponse>(this.#generateLinkUrl('tab'), {
        params: new HttpParams().set('tab_id', tabId),
      }),
    ).pipe(map(adaptGenerateLinkResponse));
  }

  #actingPartnerId(): number {
    const partnerId = this.#partnerService.getActingOrganizationId();

    if (partnerId === null) {
      throw new Error('OdooPosLinkService: the point-of-sale link needs an acting partner, and no partner is selected.');
    }

    return partnerId;
  }

  #generateLinkUrl(linkType: GenerateLinkType): string {
    return generateLinkUrl(this.#actingPartnerId(), `${GENERATE_LINK_PATH}/${linkType}`);
  }

  #orderTabsUrl(orderId: number): string {
    return generateLinkUrl(this.#actingPartnerId(), `${ORDERS_PATH}/${orderId}/${TABS_PATH}`);
  }
}

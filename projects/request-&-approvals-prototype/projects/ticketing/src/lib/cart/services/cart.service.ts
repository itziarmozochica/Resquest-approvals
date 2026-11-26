import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { defer, map, switchMap, type Observable } from 'rxjs';

import { TICKETING_CONFIG, type TicketingConfig } from '../../ticketing.config';
import { adaptCartApi } from '../api-adapters/adapt-cart-api';
import { mapToCreateCartRequest, mapToPrepareCartRequest, mapToUpdateCartRequest } from '../api-mappers/map-to-cart-request';
import type { CartApi } from '../models/api/cart.model';
import type { CreateCartQuery, DiscardCartQuery, GetCartQuery, PrepareCartQuery, UpdateCartQuery } from '../models/cart-query.model';
import type { Cart } from '../models/cart.model';

@Injectable()
export class TicketingCartService {
  readonly #config: TicketingConfig = inject(TICKETING_CONFIG);
  readonly #http = inject(HttpClient);

  createCart(query: CreateCartQuery): Observable<Cart> {
    return defer(() =>
      this.#http.post<CartApi>(this.#cartsUrl(query.partnerId), mapToCreateCartRequest(query), {
        headers: this.#localeHeaders(query.locale),
      }),
    ).pipe(map(adaptCartApi));
  }

  discardCart(query: DiscardCartQuery): Observable<null> {
    return defer(() => this.#http.post<null>(`${this.#cartUrl(query.partnerId, query.cartId)}discard/`, null));
  }

  getCart(query: GetCartQuery): Observable<Cart> {
    return defer(() => this.#http.get<CartApi>(this.#cartUrl(query.partnerId, query.cartId))).pipe(map(adaptCartApi));
  }

  prepareCart(query: PrepareCartQuery): Observable<Cart> {
    return defer(() => this.#http.post(this.#prepareUrl(query), mapToPrepareCartRequest(query))).pipe(
      switchMap(() => this.getCart({ cartId: query.cartId, partnerId: query.partnerId })),
    );
  }

  updateCart(query: UpdateCartQuery): Observable<Cart> {
    return defer(() =>
      this.#http.put<CartApi>(`${this.#cartUrl(query.partnerId, query.cartId)}update/`, mapToUpdateCartRequest(query)),
    ).pipe(map(adaptCartApi));
  }

  #basePath(partnerId: string | undefined): string {
    if (partnerId === undefined) {
      return '';
    }

    const resolveBasePath = this.#config.basePath;

    return resolveBasePath === undefined ? `/partners/${partnerId}` : resolveBasePath(partnerId);
  }

  #cartsUrl(partnerId: string | undefined): string {
    return `${this.#config.apiBaseUrl}${this.#basePath(partnerId)}/carts/`;
  }

  #cartUrl(partnerId: string | undefined, cartId: string): string {
    return `${this.#cartsUrl(partnerId)}${cartId}/`;
  }

  #localeHeaders(locale: string | undefined): HttpHeaders | undefined {
    return locale === undefined || locale.length === 0 ? undefined : new HttpHeaders({ 'Accept-Language': locale });
  }

  #prepareUrl(query: PrepareCartQuery): string {
    const gateway = this.#config.gatewayBaseUrl;
    if (gateway === undefined) {
      throw new Error('TicketingCartService: prepareCart needs TICKETING_CONFIG.gatewayBaseUrl, which the host did not provide.');
    }

    const scope = query.planId === undefined ? '' : `/plans/${query.planId}/places/${query.placeId}`;

    return `${gateway}/2.0${this.#basePath(query.partnerId)}${scope}/carts/${query.cartId}/prepare`;
  }
}

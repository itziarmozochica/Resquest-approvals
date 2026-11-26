import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { map, type Observable } from 'rxjs';

import type { RetailSetupType } from '../../core/models/retail-setup-type.model';
import { FzShopProductsService } from '../../core/services/shop-products.service';
import { adaptRetailSetupAccountsResponse } from '../api-adapters/adapt-retail-setup-accounts-response';
import { adaptRetailSetupRecord } from '../api-adapters/adapt-retail-setup-record';
import { adaptRetailSetupResponse } from '../api-adapters/adapt-retail-setup-response';
import { adaptRetailSetupsResponse } from '../api-adapters/adapt-retail-setups-response';
import { adaptDistributionsResponse } from '../api-adapters/product-variations/adapt-distributions-response';
import { adaptProductVariationsResponse } from '../api-adapters/product-variations/adapt-product-variations-response';
import { mapToCreateBody } from '../api-mappers/map-to-create-body';
import { mapToGetRetailByIdParams } from '../api-mappers/map-to-get-retail-by-id-params';
import { mapToPatchBody } from '../api-mappers/map-to-patch-body';
import { mapToQuery } from '../api-mappers/product-variations/map-to-query';
import type { DistributionsResponse } from '../models/api/product-variations/distributions-response.model';
import type { ProductVariationsResponse } from '../models/api/product-variations/product-variations-response.model';
import type { RetailSetupAccountsResponse } from '../models/api/retail-setup-account-api.model';
import type { RetailSetupResponse } from '../models/api/retail-setup-response.model';
import type { RetailSetupsResponse } from '../models/api/retail-setups-response.model';
import type { Distributions } from '../models/product-variations/distributions.model';
import type { ProductVariationsQuery, ProductVariationsResult } from '../models/product-variations/product-variations.model';
import type { RetailSetupAccount } from '../models/retail-setup/retail-setup-account.model';
import type { RetailSetup, RetailSetupCreate, RetailSetupUpdate } from '../models/retail-setup/retail-setup.model';

@Injectable({
  providedIn: 'root',
})
export class FzRetailSetupService {
  readonly #http = inject(HttpClient);
  readonly #shopProductsService = inject(FzShopProductsService);

  createRetailSetup(retailSetup: RetailSetupCreate): Observable<RetailSetup | null> {
    return this.#http
      .post<RetailSetupsResponse>(this.#shopProductsService.retailSetupsUrl(), mapToCreateBody(retailSetup))
      .pipe(map((res: RetailSetupsResponse) => adaptRetailSetupRecord(res.data)));
  }

  getDistributions(retailSetupId: string, productVariationId: string): Observable<Distributions> {
    const url = `${this.#shopProductsService.retailSetupsUrl()}/${retailSetupId}/product-variations/${productVariationId}/distribution`;
    return this.#http.get<DistributionsResponse>(url).pipe(map(adaptDistributionsResponse));
  }

  getProductVariations(retailSetupId: string, query: ProductVariationsQuery): Observable<ProductVariationsResult> {
    const url = `${this.#shopProductsService.retailSetupsUrl()}/${retailSetupId}/product-variations`;
    return this.#http.get<ProductVariationsResponse>(url, { params: mapToQuery(query) }).pipe(map(adaptProductVariationsResponse));
  }

  getRetailSetupAccounts(type: RetailSetupType): Observable<RetailSetupAccount[]> {
    return this.#http
      .get<RetailSetupAccountsResponse>(this.#shopProductsService.retailSetupAccountsUrl(), {
        params: { type },
      })
      .pipe(map(adaptRetailSetupAccountsResponse));
  }

  getRetailSetupById(retailSetupId: string): Observable<RetailSetup> {
    return this.#http
      .get<RetailSetupResponse>(`${this.#shopProductsService.retailSetupsUrl()}/${retailSetupId}`, {
        params: mapToGetRetailByIdParams(),
      })
      .pipe(map(body => adaptRetailSetupResponse(body, retailSetupId)));
  }

  getRetailSetups(): Observable<RetailSetup[]> {
    return this.#http.get<RetailSetupsResponse>(this.#shopProductsService.retailSetupsUrl()).pipe(map(adaptRetailSetupsResponse));
  }

  syncRetailProducts(retailSetupId: string): Observable<void> {
    return this.#http
      .post<unknown>(`${this.#shopProductsService.retailSetupsUrl()}/${retailSetupId}/products/sync`, null)
      .pipe(map((): undefined => undefined));
  }

  syncRetailProductsByPlans(retailSetupId: string): Observable<void> {
    return this.#http
      .post<unknown>(this.#shopProductsService.syncShopProductsUrl(retailSetupId), null)
      .pipe(map((): undefined => undefined));
  }

  updateRetailSetup(retailSetupId: string, changes: RetailSetupUpdate): Observable<RetailSetup | null> {
    return this.#http
      .patch<RetailSetupsResponse>(`${this.#shopProductsService.retailSetupsUrl()}/${retailSetupId}`, mapToPatchBody(changes))
      .pipe(map((res: RetailSetupsResponse) => adaptRetailSetupRecord(res.data)));
  }
}

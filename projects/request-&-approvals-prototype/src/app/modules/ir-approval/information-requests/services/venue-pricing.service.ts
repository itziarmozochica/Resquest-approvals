import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { environment } from '@fz-original/environments/environment';
import { map, Observable, of, shareReplay } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface ProductTaxRateOption {
  productType: string;
  /** Human label including the tax breakdown, e.g. "Admission ticket (VAT 21%)". */
  humanizedProductType: string;
}

export interface VenuePricing {
  currency: string | null;
  mustUseTaxBase: boolean;
  productTaxRates: ProductTaxRateOption[];
}

interface VenuePricingApiData {
  currency: string | null;
  must_use_tax_base: boolean;
  product_tax_rates: {
    product_type: string;
    humanized_product_type: string;
  }[];
}

const EMPTY_PRICING: VenuePricing = { currency: null, mustUseTaxBase: false, productTaxRates: [] };

@Injectable({ providedIn: 'root' })
export class VenuePricingService {
  readonly #http = inject(HttpClient);
  readonly #cache = new Map<string, Observable<VenuePricing | null>>();

  getByGooglePlaceId(partnerId: number, placeId: string): Observable<VenuePricing | null> {
    const cacheKey = `${partnerId}:${placeId}`;
    const cached = this.#cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const url = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/information-requests/venue-pricing/`;
    const request = this.#http.get<BaseResponse<VenuePricingApiData | null>>(url, { params: { google_place_id: placeId } }).pipe(
      map(response => this.#toVenuePricing(response.data)),
      catchError(() => {
        // Drop the cache entry so a later lookup re-hits the API instead of replaying the failure.
        this.#cache.delete(cacheKey);
        return of(null);
      }),
      shareReplay(1),
    );
    this.#cache.set(cacheKey, request);
    return request;
  }

  #toVenuePricing(data: VenuePricingApiData | null): VenuePricing {
    if (!data) {
      return EMPTY_PRICING;
    }
    return {
      currency: data.currency ?? null,
      mustUseTaxBase: data.must_use_tax_base ?? false,
      productTaxRates: (data.product_tax_rates ?? []).map(rate => ({
        productType: rate.product_type,
        humanizedProductType: rate.humanized_product_type ?? rate.product_type,
      })),
    };
  }
}

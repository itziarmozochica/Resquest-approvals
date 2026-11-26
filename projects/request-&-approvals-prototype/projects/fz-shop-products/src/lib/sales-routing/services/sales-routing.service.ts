import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { map, type Observable } from 'rxjs';

import { FzShopProductsService } from '../../core/services/shop-products.service';
import { adaptSalesRoutingResponse } from '../api-adapters/adapt-sales-routing-response';
import type { SalesRoutingResponse } from '../models/api/sales-routing-response.model';
import type { SalesRouting } from '../models/sales-routing.model';

@Injectable()
export class FzSalesRoutingService {
  readonly #http = inject(HttpClient);
  readonly #shopProductsService = inject(FzShopProductsService);

  getSalesRouting(retailSetupId: string): Observable<SalesRouting | null> {
    return this.#http
      .get<SalesRoutingResponse>(this.#shopProductsService.salesRoutingUrl(retailSetupId))
      .pipe(map(adaptSalesRoutingResponse));
  }
}

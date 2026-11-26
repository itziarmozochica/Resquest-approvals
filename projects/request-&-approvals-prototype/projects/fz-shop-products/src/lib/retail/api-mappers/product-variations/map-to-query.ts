import { HttpParams } from '@angular/common/http';

import type { ProductVariationsQuery } from '../../models/product-variations/product-variations.model';

export function mapToQuery(query: ProductVariationsQuery): HttpParams {
  let params = new HttpParams();

  if (query.warehouseIds !== undefined) {
    for (const id of query.warehouseIds) {
      params = params.append('warehouse_ids', id);
    }
  }

  if (query.page !== undefined) {
    params = params.set('page', String(query.page));
  }

  if (query.itemsPerPage !== undefined) {
    params = params.set('items_per_page', String(query.itemsPerPage));
  }

  if (query.search !== undefined) {
    params = params.set('search', query.search);
  }

  if (query.includeImages === false) {
    params = params.set('include_images', 'false');
  }

  return params;
}

import { HttpParams } from '@angular/common/http';

export interface GetRetailSetupByIdQuery {
  includeProductVariationsCount?: boolean;
}

export function mapToGetRetailByIdParams(options?: GetRetailSetupByIdQuery): HttpParams {
  const include = options?.includeProductVariationsCount ?? true;

  return new HttpParams().set('include_product_variations_count', String(include));
}

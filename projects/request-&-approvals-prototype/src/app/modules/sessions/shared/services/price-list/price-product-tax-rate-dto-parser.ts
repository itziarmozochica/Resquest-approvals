import { Injectable } from '@angular/core';

import { ProductTaxRate, ProductTaxRateDTO } from '../../models/price-list-item.model';

@Injectable({
  providedIn: 'root',
})
export class PriceProductTaxRateDtoParser {
  parse({
    id,
    product_type,
    national_tax_name,
    national_tax_product_rate,
    national_tax_surcharge_rate,
    local_tax_name,
    local_tax_product_rate,
    local_tax_surcharge_rate,
  }: ProductTaxRateDTO): ProductTaxRate {
    return {
      id,
      productType: product_type,
      nationalTaxName: national_tax_name,
      nationalTaxProductRate: national_tax_product_rate,
      nationalTaxSurchargeRate: national_tax_surcharge_rate,
      localTaxName: local_tax_name,
      localTaxProductRate: local_tax_product_rate,
      localTaxSurchargeRate: local_tax_surcharge_rate,
    };
  }
}

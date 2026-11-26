import { ProductTaxRate, ProductTaxRateDTO } from './product-tax-area.model';

export interface TaxAreaDTO {
  id: string;
  name: string;
  product_tax_rates: Array<ProductTaxRateDTO>;
}

export interface TaxArea {
  id: string;
  name: string;
  productTaxRates: Array<ProductTaxRate>;
}

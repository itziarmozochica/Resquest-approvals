import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseResponse } from '../../models/base-response';
import { ProductTaxRate, ProductTaxRateDTO } from './product-tax-area.model';
import { TaxArea, TaxAreaDTO } from './tax-area.model';

@Injectable({
  providedIn: 'root',
})
export class TaxAreaAdapter implements AdapterInterface<BaseResponse<TaxArea>> {
  fromApi(response: any): BaseResponse<TaxArea> {
    return new BaseResponse<TaxArea>(this.getData(response?.data), this.getError(response?.error));
  }

  private getError(data: any) {
    if (!data) {
      return null;
    }
    return { code: data.code, message: data.message };
  }

  private getData(taxAreaDTO: TaxAreaDTO): TaxArea | null {
    if (!taxAreaDTO) {
      return null;
    }
    return {
      id: taxAreaDTO.id,
      name: taxAreaDTO.name,
      productTaxRates: this.getProductTaxRates(taxAreaDTO.product_tax_rates),
    };
  }

  private getProductTaxRates(productTaxRatesDTO: Array<ProductTaxRateDTO>): Array<ProductTaxRate> {
    return productTaxRatesDTO.map(productTaxRate => {
      return this.getProductTaxRate(productTaxRate);
    });
  }

  private getProductTaxRate(productTaxRateDTO: ProductTaxRateDTO): ProductTaxRate {
    return {
      id: productTaxRateDTO.id,
      productType: productTaxRateDTO.product_type,
      humanizedProductType: productTaxRateDTO.humanized_product_type,
    };
  }
}

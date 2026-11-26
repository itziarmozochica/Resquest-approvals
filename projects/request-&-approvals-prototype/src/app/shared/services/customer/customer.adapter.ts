import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseResponse } from '../../models/base-response';
import { Customer } from '../../models/customer/customer.model';

@Injectable({
  providedIn: 'root',
})
export class CustomerAdapter implements AdapterInterface<BaseResponse<Customer>> {
  fromApi(response: any): BaseResponse<Customer> {
    return new BaseResponse<Customer>(this.getData(response?.data), this.getError(response?.error));
  }

  private getError(data: any) {
    let error = null;
    if (data) {
      error = { code: data.code, message: 'errors.generic' };
    }
    return error;
  }

  private getData(data: any): Customer | null {
    let customer: Customer | null = null;
    if (data) {
      customer = {
        id: data.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        cityStandardId: data.cityStandardId,
        acceptedTerms: data.acceptedTerms,
        type: data.type,
      };
    }
    return customer;
  }
}

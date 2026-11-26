import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../models/base-response';
import { Coupon } from '../../models/cart/coupon.model';
import { Money } from '../../models/money.model';

@Injectable({
  providedIn: 'root',
})
export class CouponAdapter implements AdapterInterface<BaseResponse<Coupon>> {
  fromApi(response: BaseResponse<Coupon>): BaseResponse<Coupon> {
    return new BaseResponse<Coupon>(this.getData(response?.data), this.getError(response?.error));
  }

  private getData(data: Coupon | null | undefined): Coupon | null {
    if (data != null) {
      return {
        code: data.code,
        creationPurpose: (data as { creation_purpose?: string }).creation_purpose,
        discount: new Money(data.discount.amount, data.discount.currency),
        title: data.title,
      };
    } else {
      return null;
    }
  }

  private getError(data: BaseErrorResponse | null | undefined): BaseErrorResponse | null {
    if (data != null) {
      return { code: data.code, message: `errors.${data.code}` };
    }
    return null;
  }
}

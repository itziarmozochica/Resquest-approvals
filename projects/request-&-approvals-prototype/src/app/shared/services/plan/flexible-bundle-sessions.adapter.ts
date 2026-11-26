import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../models/base-response';
import { Money } from '../../models/money.model';
import {
  FlexibleBundlePlan,
  FlexibleBundlePricingDiscountByBundleSize,
  FlexibleBundleSession,
  FlexibleBundleSessions,
  FlexibleBundleSessionsDTO,
  FlexibleBundleSessionsPlanDTO,
  FlexibleBundleSessionsPricingDiscountByBundleSizeDTO,
  FlexibleBundleSessionsSessionDTO,
} from '../../models/plan/flexible-bundle-sessions.model';

@Injectable({
  providedIn: 'root',
})
export class FlexibleBundleSessionsAdapter implements AdapterInterface<BaseResponse<FlexibleBundleSessions>> {
  fromApi(response: BaseResponse<FlexibleBundleSessionsDTO>): BaseResponse<FlexibleBundleSessions> {
    return new BaseResponse<FlexibleBundleSessions>(this.#getData(response.data), this.#getError(response.error));
  }

  #adaptDiscount(discount: FlexibleBundleSessionsPricingDiscountByBundleSizeDTO): FlexibleBundlePricingDiscountByBundleSize {
    return {
      discount: discount.discount,
      discountType: discount.discount_type,
      price: new Money(discount.price_info.amount, discount.price_info.currency),
      size: discount.size,
    };
  }

  #adaptPlan(plan: FlexibleBundleSessionsPlanDTO): FlexibleBundlePlan {
    return {
      excludeFromBundleSizeCount: plan.exclude_from_bundle_size_count ?? false,
      id: plan.id,
      sessions: plan.sessions.map(session => this.#adaptSession(session)),
    };
  }

  #adaptSession(session: FlexibleBundleSessionsSessionDTO): FlexibleBundleSession {
    return {
      id: session.id,
      label: session.label,
      price: new Money(session.price_info.amount, session.price_info.currency),
      pricingDiscountByBundleSize: session.pricing_discount_by_bundle_size.map(discount => this.#adaptDiscount(discount)),
      sessionTypeId: session.session_type_id,
      sourceSessionTypeId: session.source_session_type_id,
    };
  }

  #getData(data: FlexibleBundleSessionsDTO | null): FlexibleBundleSessions | null {
    if (data == null) {
      return null;
    }
    return { plans: data.plans.map(plan => this.#adaptPlan(plan)) };
  }

  #getError(error: BaseErrorResponse | null | undefined): BaseErrorResponse | null {
    if (error == null) {
      return null;
    }
    return { code: error.code, message: error.message };
  }
}

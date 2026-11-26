import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';

import { AdapterInterface } from '../../../core/adapter.interface';
import { LinkPaginationResponse } from '../../models/link-pagination-response';
import { Plan, PlanData, PlansData } from '../../models/plan/plan.model';
import { BasePlanAdapter } from './base-plan.adapter';

@Injectable({
  providedIn: 'root',
})
export class PlansWithAnalyticsAdapter extends BasePlanAdapter implements AdapterInterface<LinkPaginationResponse<Plan[]>> {
  fromApi(response: HttpResponse<BaseResponse<PlansData>>): LinkPaginationResponse<Plan[]> {
    const body = response.body;
    return new LinkPaginationResponse<Plan[]>(response.headers.get('Link'), this.getData(body?.data), this.getError(body?.error));
  }

  private getError(data: BaseErrorResponse | null | undefined) {
    if (data == null) {
      return null;
    }
    return { code: data.code, message: data.message };
  }

  private getData(data: PlansData | null | undefined): Plan[] | null {
    if (data == null) {
      return null;
    }

    return data.plans.map((plan: PlanData) => {
      return this.getPlan(plan);
    });
  }
}

import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../models/base-response';
import { Plan, PlanData, PlansData } from '../../models/plan/plan.model';
import { BasePlanAdapter } from './base-plan.adapter';

@Injectable({
  providedIn: 'root',
})
export class PlansAdapter extends BasePlanAdapter implements AdapterInterface<BaseResponse<Plan[]>> {
  fromApi(response: HttpResponse<BaseResponse<PlansData>>): BaseResponse<Plan[]> {
    const body = response.body;
    return new BaseResponse<Plan[]>(this.getData(body?.data), this.getError(body?.error));
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

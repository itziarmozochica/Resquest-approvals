import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../models/base-response';
import { Plan, PlanData } from '../../models/plan/plan.model';
import { BasePlanAdapter } from './base-plan.adapter';

@Injectable({
  providedIn: 'root',
})
export class PlanAdapter extends BasePlanAdapter implements AdapterInterface<BaseResponse<Plan>> {
  fromApi(response: BaseResponse<PlanData>): BaseResponse<Plan> {
    return new BaseResponse<Plan>(this.getData(response.data), this.getError(response.error));
  }

  private getError(data: BaseErrorResponse | null | undefined) {
    if (data == null) {
      return null;
    }
    return { code: data.code, message: data.message };
  }

  private getData(data: PlanData | null): Plan | null {
    if (data == null) {
      return null;
    }

    return this.getPlan(data);
  }
}

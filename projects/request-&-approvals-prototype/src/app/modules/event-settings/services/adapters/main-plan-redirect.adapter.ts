import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../../../shared/models/base-response';
import { MainPlanRedirect } from '../../models/main-plan-redirect.model';
import { MainPlanRedirectDto } from '../dtos/main-plan-redirect.dto';

@Injectable({
  providedIn: 'root',
})
export class MainPlanRedirectAdapter implements AdapterInterface<MainPlanRedirect> {
  fromApi(response: HttpResponse<BaseResponse<MainPlanRedirectDto>>): MainPlanRedirect {
    const body = response.body;
    if (!body) {
      throw new Error('Empty response body');
    }
    const { data, error } = body;
    if (error) {
      throw this.getError(error);
    }
    if (data == null) {
      throw new Error('Empty response data');
    }
    return this.getData(data);
  }

  private getError(error: BaseErrorResponse): BaseErrorResponse {
    return { code: error.code, message: error.message };
  }

  private getData(dto: MainPlanRedirectDto): MainPlanRedirect {
    return {
      redirectFromId: dto.redirect_from_id,
      redirectToId: dto.redirect_to_id,
    } as MainPlanRedirect;
  }
}

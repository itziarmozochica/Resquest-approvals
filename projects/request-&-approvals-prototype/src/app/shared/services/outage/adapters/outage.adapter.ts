import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../../models/base-response';
import { Outage, OutageDto } from '../../../models/outage/outage.model';

@Injectable({
  providedIn: 'root',
})
export class OutageAdapter implements AdapterInterface<BaseResponse<Outage[]>> {
  fromApi(response: BaseResponse<OutageDto[]>): BaseResponse<Outage[]> {
    return new BaseResponse<Outage[]>(this.getData(response?.data), this.getError(response?.error));
  }

  private getError(data: BaseErrorResponse | null | undefined): BaseErrorResponse | null {
    if (!data) {
      return null;
    }
    return { code: data.code, message: data.message };
  }

  private getData(data: OutageDto[] | null): Outage[] {
    return (
      data?.map(
        element =>
          ({
            id: element.id,
            affectedViews: element.affected_views,
            endDate: element.end_date,
            startDate: element.start_date,
            reason: element.reason,
          }) as Outage,
      ) ?? []
    );
  }
}

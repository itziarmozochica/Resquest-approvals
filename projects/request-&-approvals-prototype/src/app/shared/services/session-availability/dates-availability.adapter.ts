import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseResponse } from '../../models/base-response';
import { DateAvailability } from '../../models/session-availability/date-availability.model';

export type DatesAvailability = Map<string, DateAvailability>;

export interface DatesAvailabilityResponse {
  dates: DatesAvailability;
  nextAvailableDate: string;
}

@Injectable({
  providedIn: 'root',
})
export class DatesAvailabilityAdapter implements AdapterInterface<BaseResponse<DatesAvailabilityResponse>> {
  fromApi(response: any): BaseResponse<DatesAvailabilityResponse> {
    return new BaseResponse<DatesAvailabilityResponse>(this.getData(response?.data), this.getError(response?.error));
  }

  private getError(data: any) {
    if (!data) {
      return;
    }

    return { code: data.code, message: data.message };
  }

  private getData(data: any): DatesAvailabilityResponse | null {
    if (!data?.dates) {
      return null;
    }

    const { dates } = data as { dates: { [key: string]: any } };
    const dateAvailabilityMap: DatesAvailability = new Map();

    Object.entries(dates).forEach(([date, summary]: [string, any]) => {
      const dateAvailability = this.createDateAvailability(date, summary);
      dateAvailabilityMap.set(date, dateAvailability);
    });
    return {
      dates: dateAvailabilityMap,
      nextAvailableDate: data.next_available_date,
    };
  }

  private createDateAvailability(date: string, summary: any): DateAvailability {
    return new DateAvailability(date, summary.purchasable);
  }
}

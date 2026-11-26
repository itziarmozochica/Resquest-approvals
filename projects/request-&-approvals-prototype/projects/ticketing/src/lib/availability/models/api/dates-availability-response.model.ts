import type { BaseResponse } from '@fz/http-models';

export interface DateAvailabilityApi {
  purchasable: boolean;
}

export interface DatesAvailabilityApi {
  dates: Record<string, DateAvailabilityApi>;
  next_available_date?: string | null;
}

export type DatesAvailabilityResponse = BaseResponse<DatesAvailabilityApi>;

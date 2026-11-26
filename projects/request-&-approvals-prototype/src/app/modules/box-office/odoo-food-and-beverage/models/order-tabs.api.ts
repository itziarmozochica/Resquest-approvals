import type { BaseResponse } from '@fz/http-models';

export interface OrderTabEntitlementApi {
  name: string;
  quantity: number;
}

export interface OrderTabApi {
  entitlements: OrderTabEntitlementApi[];
  external_id: string;
  id: string;
  name: string | null;
}

export interface OrderTabsApi {
  tabs: OrderTabApi[];
}

export type OrderTabsResponse = BaseResponse<OrderTabsApi>;

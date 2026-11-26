import { GraphGroup } from '@fz-original/app/shared/models/graph/graph.group';

export interface SearchGraphFilters {
  channelId: string;
  currency: string;
  groupName: GraphGroup;
  organizationOwnerId: number;
  partnerIds: Array<number>;
  planId: number;
  planIds: Array<number>;
  resellerId: number;
}

export interface SearchGraphPayloadDTO {
  channel_id?: string;
  currency?: string;
  group_name?: GraphGroup;
  partner_ids?: number[];
  plan_id?: number;
  plan_ids?: number[];
  reseller_id?: number;
}

export interface SearchGraphQueryParams extends SearchGraphFilters {
  partnerId: number;
}

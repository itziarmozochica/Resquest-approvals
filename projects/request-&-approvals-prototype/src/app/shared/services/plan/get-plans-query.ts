import { TableOrderBy } from '../../components/table/model/table-order-by';

export interface GetPlansQuery {
  partnerId?: number;
  status?: string;
  kind?: string;
  name?: string;
  cityId?: number;
  planId?: number;
  placeId?: number;
  orderBy?: Array<TableOrderBy>;
  channelId?: string;
  reviewStatus?: string | string[];
}

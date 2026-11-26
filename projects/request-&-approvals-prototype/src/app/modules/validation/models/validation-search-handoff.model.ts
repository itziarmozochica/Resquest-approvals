import { Order } from '../../../shared/models/order/order.model';
import { SearchOrderQuery } from '../../../shared/services/purchase/search-order-query';

export interface ValidationSearchHandoff {
  orderId: number;
  orders: Order[];
  partnerId: number;
}

export type ValidationSearchIncludes = Required<
  Pick<
    SearchOrderQuery,
    | 'hideFeverDiscount'
    | 'includeNotes'
    | 'includeOrderItems'
    | 'includePhoneNumber'
    | 'includeReschedules'
    | 'includeReservationChannel'
    | 'includeUserCancellationRecords'
  >
>;

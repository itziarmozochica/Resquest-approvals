import { Order } from './../../../../shared/models/order/order.model';

export type QRData = {
  onsiteSetupId?: string;
  order: Order;
  partnerId: number;
};

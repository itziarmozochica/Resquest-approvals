import { OrderChannelType } from '@fz-original/app/shared/models/order/order-channel-type.model';
import { Order } from '@fz-original/app/shared/models/order/order.model';

export const noFiscalSaleInChainLogCode = 'EFR_NO_FISCAL_SALE_IN_CHAIN';

export function isTillSaleChannel(channelType: OrderChannelType | undefined): boolean {
  return channelType == null || channelType === OrderChannelType.BOX_OFFICE;
}

export function isOrderWithoutTillSale(order: Pick<Order, 'channelType' | 'sourceRescheduleOrderId'>): boolean {
  return !isTillSaleChannel(order.channelType) && order.sourceRescheduleOrderId == null;
}

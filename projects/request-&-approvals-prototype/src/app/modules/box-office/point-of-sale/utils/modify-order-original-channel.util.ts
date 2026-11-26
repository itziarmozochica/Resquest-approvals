import type { Order } from '@fz-original/app/shared/models/order/order.model';
import { Channel } from '@fz/channel';

export function getModifyOrderOriginalChannelId(order: Order): string {
  return order.originChannelId ?? order.reservationChannelId ?? order.channelId ?? Channel.BoxOffice;
}

export function getModifyOrderOriginalChannel(order: Order): Channel {
  const channelId = getModifyOrderOriginalChannelId(order);
  return Object.values(Channel).find(channel => channel === channelId) ?? Channel.BoxOffice;
}

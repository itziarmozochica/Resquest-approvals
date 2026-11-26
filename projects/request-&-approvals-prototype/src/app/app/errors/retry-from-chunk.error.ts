import { Order } from '@fz-original/app/shared/models/order/order.model';

export class RetryFromChunkError extends Error {
  readonly chunkIndex: number;
  readonly chunkOrders: Order[];
  readonly order: Order;
  readonly useUnifiedLayout: boolean;
  readonly isHidePriceEnabled: boolean;

  constructor(
    message: string,
    chunkIndex: number,
    chunkOrders: Order[],
    order: Order,
    useUnifiedLayout: boolean,
    isHidePriceEnabled: boolean,
  ) {
    super(message);
    this.name = 'RetryFromChunkError';
    this.chunkIndex = chunkIndex;
    this.chunkOrders = chunkOrders;
    this.order = order;
    this.useUnifiedLayout = useUnifiedLayout;
    this.isHidePriceEnabled = isHidePriceEnabled;
  }
}

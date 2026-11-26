import { CustomerType } from '../../../../shared/models/customer/customer-type.enum';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { ClickClearAllCartData } from './click-clear-all-cart';

export interface PrepareCartData extends ClickClearAllCartData {
  customer_id: number | null | undefined;
  customer_type: CustomerType | undefined;
}

export class PrepareCartEvent extends TrackingEvent<PrepareCartData> {
  constructor(readonly data: PrepareCartData) {
    super(TrackingEvents.PrepareCart, data);
  }
}

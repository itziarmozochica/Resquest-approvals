import { Signal } from '@angular/core';

import { Order } from '@fz-original/app/shared/models/order/order.model';

import { ModifiedOrderMode } from '../../models/oss-modified-order-mode.model';

export interface OssModifiedOrderModalDialogData {
  mode: Signal<ModifiedOrderMode | undefined>;
  order: Signal<Order | undefined>;
}

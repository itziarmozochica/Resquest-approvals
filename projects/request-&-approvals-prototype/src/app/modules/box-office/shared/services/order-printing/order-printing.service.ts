import { Injectable } from '@angular/core';

import { Order } from '../../../../../shared/models/order/order.model';
import { OnsiteSetup } from '../../models/onsite-setup';

@Injectable({ providedIn: 'root' })
export class OrderPrintingService {
  isUnifiedTicket(onsiteSetup: OnsiteSetup | null, planId: number): boolean {
    return onsiteSetup?.print_tickets_combined_for_plans?.includes(planId) ?? false;
  }

  resolvePlaceId(onsiteSetup: OnsiteSetup | null, order: Order): number {
    return onsiteSetup?.place?.id ?? onsiteSetup?.place_id ?? order.placeId!;
  }
}

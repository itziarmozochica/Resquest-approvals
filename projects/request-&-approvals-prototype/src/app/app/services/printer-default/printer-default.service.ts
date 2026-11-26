import { inject, Injectable } from '@angular/core';

import { Order } from '@fz-original/app/shared/models/order/order.model';
import { TicketGeneratorFacadeService } from '@fz-original/app/shared/services/ticket-pdf-generator/ticket-generator-facade.service';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PrinterDefaultService {
  #ticketGeneratorFacade = inject(TicketGeneratorFacadeService);

  print(orders: { isHidePriceEnabled: boolean; isUnifiedTicket: boolean; order: Order }[]): Observable<void> {
    return from(this.#ticketGeneratorFacade.print(orders));
  }
}

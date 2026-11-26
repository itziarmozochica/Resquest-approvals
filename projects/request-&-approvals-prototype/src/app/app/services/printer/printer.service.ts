import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { Order } from '@fz-original/app/shared/models/order/order.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { DualScreenStorageService } from '@fz-original/app/shared/services/dual-screen/dual-screen-storage.service';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { PrinterDefaultService } from '../printer-default/printer-default.service';
import { DualScreenPrintOrder, PrinterDualScreenService } from '../printer-dual-screen/printer-dual-screen.service';

function serializeDualScreenPrintError(error: unknown): { error: unknown } {
  if (error instanceof Error) {
    return { error: { name: error.name, message: error.message, stack: error.stack } };
  }

  return { error };
}

@Injectable({
  providedIn: 'root',
})
export class PrinterService {
  #datadogLogService = inject(DatadogLogService);
  #dualScreenStorageService = inject(DualScreenStorageService);
  #printerDefaultService = inject(PrinterDefaultService);
  #printerDualScreenService = inject(PrinterDualScreenService);

  #optimizelyService = inject(OptimizelyService);

  print(orders: { order: Order; isUnifiedTicket?: boolean }[]): Observable<void> {
    const isHidePriceEnabled = this.#optimizelyService.isFeatureEnabled({
      optimizelyFeatureKey: FeatureFlags.HIDE_RESELLER_ORDER_PRICE_IN_TICKETS,
      team: 'b2b-resellers',
    });
    const mappedOrders: DualScreenPrintOrder[] = orders.map(o => {
      return {
        isHidePriceEnabled: !!(isHidePriceEnabled && o.order.reservationId),
        isUnifiedTicket: o.isUnifiedTicket ?? false,
        order: o.order.withoutTransactionFeeAccessTickets(),
      };
    });

    if (this.#dualScreenStorageService.containsData()) {
      return this.#printDualScreenOrders(mappedOrders);
    }

    return this.#printerDefaultService.print(mappedOrders);
  }

  #printDualScreenOrders(mappedOrders: DualScreenPrintOrder[]): Observable<void> {
    if (mappedOrders.length === 0) {
      return of(undefined);
    }

    return this.#printerDualScreenService.printOrders(mappedOrders).pipe(
      catchError((error: unknown) => {
        this.#datadogLogService.logError('[Printer][DualScreen] Print failed', {
          orderIds: mappedOrders.map(mappedOrder => mappedOrder.order.id),
          ...serializeDualScreenPrintError(error),
        });

        return of(undefined);
      }),
    );
  }
}

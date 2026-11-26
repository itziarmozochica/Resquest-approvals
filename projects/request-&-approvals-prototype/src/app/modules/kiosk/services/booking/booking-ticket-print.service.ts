import { inject, Injectable } from '@angular/core';

import { DatadogLogLevel } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { PrintOrderMessageV2 } from '@fz-original/app/shared/services/webview-messenger/models/print-order-message_v2.model';
import { PrintingFinished } from '@fz-original/app/shared/services/webview-messenger/models/printing-finished.model';
import { MessageType, WebviewMessengerService } from '@fz-original/app/shared/services/webview-messenger/webview-messenger.service';
import { catchError, map, mergeMap, Observable, of, retry, tap, throwError, timeout } from 'rxjs';

import { checkResponseData } from '../../utils/response';
import { KioskStorageService } from '../kiosk-storage.service';
import { KioskService } from '../kiosk.service';
import { PrinterDocumentType } from '../printer/models/printer-instruction.model';
import { PrinterService } from '../printer/printer.service';
import { BookingOrderDetail } from './booking-order.model';

/**
 * Approximate wall-clock time to allow for the native print request plus one
 * slip, and per additional slip, before giving up waiting for confirmation.
 */
const APPROX_PRINT_REQUEST_TIME_MS = 3_000;
const PRINT_TIME_PER_SLIP_MS = 3_000;

/**
 * Prints an order's tickets on the kiosk thermal printer, reusing the
 * purchase-flow printer path: generate the printer instructions for the order
 * and send them over the webview bridge, then wait for KioskPrintingFinished
 * before completing (mirroring post-purchase printing). Shared by the booking
 * list and detail screens. The place comes from the order, falling back to the kiosk's
 * onsite setup (always loaded on a bootstrapped kiosk) and then to the browsed plan, so
 * printing works for a customer who goes straight to manage-booking without browsing.
 * Errors if the kiosk has no partner/place at all (e.g. off-device).
 */
@Injectable({ providedIn: 'root' })
export class BookingTicketPrintService {
  readonly #printerService = inject(PrinterService);
  readonly #partnerService = inject(PartnerService);
  readonly #webviewMessenger = inject(WebviewMessengerService);
  readonly #kioskStorageService = inject(KioskStorageService);
  readonly #kioskService = inject(KioskService);

  print(order: BookingOrderDetail): Observable<void> {
    const partnerId = this.#partnerService.getPartner()?.id;
    const placeId =
      order.place_id ?? this.#kioskStorageService.getOnsiteSetup()?.place?.id ?? this.#kioskStorageService.getPlan()?.place?.id;
    if (partnerId === undefined || placeId === undefined) {
      return throwError(() => new Error('Cannot print tickets: missing kiosk partner or place'));
    }
    const unifyTickets = this.#kioskStorageService.getOnsiteSetup()?.print_tickets_combined ?? true;
    const confirmationTimeoutMs = APPROX_PRINT_REQUEST_TIME_MS + this.#getTicketSlipCount(order, unifyTickets) * PRINT_TIME_PER_SLIP_MS;
    return this.#printerService
      .generatePrinterInstructions(partnerId, order.plan_id, placeId, order.id, PrinterDocumentType.ticket, unifyTickets)
      .pipe(
        mergeMap(response => checkResponseData(response)),
        retry(3),
        tap(response =>
          this.#webviewMessenger.sendWebViewMessage(new PrintOrderMessageV2({ instructions: response.data ?? [], order_id: order.id })),
        ),
        mergeMap(() =>
          this.#webviewMessenger.observeOnce<PrintingFinished>(MessageType.KioskPrintingFinished).pipe(
            timeout(confirmationTimeoutMs),
            catchError(() => of(null)),
          ),
        ),
        tap(result => this.#logPrintOutcome(order.id, result)),
        map(result => {
          if (result && !result.success) {
            throw new Error(result.reason ?? 'Print failed');
          }
        }),
      );
  }

  #logPrintOutcome(orderId: number, result: PrintingFinished | null): void {
    if (result === null) {
      this.#kioskService.logTrace(`Booking ticket print not confirmed, timed out R${orderId}`, DatadogLogLevel.Warn, {
        order_id: orderId,
        timed_out: true,
      });
    } else if (result.success) {
      this.#kioskService.logTrace(`Booking ticket printed R${orderId}`, DatadogLogLevel.Info, { order_id: orderId, success: true });
    } else {
      this.#kioskService.logTrace(`Booking ticket print failed R${orderId}`, DatadogLogLevel.Error, {
        order_id: orderId,
        reason: result.reason,
        success: false,
      });
    }
  }

  #getTicketSlipCount(order: BookingOrderDetail, unifyTickets: boolean): number {
    if (unifyTickets) {
      return 1;
    }
    return order.tickets.reduce((total, ticket) => total + (ticket.ticket_number ?? 1), 0) || 1;
  }
}

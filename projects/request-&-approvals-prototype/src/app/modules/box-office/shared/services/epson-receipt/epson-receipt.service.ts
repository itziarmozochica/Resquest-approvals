import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { PrintReceiptMessageModel } from '@fz-original/app/shared/services/webview-messenger/models/print-receipt-message.model';
import { WebviewMessengerService } from '@fz-original/app/shared/services/webview-messenger/webview-messenger.service';
import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { PrinterDocumentType, PrinterInstruction } from '../../../../kiosk/services/printer/models/printer-instruction.model';
import { PrinterService as ThermalPrinterService } from '../../../../kiosk/services/printer/printer.service';
import { ReceiptPrinterType } from '../../models/onsite-setup';
import { OnsiteSetupsStorageService } from '../onsite-setups/onsite-setups-storage.service';

export interface EpsonReceiptPrintOptions {
  printReceiptOnEmptyRefund?: boolean;
}

@Injectable({ providedIn: 'root' })
export class EpsonReceiptService {
  readonly #thermalPrinterService = inject(ThermalPrinterService);
  readonly #webviewMessengerService = inject(WebviewMessengerService);
  readonly #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  readonly #datadogLogService = inject(DatadogLogService);

  isEpsonReceiptPrinter(): boolean {
    return this.#onsiteSetupsStorageService.getConfiguration()?.receipt_printer_type === ReceiptPrinterType.epson;
  }

  // Returns true if instructions were sent to the WebView, or when a refund document has nothing to print
  // (fever2 sends no refund slip for a cancellation with no refund request); false otherwise.
  // `printReceiptOnEmptyRefund` prints the purchase receipt instead of nothing, for a reprint the operator asked for.
  printReceipt$(
    partnerId: number,
    planId: number,
    placeId: number,
    orderId: number,
    documentType: PrinterDocumentType = PrinterDocumentType.receipt,
    { printReceiptOnEmptyRefund = false }: EpsonReceiptPrintOptions = {},
  ): Observable<boolean> {
    return this.#thermalPrinterService.generatePrinterInstructions(partnerId, planId, placeId, orderId, documentType, false).pipe(
      switchMap((response: BaseResponse<PrinterInstruction[]>) => {
        const instructions: PrinterInstruction[] | null = response.data;
        if (instructions != null && instructions.length > 0) {
          this.#webviewMessengerService.sendWebViewMessage(new PrintReceiptMessageModel({ instructions }));
          return of(true);
        }
        if (documentType === PrinterDocumentType.refund && response.error == null) {
          // Expected: fever2 answers an empty refund slip whenever it finds no accepted refund to print (a manual refund it stores as
          // none, a rejected refund, a zero amount, or a cancellation of only fever-only add-ons).
          this.#datadogLogService.logInfo('Epson receipt: nothing to print for the refund document', {
            orderId,
            documentType,
            printsReceiptInstead: printReceiptOnEmptyRefund,
            reason: 'refund_slip_empty',
          });
          return printReceiptOnEmptyRefund
            ? this.printReceipt$(partnerId, planId, placeId, orderId, PrinterDocumentType.receipt)
            : of(true);
        }
        this.#datadogLogService.logInfo('Epson receipt: backend returned no instructions', {
          orderId,
          documentType,
          error: response.error,
        });
        return of(false);
      }),
      catchError((error: unknown) => {
        this.#datadogLogService.logError('Epson receipt: failed to fetch instructions', { orderId, documentType, error });
        return of(false);
      }),
    );
  }
}

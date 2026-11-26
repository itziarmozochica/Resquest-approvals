import { inject, Injectable, Injector } from '@angular/core';

import { PrintDialogService } from '@fz-original/app/app/services/print-dialog/print-dialog.service';
import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import {
  CutterTypeEnum,
  OboPrinterTypeEnum,
  OnsiteSetup,
  PaperTypeEnum,
} from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { OnsiteSetupsStorageService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { Order } from '../../models/order/order.model';
import { PrintOrderInput } from '../../models/order/printer-order.model';
import { isNotPrintableOrders } from '../../utils/print-orders.util';
import { PartnerService } from '../partner/partner.service';
import { PrintFacadeService } from '../print-facade/print-facade.service';
import { PrinterErrors } from '../zebra-printer/models/printer-errors.enum';
import { ZebraPrinter } from '../zebra-printer/models/zebra-printer.model';
import { ZebraPrinterService } from '../zebra-printer/zebra-printer.service';
import { FolioZeroPrintOptions, FolioZeroPrintPreview } from './models/folio-zero-print-preview.model';
import { ZEBRA_ZPL_PRINT_TRACKING } from './models/zebra-zpl-print-tracking.token';
import { ZebraZplSetup } from './models/zebra-zpl.model';
import { zebraPrinter } from './tracking/events/zebra-printer.event';
import { isPrinterError, toDesktopPrinterLookupError, toDesktopSendError, toFolioZeroPrinterError } from './utils/printer-error.util';
import { ZebraZplBuilderService } from './zebra-zpl-builder.service';

const errorsThatNeedANewPrinter: readonly PrinterErrors[] = [
  PrinterErrors.UnableEstablishConnection,
  PrinterErrors.NoDefaultPrinterConfigured,
  PrinterErrors.UnauthorizedDeviceError,
];

@Injectable({
  providedIn: 'root',
})
export class ZebraZplPrintService {
  static readonly downloadKey = 'boxOffice.order.zebraPrinter.buttons.download';
  static readonly errorKeyPrefix = 'boxOffice.order.zebraPrinter.errors.';
  static readonly questionKey = 'boxOffice.order.zebraPrinter.question';
  static readonly titleKey = 'boxOffice.order.zebraPrinter.title';

  readonly #datadogLogService = inject(DatadogLogService);
  readonly #fzTracking = inject(ZEBRA_ZPL_PRINT_TRACKING);
  readonly #injector = inject(Injector);
  readonly #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  readonly #partnerService = inject(PartnerService);
  readonly #printDialogService = inject(PrintDialogService);
  readonly #translateService = inject(TranslateService);
  readonly #zebraPrinterService = inject(ZebraPrinterService);
  readonly #zebraZplBuilderService = inject(ZebraZplBuilderService);

  isZebraPrinter(): boolean {
    return this.#onsiteSetupsStorageService.getConfiguration()?.obo_printer_type === OboPrinterTypeEnum.zebra_printer_v2;
  }

  async print(orders: PrintOrderInput[]): Promise<void> {
    if (isNotPrintableOrders(orders.map((input: PrintOrderInput) => input.order))) {
      return;
    }
    const orderIds = orders.map((input: PrintOrderInput) => input.order.id);
    this.#datadogLogService.logInfo(`[ZebraPrinter] Requested to print the following orders in zebra : ${orderIds.join(', ')}`, {
      orderIds,
      planNames: orders.map((input: PrintOrderInput) => input.order.planName),
    });

    this.#zebraPrinterService.getDefaultPrinter().then(
      (printer: ZebraPrinter) => {
        const zpl = this.#buildOrdersZpl(orders);
        if (zpl.length > 0) {
          void this.#send(printer, zpl, orders);
        }
      },
      (error: unknown) => {
        void this.#handlePrintError(null, this.#buildOrdersZpl(orders), orders, toDesktopPrinterLookupError(error));
      },
    );
  }

  async printFolioZero(preview: FolioZeroPrintPreview, options?: FolioZeroPrintOptions): Promise<void> {
    const sessionTypes = preview.selectedSessionTypes;
    if (sessionTypes.length === 0) {
      return;
    }

    this.#datadogLogService.logInfo('[ZebraPrinter] Folio 0 print requested', {
      placeId: preview.placeId,
      planId: preview.planId,
      typesCount: sessionTypes.length,
    });

    const zpl = this.#zebraZplBuilderService.buildFolioZeroZpl(preview, this.#getSetup());

    if (zpl.length === 0) {
      return;
    }

    try {
      const printer = await this.#zebraPrinterService.getDefaultPrinter();
      await this.#zebraPrinterService.sendToPrinter(zpl, preview.planId);
      this.#datadogLogService.logInfo('[ZebraPrinter] Folio 0 print sent to zebra', {
        planId: preview.planId,
        printer: printer.name,
        typesCount: sessionTypes.length,
      });
    } catch (error) {
      const printerError = toFolioZeroPrinterError(error);
      this.#datadogLogService.logError('[ZebraPrinter] Folio 0 print failed', {
        error: printerError,
        planId: preview.planId,
      });
      options?.onBeforeErrorDialog?.();
      const shouldRetry = await firstValueFrom(
        this.#printDialogService.confirmRetry(this.#translate(ZebraZplPrintService.titleKey), this.#translateError(printerError)),
      );
      if (shouldRetry) {
        return this.printFolioZero(preview, options);
      }
      throw printerError;
    }
  }

  #buildOrdersZpl(orders: PrintOrderInput[]): string {
    const zpl = this.#zebraZplBuilderService.buildOrdersZpl(orders, this.#getSetup());
    if (zpl.length > 0) {
      orders.forEach((input: PrintOrderInput) => this.#logReceiptDecision(input.order));
    }

    return zpl;
  }

  #getSetup(): ZebraZplSetup {
    const onsiteSetup: OnsiteSetup | null = this.#onsiteSetupsStorageService.getConfiguration();

    return {
      hasCutter: onsiteSetup?.cutter_type === CutterTypeEnum.basic_cutter,
      paperType: onsiteSetup?.paper_type ?? PaperTypeEnum.basic_paper,
    };
  }

  async #handlePrintError(
    printer: ZebraPrinter | null,
    zpl: string,
    orders: PrintOrderInput[],
    error: unknown,
    afterRetry = false,
  ): Promise<void> {
    const errorMessage = String(error);
    const orderIds = orders.map((input: PrintOrderInput) => input.order.id);
    const planNames = orders.map((input: PrintOrderInput) => input.order.planName);
    const errorMessageTranslate = this.#translateError(errorMessage);
    this.#datadogLogService.logError(`[ZebraPrinter] Error printing orders ${orderIds}, error: ${errorMessage}`, {
      afterRetry,
      error: { id: errorMessage, message: errorMessageTranslate },
      orderIds,
      planNames,
      printer,
    });
    orders.forEach((input: PrintOrderInput) =>
      this.#track(input.order, { afterRetry, errorMessage, errorMessageTranslate, printer: printer?.name, success: false, zpl }),
    );

    const shouldRetry = await firstValueFrom(
      this.#printDialogService.confirmRetry(
        this.#translate(ZebraZplPrintService.titleKey),
        `${errorMessageTranslate}\n${this.#translate(ZebraZplPrintService.questionKey)}`,
        { cancelLabel: this.#translate(ZebraZplPrintService.downloadKey) },
      ),
    );

    if (!shouldRetry) {
      this.#datadogLogService.logWarn(`[ZebraPrinter] User avoid retry and download orders as PDF: ${orderIds.join(', ')}`, {
        error,
        orderId: orderIds,
        planName: planNames,
        printer,
      });
      this.#printFacadeService.openTickets(orders, { shouldDownload: true });
      return;
    }

    this.#datadogLogService.logWarn(`[ZebraPrinter] User retry to print orders: ${orderIds.join(', ')}`, {
      error,
      orderIds,
      planName: planNames,
      printer,
    });
    if (printer && !(isPrinterError(error) && errorsThatNeedANewPrinter.includes(error))) {
      void this.#send(printer, zpl, orders, true);
      return;
    }
    this.#zebraPrinterService.getDefaultPrinter().then(
      (configuredPrinter: ZebraPrinter) => {
        void this.#send(configuredPrinter, zpl, orders, true);
      },
      (lookupError: unknown) => {
        void this.#handlePrintError(null, this.#buildOrdersZpl(orders), orders, toDesktopPrinterLookupError(lookupError));
      },
    );
  }

  #logReceiptDecision(order: Order): void {
    const partnerId = this.#partnerService.getPartner()?.id;
    const context = { orderId: order.id, partnerId, planName: order.planName };
    this.#datadogLogService.logInfo(`[ZebraPrinter] Current partnerId value previous print receipt:  ${partnerId}`, context);
    this.#datadogLogService.logInfo(
      this.#zebraZplBuilderService.shouldPrintReceipt() ? '[ZebraPrinter] Printing receipt' : '[ZebraPrinter] Not printing receipt',
      context,
    );
  }

  get #printFacadeService(): PrintFacadeService {
    return this.#injector.get(PrintFacadeService);
  }

  async #send(printer: ZebraPrinter, zpl: string, orders: PrintOrderInput[], afterRetry = false): Promise<void> {
    const orderIds = orders.map((input: PrintOrderInput) => input.order.id);
    const planNames = orders.map((input: PrintOrderInput) => input.order.planName);

    try {
      this.#datadogLogService.logInfo(`[ZebraPrinter] Sending orders ${orderIds.join(', ')} to zebra`, {
        afterRetry,
        orderIds,
        planNames,
        printer,
      });

      await this.#zebraPrinterService.sendToPrinter(zpl, orderIds[0]);

      this.#datadogLogService.logInfo(`[ZebraPrinter] Orders ${orderIds.join(', ')} printed`, { afterRetry, orderIds, planNames, printer });
      orders.forEach((input: PrintOrderInput) => this.#track(input.order, { afterRetry, printer: printer.name, success: true, zpl }));
    } catch (error) {
      await this.#handlePrintError(printer, zpl, orders, toDesktopSendError(error), afterRetry);
    }
  }

  #track(
    order: Order,
    outcome: {
      afterRetry: boolean;
      success: boolean;
      zpl: string;
      errorMessage?: string;
      errorMessageTranslate?: string;
      printer?: string;
    },
  ): void {
    if (outcome.success && (order.id === undefined || order.planName === undefined)) {
      return;
    }
    this.#fzTracking.track(zebraPrinter({ orderId: order.id, planName: order.planName, ...outcome }));
  }

  #translate(key: string): string {
    return this.#translateService.instant(key);
  }

  #translateError(error: string): string {
    return this.#translateService.instant(ZebraZplPrintService.errorKeyPrefix + error) ?? error;
  }
}

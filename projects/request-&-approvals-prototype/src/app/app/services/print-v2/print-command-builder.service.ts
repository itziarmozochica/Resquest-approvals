import { inject, Injectable } from '@angular/core';

import {
  CutterTypeEnum,
  HardwareTypeEnum,
  OboPrinterTypeEnum,
  OnsiteSetup,
  PaperTypeEnum,
} from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { OnsiteSetupsStorageService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';
import { OrderPrintingService } from '@fz-original/app/modules/box-office/shared/services/order-printing/order-printing.service';
import { Order } from '@fz-original/app/shared/models/order/order.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { DeviceService } from '@fz-original/app/shared/services/device/device.service';
import { DualScreenStorageService } from '@fz-original/app/shared/services/dual-screen/dual-screen-storage.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';

import {
  PrintableObject,
  PrintCommand,
  PrintCommandBuildError,
  PrintCommandBuildResult,
  PrintCommandDocumentType,
  printCommandMaxCodeIdsPerPrintable,
  PrintCommandPrinterType,
  PrintCommandRenderType,
  PrinterSpecificConfig,
  ZebraPrinterConfig,
} from './models/print-command.model';
import { toPrintDeviceHardwareType } from './utils/print-device-hardware-type.util';

export interface PrintJob {
  forceBrowserPdf: boolean;
  orders: Order[];
  shouldDownload: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PrintCommandBuilderService {
  readonly #deviceService = inject(DeviceService);
  readonly #dualScreenStorageService = inject(DualScreenStorageService);
  readonly #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  readonly #orderPrintingService = inject(OrderPrintingService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #partnerService = inject(PartnerService);

  build(job: PrintJob, locale: string): PrintCommandBuildResult {
    const printableOrders: Order[] = this.getPrintableOrders(job.orders);
    if (printableOrders.length === 0) {
      return { error: PrintCommandBuildError.no_printable_orders };
    }
    const partnerId: number | undefined = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined) {
      return { error: PrintCommandBuildError.no_partner };
    }
    const onsiteSetupId: string | undefined = this.#onsiteSetupsStorageService.getConfiguration()?.id;

    return {
      command: this.#toCommand(job, printableOrders, this.#toContext(partnerId, onsiteSetupId, locale), this.resolvePrinterType(job)),
    };
  }

  getPrintableOrders(orders: Order[]): Order[] {
    return orders
      .map((order: Order) => order.withoutTransactionFeeAccessTickets())
      .filter((order: Order) => (order.accessTickets?.size ?? 0) > 0);
  }

  resolvePrinterType(job: PrintJob): PrintCommandPrinterType {
    if (job.forceBrowserPdf) {
      return PrintCommandPrinterType.browser_pdf;
    }

    const configuration: OnsiteSetup | null = this.#onsiteSetupsStorageService.getConfiguration();
    if (configuration === null) {
      return PrintCommandPrinterType.browser_pdf;
    }

    switch (configuration.obo_printer_type) {
      case OboPrinterTypeEnum.adyen_printer:
        return this.#resolveAdyenSetupPrinterType();
      case OboPrinterTypeEnum.zebra_printer_v2:
        return PrintCommandPrinterType.zebra;
      default:
        return PrintCommandPrinterType.browser_pdf;
    }
  }

  /**
   * The print() path never reaches the terminal, so an Adyen setup prints as a browser PDF: a desktop
   * opens it, and a dual screen is blocked by the browser-PDF adapter as a setup without a printer,
   * which is what that setup is. A mobile POS keeps the adyen type and the legacy route.
   */
  #resolveAdyenSetupPrinterType(): PrintCommandPrinterType {
    return toPrintDeviceHardwareType(this.#deviceService.getFeverzoneDeviceType()) === null
      ? PrintCommandPrinterType.adyen
      : PrintCommandPrinterType.browser_pdf;
  }

  #toCommand(job: PrintJob, orders: Order[], context: PrintCommand['context'], printerType: PrintCommandPrinterType): PrintCommand {
    return {
      context,
      document: {
        documentType: PrintCommandDocumentType.ticket,
        renderType: PrintCommandRenderType.backend,
      },
      printables: orders.flatMap((order: Order) => this.#toPrintables(order, printerType)),
      printer: this.#toPrinterConfig(printerType, job, orders),
    };
  }

  #toPrinterConfig(printerType: PrintCommandPrinterType, job: PrintJob, orders: Order[]): PrinterSpecificConfig {
    switch (printerType) {
      case PrintCommandPrinterType.browser_pdf:
        return { isForced: job.forceBrowserPdf, printerType, shouldDownload: job.shouldDownload };
      case PrintCommandPrinterType.zebra:
        return this.#toZebraPrinterConfig(orders);
      default:
        return { printerType };
    }
  }

  #toZebraPrinterConfig(orders: Order[]): ZebraPrinterConfig {
    const configuration = this.#onsiteSetupsStorageService.getConfiguration();

    return {
      appVersion: this.#dualScreenStorageService.getData()?.versionApp ?? null,
      cutterType: configuration?.cutter_type ?? CutterTypeEnum.none,
      paperType: configuration?.paper_type ?? PaperTypeEnum.basic_paper,
      printerType: PrintCommandPrinterType.zebra,
      shouldCutEveryTicket: this.#isEnabledForPlan(FeatureFlags.ZEBRA_PRINTER_CUT_EVERY_TICKET, orders[0]),
    };
  }

  #toPrintables(order: Order, printerType: PrintCommandPrinterType): PrintableObject[] {
    const unifyTickets = this.#resolveUnifyTickets(order);
    const hidePrice = this.#resolveHidePrice(order);
    const shouldRotate =
      printerType === PrintCommandPrinterType.zebra && !this.#isEnabledForPlan(FeatureFlags.DUAL_SCREEN_NOT_ROTATE_TICKET, order);
    const codeIds: string[] = unifyTickets ? [] : Array.from(order.accessTickets?.keys() ?? []);
    const codeIdBatches: string[][] = printerType === PrintCommandPrinterType.browser_pdf ? this.#toBatches(codeIds) : [codeIds];

    return codeIdBatches.map((batch: string[]): PrintableObject => ({ codeIds: batch, hidePrice, order, shouldRotate, unifyTickets }));
  }

  #toBatches(codeIds: string[]): string[][] {
    if (codeIds.length <= printCommandMaxCodeIdsPerPrintable) {
      return [codeIds];
    }

    return Array.from({ length: Math.ceil(codeIds.length / printCommandMaxCodeIdsPerPrintable) }, (_: unknown, index: number) =>
      codeIds.slice(index * printCommandMaxCodeIdsPerPrintable, (index + 1) * printCommandMaxCodeIdsPerPrintable),
    );
  }

  #isEnabledForPlan(flag: FeatureFlags, order: Order | undefined): boolean {
    return this.#optimizelyService.isFeatureEnabled(flag, { plan_id: order?.planId?.toString() ?? '' }) === true;
  }

  #toContext(partnerId: number, onsiteSetupId: string | undefined, locale: string): PrintCommand['context'] {
    return {
      deviceHardwareType: toPrintDeviceHardwareType(this.#deviceService.getFeverzoneDeviceType()),
      deviceType: this.#deviceService.getDeviceType(),
      locale,
      onsiteSetupId,
      partnerId,
      setupHardwareType: this.#onsiteSetupsStorageService.getConfiguration()?.hardware_type ?? HardwareTypeEnum.unknown,
    };
  }

  #resolveHidePrice(order: Order): boolean {
    const isEnabled = this.#optimizelyService.isFeatureEnabled({
      optimizelyFeatureKey: FeatureFlags.HIDE_RESELLER_ORDER_PRICE_IN_TICKETS,
      team: 'b2b-resellers',
    });

    return !!(isEnabled && order.reservationId);
  }

  #resolveUnifyTickets(order: Order): boolean {
    if (order.planId === undefined) {
      return false;
    }

    return this.#orderPrintingService.isUnifiedTicket(this.#onsiteSetupsStorageService.getConfiguration(), order.planId);
  }
}

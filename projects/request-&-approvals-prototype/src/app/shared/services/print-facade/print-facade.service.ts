import { inject, Injectable, Injector } from '@angular/core';

import { datadogRum } from '@datadog/browser-rum-slim';
import { PrintCommandPrinterType, PrintV2Outcome } from '@fz-original/app/app/services/print-v2/models/print-command.model';
import { PrintLegacyReason, PrintRoute, PrintRouteType } from '@fz-original/app/app/services/print-v2/models/print-route.model';
import { PrintCommandBuilderService, PrintJob } from '@fz-original/app/app/services/print-v2/print-command-builder.service';
import { PrintRoutingService } from '@fz-original/app/app/services/print-v2/print-routing.service';
import { PrintV2Service } from '@fz-original/app/app/services/print-v2/print-v2.service';
import { PrinterService } from '@fz-original/app/app/services/printer/printer.service';
import { OnsiteDeviceType } from '@fz-original/app/modules/box-office/shared/models/onsite-device-type.enum';
import { HardwareTypeEnum, OboPrinterTypeEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { AdyenPrinterService } from '@fz-original/app/modules/box-office/shared/services/adyen-printer/adyen-printer.service';
import { EfstaReprintService } from '@fz-original/app/modules/box-office/shared/services/efsta-fiscal/efsta-reprint.service';
import { FranceDuplicateReceiptService } from '@fz-original/app/modules/box-office/shared/services/efsta-fiscal/france-duplicate-receipt.service';
import { EpsonReceiptService } from '@fz-original/app/modules/box-office/shared/services/epson-receipt/epson-receipt.service';
import { OnsiteSetupsStorageService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';
import { OnsiteSetupsService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups.service';
import { Order } from '@fz-original/app/shared/models/order/order.model';
import { DeviceService } from '@fz-original/app/shared/services/device/device.service';
import { DualScreenStorageService } from '@fz-original/app/shared/services/dual-screen/dual-screen-storage.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { TicketSmallGeneratorService } from '@fz-original/app/shared/services/ticket-pdf-generator/ticket-small-generator.service';
import { ZebraZplPrintService } from '@fz-original/app/shared/services/zebra-zpl-print/zebra-zpl-print.service';
import { defer, map, Observable, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { FeverzoneDeviceType, PrintDocumentType, PrintEntryPoint, PrintPrinterType } from './print-facade.enums';

export type PrintFacadeMethod =
  | 'downloadTickets'
  | 'openTickets'
  | 'print'
  | 'printAdyen'
  | 'printFolioZero'
  | 'printReceipt$'
  | 'printTickets'
  | 'reprintReceipt';

export type UntrackedPrintFacadeMethod = 'downloadTickets' | 'findFranceFiscalSale' | 'loadPdfLibrary' | 'registerDuplicate';

export interface OpenTicketsOptions {
  shouldDownload: boolean;
}

type TicketPrintOrder = { order: Order; isUnifiedTicket?: boolean };

type AnyPrintFacadeMethod = PrintFacadeMethod | UntrackedPrintFacadeMethod;

type PrintPipeline = 'legacy' | 'new_pipeline' | 'skipped';

type PrintPipelineLegacyReason = PrintLegacyReason | 'not_routed';

interface PrintPipelineContext {
  pipeline: PrintPipeline;
  legacyReason?: PrintPipelineLegacyReason;
  routedPrinterType?: PrintCommandPrinterType;
}

export interface PrintDispatchTarget<M extends AnyPrintFacadeMethod> {
  args: Parameters<PrintFacadeService[M]>;
  method: M;
}

export interface PrintDispatchRequest<M extends PrintFacadeMethod> {
  documentType: PrintDocumentType;
  entryPoint: PrintEntryPoint;
  printerType: PrintPrinterType;
  target: PrintDispatchTarget<M>;
}

const EAGERLY_EXECUTED_METHODS: ReadonlySet<PrintFacadeMethod> = new Set(['downloadTickets', 'printFolioZero', 'printTickets']);

const notRoutedPipelineContext: PrintPipelineContext = { legacyReason: 'not_routed', pipeline: 'legacy' };

@Injectable({ providedIn: 'root' })
export class PrintFacadeService {
  #hasAttemptedHardwareTypeSync = false;

  readonly #injector = inject(Injector);

  get #adyenPrinterService(): AdyenPrinterService {
    return this.#injector.get(AdyenPrinterService);
  }

  get #deviceService(): DeviceService {
    return this.#injector.get(DeviceService);
  }

  get #dualScreenStorageService(): DualScreenStorageService {
    return this.#injector.get(DualScreenStorageService);
  }

  get #efstaReprintService(): EfstaReprintService {
    return this.#injector.get(EfstaReprintService);
  }

  get #epsonReceiptService(): EpsonReceiptService {
    return this.#injector.get(EpsonReceiptService);
  }

  get #franceDuplicateReceiptService(): FranceDuplicateReceiptService {
    return this.#injector.get(FranceDuplicateReceiptService);
  }

  get #onsiteSetupsService(): OnsiteSetupsService {
    return this.#injector.get(OnsiteSetupsService);
  }

  get #onsiteSetupsStorageService(): OnsiteSetupsStorageService {
    return this.#injector.get(OnsiteSetupsStorageService);
  }

  get #partnerService(): PartnerService {
    return this.#injector.get(PartnerService);
  }

  get #printCommandBuilderService(): PrintCommandBuilderService {
    return this.#injector.get(PrintCommandBuilderService);
  }

  get #printerService(): PrinterService {
    return this.#injector.get(PrinterService);
  }

  get #printRoutingService(): PrintRoutingService {
    return this.#injector.get(PrintRoutingService);
  }

  get #printV2Service(): PrintV2Service {
    return this.#injector.get(PrintV2Service);
  }

  get #ticketSmallGeneratorService(): TicketSmallGeneratorService {
    return this.#injector.get(TicketSmallGeneratorService);
  }

  get #zebraZplPrintService(): ZebraZplPrintService {
    return this.#injector.get(ZebraZplPrintService);
  }

  dispatch<M extends PrintFacadeMethod>(request: PrintDispatchRequest<M>): ReturnType<PrintFacadeService[M]> {
    const result = this.#invoke(request.target);
    if (result instanceof Observable && !EAGERLY_EXECUTED_METHODS.has(request.target.method)) {
      return defer(() => {
        this.#trackPrintRequest(request);
        this.#syncHardwareType();
        return result;
      }) as ReturnType<PrintFacadeService[M]>;
    }
    this.#trackPrintRequest(request);
    this.#syncHardwareType();
    return result;
  }

  dispatchUntracked<M extends UntrackedPrintFacadeMethod>(target: PrintDispatchTarget<M>): ReturnType<PrintFacadeService[M]> {
    return this.#invoke(target);
  }

  #invoke<M extends AnyPrintFacadeMethod>(target: PrintDispatchTarget<M>): ReturnType<PrintFacadeService[M]> {
    const mirrors: { [K in AnyPrintFacadeMethod]: (...args: Parameters<PrintFacadeService[K]>) => ReturnType<PrintFacadeService[K]> } = {
      downloadTickets: (...args) => this.downloadTickets(...args),
      findFranceFiscalSale: (...args) => this.findFranceFiscalSale(...args),
      loadPdfLibrary: (...args) => this.loadPdfLibrary(...args),
      openTickets: (...args) => this.openTickets(...args),
      print: (...args) => this.print(...args),
      printAdyen: (...args) => this.printAdyen(...args),
      printFolioZero: (...args) => this.printFolioZero(...args),
      printReceipt$: (...args) => this.printReceipt$(...args),
      printTickets: () => this.printTickets(),
      registerDuplicate: (...args) => this.registerDuplicate(...args),
      reprintReceipt: (...args) => this.reprintReceipt(...args),
    };
    return mirrors[target.method](...target.args);
  }

  #trackPrintRequest<M extends PrintFacadeMethod>(request: PrintDispatchRequest<M>): void {
    if (!environment.datadog.rum.enabled) {
      return;
    }
    const pipelineContext: PrintPipelineContext | undefined = this.#resolvePipelineContext(request);
    datadogRum.addAction('print_request', {
      document_type: request.documentType,
      entry_point: request.entryPoint,
      feverzone_device_type: this.#resolveDeviceType(),
      legacy_reason: pipelineContext?.legacyReason,
      method: request.target.method,
      onsite_setup_id: this.#onsiteSetupsStorageService.getConfiguration()?.id ?? null,
      partner_id: this.#partnerService.getActingOrganizationId(),
      pipeline: pipelineContext?.pipeline,
      printer_type: request.printerType,
      routed_printer_type: pipelineContext?.routedPrinterType,
    });
  }

  #resolvePipelineContext<M extends PrintFacadeMethod>(request: PrintDispatchRequest<M>): PrintPipelineContext | undefined {
    const resolvers: { [K in PrintFacadeMethod]?: (...args: Parameters<PrintFacadeService[K]>) => PrintPipelineContext } = {
      downloadTickets: () => notRoutedPipelineContext,
      openTickets: (orders, options) =>
        this.#routePipeline(this.#toPrintJob(orders, { forceBrowserPdf: true, shouldDownload: options.shouldDownload })),
      print: orders => this.#routePipeline(this.#toPrintJob(orders, { forceBrowserPdf: false, shouldDownload: true })),
      printFolioZero: () => notRoutedPipelineContext,
      printTickets: () => notRoutedPipelineContext,
    };
    return resolvers[request.target.method]?.(...request.target.args);
  }

  #routePipeline(job: PrintJob): PrintPipelineContext {
    const route: PrintRoute = this.#printRoutingService.resolve(job);
    const routedPrinterType: PrintCommandPrinterType = this.#printCommandBuilderService.resolvePrinterType(job);
    switch (route.type) {
      case PrintRouteType.legacy:
        return { legacyReason: route.reason, pipeline: 'legacy', routedPrinterType };
      case PrintRouteType.revamped:
        return { pipeline: 'new_pipeline', routedPrinterType };
      case PrintRouteType.skipped:
        return { pipeline: 'skipped', routedPrinterType };
    }
  }

  #resolveDeviceType(): FeverzoneDeviceType {
    return this.#deviceService.getFeverzoneDeviceType();
  }

  #toPrintJob(orders: TicketPrintOrder[], routing: Omit<PrintJob, 'orders'>): PrintJob {
    return { ...routing, orders: orders.map(({ order }: TicketPrintOrder) => order) };
  }

  #syncHardwareType(): void {
    try {
      if (this.#hasAttemptedHardwareTypeSync) {
        return;
      }
      const deviceType = this.#resolveDeviceType();
      if (deviceType === FeverzoneDeviceType.mobile_pos) {
        return;
      }
      const configuration = this.#onsiteSetupsStorageService.getConfiguration();
      if (configuration === null || configuration.device_type === OnsiteDeviceType.MOBILE_POS) {
        return;
      }
      if (configuration.hardware_type !== HardwareTypeEnum.unknown) {
        return;
      }
      const placeId = configuration.place_id ?? configuration.place?.id;
      if (placeId === undefined) {
        return;
      }
      const hardwareType: HardwareTypeEnum =
        deviceType === FeverzoneDeviceType.dual_screen ? HardwareTypeEnum.dual_screen : HardwareTypeEnum.desktop;
      this.#hasAttemptedHardwareTypeSync = true;
      this.#onsiteSetupsService.updateOnsiteSetupHardwareType(placeId, configuration.id, hardwareType).subscribe({
        next: () => {
          const currentConfiguration = this.#onsiteSetupsStorageService.getConfiguration();
          if (currentConfiguration?.id === configuration.id) {
            this.#onsiteSetupsStorageService.setConfiguration({ ...currentConfiguration, hardware_type: hardwareType });
          }
        },
        error: () => undefined,
      });
    } catch {
      return;
    }
  }

  resolveTicketPrinterType(): PrintPrinterType {
    if (this.#dualScreenStorageService.containsData()) {
      return PrintPrinterType.zebra;
    }
    switch (this.#onsiteSetupsStorageService.getConfiguration()?.obo_printer_type) {
      case OboPrinterTypeEnum.no_printer:
        return PrintPrinterType.no_printer;
      case OboPrinterTypeEnum.zebra_printer_v2:
        return PrintPrinterType.zebra;
      default:
        return PrintPrinterType.browser_pdf;
    }
  }

  isEpsonReceiptPrinter(): boolean {
    return this.#epsonReceiptService.isEpsonReceiptPrinter();
  }

  openTickets(orders: TicketPrintOrder[], options: OpenTicketsOptions): void {
    const job = this.#toPrintJob(orders, { forceBrowserPdf: true, shouldDownload: options.shouldDownload });
    const route = this.#printRoutingService.resolve(job);
    switch (route.type) {
      case PrintRouteType.legacy:
        if (options.shouldDownload) {
          this.#ticketSmallGeneratorService.downloadTickets(orders);
        }
        this.#ticketSmallGeneratorService.printTickets();
        return;
      case PrintRouteType.revamped:
        this.#printV2Service.print(job).subscribe();
        return;
      case PrintRouteType.skipped:
        return;
    }
  }

  print(orders: TicketPrintOrder[]): Observable<void> {
    return defer(() => {
      const job = this.#toPrintJob(orders, { forceBrowserPdf: false, shouldDownload: true });
      const route = this.#printRoutingService.resolve(job);
      switch (route.type) {
        case PrintRouteType.legacy:
          return this.#printerService.print(orders);
        case PrintRouteType.revamped:
          return this.#printV2Service.print(job).pipe(
            map((outcome: PrintV2Outcome): void => {
              if (outcome === PrintV2Outcome.pdf_requested) {
                this.openTickets(orders, { shouldDownload: true });
              }
            }),
          );
        case PrintRouteType.skipped:
          return of(undefined);
      }
    });
  }

  printAdyen(...args: Parameters<AdyenPrinterService['printAdyen']>): ReturnType<AdyenPrinterService['printAdyen']> {
    return this.#adyenPrinterService.printAdyen(...args);
  }

  printReceipt$(...args: Parameters<EpsonReceiptService['printReceipt$']>): ReturnType<EpsonReceiptService['printReceipt$']> {
    return this.#epsonReceiptService.printReceipt$(...args);
  }

  reprintReceipt(...args: Parameters<EfstaReprintService['reprintReceipt']>): ReturnType<EfstaReprintService['reprintReceipt']> {
    return this.#efstaReprintService.reprintReceipt(...args);
  }

  findFranceFiscalSale(
    ...args: Parameters<FranceDuplicateReceiptService['findFiscalSale']>
  ): ReturnType<FranceDuplicateReceiptService['findFiscalSale']> {
    return this.#franceDuplicateReceiptService.findFiscalSale(...args);
  }

  registerDuplicate(
    ...args: Parameters<FranceDuplicateReceiptService['registerDuplicate']>
  ): ReturnType<FranceDuplicateReceiptService['registerDuplicate']> {
    return this.#franceDuplicateReceiptService.registerDuplicate(...args);
  }

  printTickets(): void {
    this.#ticketSmallGeneratorService.printTickets();
  }

  downloadTickets(
    ...args: Parameters<TicketSmallGeneratorService['downloadTickets']>
  ): ReturnType<TicketSmallGeneratorService['downloadTickets']> {
    return this.#ticketSmallGeneratorService.downloadTickets(...args);
  }

  printFolioZero(...args: Parameters<ZebraZplPrintService['printFolioZero']>): ReturnType<ZebraZplPrintService['printFolioZero']> {
    return this.#zebraZplPrintService.printFolioZero(...args);
  }

  loadPdfLibrary(
    ...args: Parameters<TicketSmallGeneratorService['loadPdfLibrary']>
  ): ReturnType<TicketSmallGeneratorService['loadPdfLibrary']> {
    return this.#ticketSmallGeneratorService.loadPdfLibrary(...args);
  }
}

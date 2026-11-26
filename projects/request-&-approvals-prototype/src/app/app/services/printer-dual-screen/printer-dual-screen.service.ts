import { inject, Injectable } from '@angular/core';

import { isSemanticVersionGreaterOrEqual, isSemanticVersionGreaterThan } from '@fz-original/app/app/utils/version.util';
import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { CutterTypeEnum, OboPrinterTypeEnum, PaperTypeEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { OnsiteSetupsStorageService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';
import { MessageModalComponent } from '@fz-original/app/shared/components/message-modal/message-modal.component';
import { SpinnerModalComponent } from '@fz-original/app/shared/components/spinner-modal/spinner-modal.component';
import { AccessTicket } from '@fz-original/app/shared/models/order/access-ticket.model';
import { Order } from '@fz-original/app/shared/models/order/order.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { DualScreenStorageService } from '@fz-original/app/shared/services/dual-screen/dual-screen-storage.service';
import {
  PrintDocumentRenderError,
  PrintDocumentRenderFailureReason,
} from '@fz-original/app/shared/services/ticket-pdf-generator/errors/print-document-render.error';
import { HtmlRenderResult } from '@fz-original/app/shared/services/ticket-pdf-generator/models/html-render-result.model';
import { TicketGeneratorFacadeService } from '@fz-original/app/shared/services/ticket-pdf-generator/ticket-generator-facade.service';
import { FinishPrintOrder } from '@fz-original/app/shared/services/webview-messenger/models/finish-print-order.model';
import {
  PrintImagesBackfeedSequence,
  PrintImagesCut,
  PrintImagesMessage,
  PrintImagesMetadata,
  PrintImagesPaper,
} from '@fz-original/app/shared/services/webview-messenger/models/print-images-message.model';
import {
  PrintOrderImageMessage,
  PrintOrderImageMessageOrderPayload,
} from '@fz-original/app/shared/services/webview-messenger/models/print-order-image-message.model';
import { MessageType, WebviewMessengerService } from '@fz-original/app/shared/services/webview-messenger/webview-messenger.service';
import { PrinterErrors } from '@fz-original/app/shared/services/zebra-printer/models/printer-errors.enum';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { animationFrames, defer, EMPTY, filter, from, Observable, of, race, throwError, timer } from 'rxjs';
import { catchError, concatMap, defaultIfEmpty, delay, finalize, map, reduce, switchMap, take, tap, timeout } from 'rxjs/operators';

import { DualScreenPrinterStatus } from '../../enums/dual-screen-printer-status.enum';
import { RetryFromChunkError } from '../../errors/retry-from-chunk.error';
import { RetryFromMultiOrderChunkError } from '../../errors/retry-from-multi-order-chunk.error';
import { UserDeclinedRetryError } from '../../errors/user-declined-retry.error';
import { DualScreenData } from '../../models/dual-screen-data.model';

export interface DualScreenPrintOrder {
  isHidePriceEnabled: boolean;
  isUnifiedTicket: boolean;
  order: Order;
}

// The failure families of a print, coarse enough to group on and stable enough to build a metric from.
// The raw printerStatus rides alongside `printer-status-error` because the SLO deliberately excludes the
// user-recoverable conditions (paper out, head open, USB unplugged, paused) and needs the status to do it.
export type PrintFailureReason = 'finish-timeout' | 'html-render-failure' | 'printer-status-error' | 'ticket-generation-failure';

// Every exit of the print pipeline resolves to one of these, so the single terminal event cannot be missed
// and cannot be emitted twice. Two exits — a declined printer retry and a declined HTML render — complete
// normally today, so an observer at the top cannot tell them from a success without this.
// `error` carries the failure that must still reach the caller: printer.service.ts logs and swallows it, so
// converting those exits into plain values would silently change behaviour outside this service.
export interface PrintOutcome {
  attempts: number;
  result: 'failure' | 'success';
  error?: Error;
  printerStatus?: DualScreenPrinterStatus;
  reason?: PrintFailureReason;
}

// The two rendering paths only differ in where a chunk's images come from: pdfmake generates them per
// chunk, the HTML path renders the whole order up front and slices it. Everything after that — batching,
// retry-from-chunk, loader progress and printer status mapping — is shared.
type ChunkImageProducer = (chunkOrder: Order, chunkIndex: number, attempt: number) => Observable<string[]>;

// Same seam for the multi-order pipeline: a chunk there holds slices of several orders instead of one
// order, so the producer receives the chunk itself. pdfmake generates it, the HTML path slices it out of
// the images rendered up front for the whole batch.
type MultiOrderChunkImageProducer = (chunkOrders: DualScreenPrintOrder[], chunkIndex: number, attempt: number) => Observable<string[]>;

// Carried by every log this service emits. During a staged rollout the two paths are otherwise
// indistinguishable in Datadog: error rates cannot be split, durations cannot be compared, and there is no
// way to confirm the flag is taking effect for a given plan.
type TicketRenderPath = 'html' | 'pdfmake';

@Injectable({
  providedIn: 'root',
})
export class PrinterDualScreenService {
  static readonly htmlRenderTimeoutMs = 60_000;
  static readonly loaderPaintFallbackMs = 100;
  static readonly printBatchSize = 20;
  static readonly printImagesMinVersion = '1.12.0';
  static readonly printTimeoutMs = 60_000;
  #datadogLogService = inject(DatadogLogService);
  #printLoaderModalRef: NgbModalRef | null = null;
  #dualScreenStorageService = inject(DualScreenStorageService);
  #modal = inject(NgbModal);
  #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  #optimizelyService = inject(OptimizelyService);
  #ticketGeneratorFacade = inject(TicketGeneratorFacadeService);
  #translateService = inject(TranslateService);
  #webviewMessengerService = inject(WebviewMessengerService);

  get #cutterType(): CutterTypeEnum {
    return this.#onsiteSetupsStorageService.getConfiguration()?.cutter_type ?? CutterTypeEnum.none;
  }

  get #paperType(): PaperTypeEnum {
    return this.#onsiteSetupsStorageService.getConfiguration()?.paper_type ?? PaperTypeEnum.basic_paper;
  }

  get #isZebraPrinter(): boolean {
    return this.#onsiteSetupsStorageService.getConfiguration()?.obo_printer_type === OboPrinterTypeEnum.zebra_printer_v2;
  }

  get #printerType(): OboPrinterTypeEnum | undefined {
    return this.#onsiteSetupsStorageService.getConfiguration()?.obo_printer_type;
  }

  #supportsPrintImages(): boolean {
    const versionApp: string | undefined = this.#dualScreenStorageService.getData()?.versionApp;
    return versionApp !== undefined && isSemanticVersionGreaterOrEqual(versionApp, PrinterDualScreenService.printImagesMinVersion);
  }

  #printImagesCuts(planId: number | undefined): { finalCut: PrintImagesCut; middleCuts: PrintImagesCut } {
    const finalCut: PrintImagesCut = this.#cutterType === CutterTypeEnum.basic_cutter ? 'full' : 'none';
    const shouldCutEveryTicket: boolean =
      this.#optimizelyService.isFeatureEnabled(FeatureFlags.ZEBRA_PRINTER_CUT_EVERY_TICKET, {
        plan_id: planId?.toString() ?? '',
      }) ?? false;
    return { finalCut, middleCuts: shouldCutEveryTicket ? finalCut : 'none' };
  }

  // Stock printed on the front needs each label to start away from the mark, and the Android host only
  // applies that to pre-printed paper, so the two travel together whatever the onsite setup says.
  // The backfeed sequence travels with them, chosen by the layout from whether the box office cuts.
  #paperForPrintImages(orders: { order: Order; isUnifiedTicket?: boolean }[]): {
    paperType: PrintImagesPaper;
    backfeedSequence?: PrintImagesBackfeedSequence;
    markOffsetDots?: number;
  } {
    const markOffsetDots: number | undefined = this.#ticketGeneratorFacade.getMarkOffsetDots(orders);
    if (markOffsetDots === undefined) {
      return { paperType: this.#paperTypeForPrintImages() };
    }
    const backfeedSequence: PrintImagesBackfeedSequence | undefined = this.#ticketGeneratorFacade.getBackfeedSequence(
      orders,
      this.#cutterType === CutterTypeEnum.basic_cutter,
    );
    return { ...(backfeedSequence ? { backfeedSequence } : {}), markOffsetDots, paperType: 'pre-printed-paper' };
  }

  #paperTypeForPrintImages(): PrintImagesPaper {
    return this.#paperType === PaperTypeEnum.pre_printed_paper ? 'pre-printed-paper' : 'basic-paper';
  }

  // A unified order renders to a single image no matter how many access tickets it holds, so it must stay
  // whole: batching it would print one partial unified ticket per batch, each reporting only its own
  // slice's ticket count, pricing and QR code instead of the whole order's (B2BO-8003).
  #getExpectedImageCount(order: Order, useUnifiedLayout: boolean): number {
    const ticketCount: number = order.accessTickets?.size ?? 0;
    if (useUnifiedLayout) {
      return ticketCount > 0 ? 1 : 0;
    }
    return ticketCount;
  }

  #getOrderChunks(order: Order, useUnifiedLayout: boolean): Order[] {
    const entries = Array.from(order.accessTickets?.entries() ?? []);
    if (entries.length === 0) {
      return [];
    }
    if (useUnifiedLayout) {
      return [order];
    }
    const chunks: Order[] = [];
    for (let i = 0; i < entries.length; i += PrinterDualScreenService.printBatchSize) {
      const slice = entries.slice(i, i + PrinterDualScreenService.printBatchSize);
      const chunkMap = new Map<string, AccessTicket>(slice);
      const chunkOrder = new Order({ ...order.clone(), accessTickets: chunkMap });
      chunks.push(chunkOrder);
    }
    return chunks;
  }

  // A 60s timeout, a ticket-count mismatch, a 5xx from the endpoint and a canvas that never rasterized all
  // arrive here as a rejected render. Without a machine-readable reason they collapse into one message that
  // can only be told apart by reading the serialized error, so none of them is countable or alertable.
  #getHtmlRenderFailureReason(error: Error): PrintDocumentRenderFailureReason | 'timeout' | 'unknown' {
    if (error instanceof PrintDocumentRenderError) {
      return error.reason;
    }
    return this.#isTimeoutError(error) ? 'timeout' : 'unknown';
  }

  // Stock printed on the front only fits the pre-printed layout, which renders through pdfmake, so it wins
  // over the HTML path the way it wins over the large ticket.
  #isHtmlTicketRenderingEnabled(order: Order): boolean {
    if (this.#ticketGeneratorFacade.getMarkOffsetDots([{ order }]) !== undefined) {
      return false;
    }
    return (
      this.#optimizelyService.isFeatureEnabled(
        { optimizelyFeatureKey: FeatureFlags.HTML_TICKET_RENDERING, team: 'b2b-onsite' },
        { plan_id: order.planId?.toString() ?? '' },
      ) ?? false
    );
  }

  willRenderHtml(orders: Order[]): boolean {
    const printableOrders: Order[] = orders.filter((order: Order) => this.#hasPrintableTickets(order));
    return printableOrders.length > 0 && printableOrders.every((order: Order) => this.#isHtmlTicketRenderingEnabled(order));
  }

  print(order: Order, useUnifiedLayout: boolean, isHidePriceEnabled: boolean): Observable<void> {
    const dualScreenData: DualScreenData | null = this.#dualScreenStorageService.getData();
    const renderPath: TicketRenderPath = this.#isHtmlTicketRenderingEnabled(order) ? 'html' : 'pdfmake';
    const datadogPayload = this.#getDatadogPayload(order, useUnifiedLayout, dualScreenData, renderPath);
    this.#datadogLogService.logInfo('[Printer][DualScreen] Start printing', datadogPayload);
    if (dualScreenData === null || !isSemanticVersionGreaterThan(dualScreenData.versionApp, '1.0.5')) {
      this.#datadogLogService.logWarn('[Printer][DualScreen] Box office min version error', {
        ...datadogPayload,
        versionApp: dualScreenData?.versionApp,
      });
      this.#showAdyenConfigurationError();
      return of(undefined);
    }
    if (!this.#isZebraPrinter) {
      this.#datadogLogService.logWarn('[Printer][DualScreen] Printer configuration error', {
        ...datadogPayload,
        printerType: this.#printerType,
      });
      return this.#showPrinterErrorMessageDialog(PrinterErrors.DualScreenPrinterNotConfigured).pipe(
        filter((shouldRetry: boolean) => shouldRetry),
        switchMap(() => this.print(order, useUnifiedLayout, isHidePriceEnabled)),
      );
    }
    const chunkOrders = this.#getOrderChunks(order, useUnifiedLayout);
    if (chunkOrders.length === 0) {
      this.#datadogLogService.logWarn('[Printer][DualScreen] No tickets to print', datadogPayload);
      return of(undefined);
    }

    const logMessage =
      chunkOrders.length > 1
        ? '[Printer][DualScreen] Generating images in base64 (batched)'
        : '[Printer][DualScreen] Generating images in base64';
    this.#datadogLogService.logInfo(logMessage, {
      ...datadogPayload,
      chunkCount: chunkOrders.length,
    });

    const shouldRotate = !this.#optimizelyService.isFeatureEnabled(FeatureFlags.DUAL_SCREEN_NOT_ROTATE_TICKET, {
      plan_id: order.planId?.toString() ?? '',
    });

    if (renderPath === 'html') {
      return this.#emitPrintOutcome(
        this.#printFromHtml(order, useUnifiedLayout, isHidePriceEnabled, chunkOrders, shouldRotate, datadogPayload),
        datadogPayload,
      );
    }

    return this.#emitPrintOutcome(
      this.#runChunkPipelineWithRetry(
        order,
        useUnifiedLayout,
        isHidePriceEnabled,
        chunkOrders,
        0,
        datadogPayload,
        renderPath,
        1,
        (chunkOrder: Order, _chunkIndex: number, attempt: number) =>
          this.#generateBase64ForChunk(
            chunkOrder,
            useUnifiedLayout,
            isHidePriceEnabled,
            shouldRotate,
            this.#withAttempt(datadogPayload, attempt),
          ),
      ),
      datadogPayload,
    );
  }

  printOrders(orders: DualScreenPrintOrder[]): Observable<void> {
    if (orders.length === 0) {
      return of(undefined);
    }

    if (orders.length === 1) {
      const [printOrder] = orders;
      return this.print(printOrder.order, printOrder.isUnifiedTicket, printOrder.isHidePriceEnabled);
    }

    const printableOrders = this.#getPrintableOrders(orders);
    // The flag is resolved per plan and a batch can span plans. Rendering part of one print job through
    // partners and the rest through pdfmake would hand the operator a single stack of tickets carrying two
    // different layouts, so a batch only takes the HTML path when every plan in it is enabled.
    const enabledFlags: boolean[] = printableOrders.map((printOrder: DualScreenPrintOrder) =>
      this.#isHtmlTicketRenderingEnabled(printOrder.order),
    );
    const isHtmlRenderingEnabled: boolean = printableOrders.length > 0 && enabledFlags.every((isEnabled: boolean) => isEnabled);
    const renderPath: TicketRenderPath = isHtmlRenderingEnabled ? 'html' : 'pdfmake';

    const mainPrintOrder = orders[0];
    const dualScreenData: DualScreenData | null = this.#dualScreenStorageService.getData();
    const datadogPayload = this.#getDatadogPayload(mainPrintOrder.order, mainPrintOrder.isUnifiedTicket, dualScreenData, renderPath);
    this.#datadogLogService.logInfo('[Printer][DualScreen] Start printing multiple orders', {
      ...datadogPayload,
      orderIds: orders.map(printOrder => printOrder.order.id),
    });

    if (dualScreenData === null || !isSemanticVersionGreaterThan(dualScreenData.versionApp, '1.0.5')) {
      this.#datadogLogService.logWarn('[Printer][DualScreen] Box office min version error', {
        ...datadogPayload,
        versionApp: dualScreenData?.versionApp,
      });
      this.#showAdyenConfigurationError();
      return of(undefined);
    }

    if (!this.#isZebraPrinter) {
      this.#datadogLogService.logWarn('[Printer][DualScreen] Printer configuration error', {
        ...datadogPayload,
        printerType: this.#printerType,
      });
      return this.#showPrinterErrorMessageDialog(PrinterErrors.DualScreenPrinterNotConfigured).pipe(
        filter((shouldRetry: boolean) => shouldRetry),
        switchMap(() => this.printOrders(orders)),
      );
    }

    if (printableOrders.length === 0) {
      this.#datadogLogService.logWarn('[Printer][DualScreen] No tickets to print', datadogPayload);
      return of(undefined);
    }

    const printOrderChunks = this.#getPrintOrderChunks(printableOrders);
    this.#datadogLogService.logInfo('[Printer][DualScreen] Generating images in base64 (multi-order)', {
      ...datadogPayload,
      chunkCount: printOrderChunks.length,
      orderCount: printableOrders.length,
    });

    if (isHtmlRenderingEnabled) {
      return this.#emitPrintOutcome(this.#printOrdersFromHtml(printableOrders, printOrderChunks, datadogPayload), datadogPayload);
    }

    if (enabledFlags.some((isEnabled: boolean) => isEnabled)) {
      this.#datadogLogService.logWarn('[Printer][DualScreen] Mixed HTML ticket rendering flag across a multi-order print', {
        ...datadogPayload,
        planIds: printableOrders.map((printOrder: DualScreenPrintOrder) => printOrder.order.planId),
      });
    }

    return this.#emitPrintOutcome(
      this.#runMultiOrderPipelineWithRetry(
        printOrderChunks,
        0,
        datadogPayload,
        1,
        (chunkOrders: DualScreenPrintOrder[], _chunkIndex: number, attempt: number) =>
          this.#generateBase64ForOrders(chunkOrders, this.#withAttempt(datadogPayload, attempt)),
      ),
      datadogPayload,
    );
  }

  #generateBase64ForChunk(
    chunkOrder: Order,
    useUnifiedLayout: boolean,
    isHidePriceEnabled: boolean,
    shouldRotate: boolean,
    datadogPayload: Record<string, unknown>,
  ): Observable<string[]> {
    return this.#generatePdfBase64(
      { isHidePriceEnabled, isUnifiedTicket: useUnifiedLayout, order: chunkOrder },
      shouldRotate,
      datadogPayload,
    ).pipe(
      catchError((error: Error) => {
        this.#datadogLogService.logError('[Printer][DualScreen] Ticket/PDF generation failed', {
          ...datadogPayload,
          error: this.#getDatadogErrorPayload(error),
        });
        this.#showTicketGenerationError();
        return throwError(() => error);
      }),
    );
  }

  #generateBase64ForOrders(orders: DualScreenPrintOrder[], datadogPayload: Record<string, unknown>): Observable<string[]> {
    return from(orders).pipe(
      concatMap((printOrder: DualScreenPrintOrder) =>
        this.#generatePdfBase64(printOrder, this.#shouldRotateOrder(printOrder.order), datadogPayload),
      ),
      reduce((allImages: string[], orderImages: string[]) => [...allImages, ...orderImages], []),
      catchError((error: Error) => {
        this.#datadogLogService.logError('[Printer][DualScreen] Ticket/PDF generation failed', {
          ...datadogPayload,
          error: this.#getDatadogErrorPayload(error),
        });
        this.#showTicketGenerationError();
        return throwError(() => error);
      }),
    );
  }

  // Measured from the same boundary as the HTML path's own success log — the call into the generator
  // facade to the resolved base64 list — so `totalDurationMs` is comparable across `renderPath` in
  // Datadog regardless of which path produced it.
  #generatePdfBase64(
    printOrder: DualScreenPrintOrder,
    shouldRotate: boolean,
    datadogPayload: Record<string, unknown>,
  ): Observable<string[]> {
    const startedAt: number = performance.now();
    return from(this.#ticketGeneratorFacade.getBase64Tickets([printOrder], shouldRotate)).pipe(
      tap((images: string[]) =>
        this.#logTicketGenerationSucceeded(startedAt, datadogPayload, images.length, printOrder.order, printOrder.isUnifiedTicket),
      ),
    );
  }

  // `datadogPayload` is built once per batch from the first order, so a multi-order print reusing it as-is
  // would attribute every order's log to that first order. Re-deriving `order` from whichever order this
  // call is actually reporting on keeps orderId/plan/tickets/user correct per iteration. `useUnifiedTicket`
  // needs the same treatment: it is resolved per plan, so a batch spanning plans that differ on unify would
  // otherwise report the first order's layout for all of them and disagree with the `unifyTickets` that
  // `Ticket HTML render succeeded` logged for the same attempt.
  #logTicketGenerationSucceeded(
    startedAt: number,
    datadogPayload: Record<string, unknown>,
    imageCount: number,
    order: Order,
    useUnifiedLayout: boolean,
  ): void {
    this.#datadogLogService.logInfo('[Printer][DualScreen] Ticket generation succeeded', {
      ...datadogPayload,
      order: this.#getOrderDatadogInfo(order),
      useUnifiedTicket: useUnifiedLayout,
      imageCount,
      totalDurationMs: Math.round(performance.now() - startedAt),
    });
  }

  // The batch size bounds the images carried by one message to Android, so orders are packed by the
  // images they render to and not by their ticket count: a unified order contributes a single image and
  // is added whole, while a plain one contributes an image per ticket and may still be split.
  #getPrintOrderChunks(orders: DualScreenPrintOrder[]): DualScreenPrintOrder[][] {
    const chunks: DualScreenPrintOrder[][] = [];
    let currentChunk: DualScreenPrintOrder[] = [];
    let currentChunkImageCount = 0;

    const closeCurrentChunk = (): void => {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentChunkImageCount = 0;
      }
    };

    for (const printOrder of orders) {
      const entries = Array.from(printOrder.order.accessTickets?.entries() ?? []);
      if (entries.length === 0) {
        continue;
      }

      if (printOrder.isUnifiedTicket) {
        if (currentChunkImageCount === PrinterDualScreenService.printBatchSize) {
          closeCurrentChunk();
        }
        currentChunk.push(printOrder);
        currentChunkImageCount += this.#getExpectedImageCount(printOrder.order, true);
        continue;
      }

      for (let start = 0; start < entries.length; ) {
        if (currentChunkImageCount === PrinterDualScreenService.printBatchSize) {
          closeCurrentChunk();
        }

        const availableSpace = PrinterDualScreenService.printBatchSize - currentChunkImageCount;
        const slice = entries.slice(start, start + availableSpace);
        const chunkMap = new Map<string, AccessTicket>(slice);
        const chunkOrder = new Order({ ...printOrder.order.clone(), accessTickets: chunkMap });
        currentChunk.push({ ...printOrder, order: chunkOrder });
        currentChunkImageCount += slice.length;
        start += slice.length;
      }
    }

    closeCurrentChunk();

    return chunks;
  }

  #processFinishPrintMessage(
    message: FinishPrintOrder,
    order: Order,
    chunkIndex: number,
    fullChunkOrders: Order[],
    useUnifiedLayout: boolean,
    isHidePriceEnabled: boolean,
    datadogPayload: Record<string, unknown>,
  ): Observable<void> {
    this.#datadogLogService.logInfo('[Printer][DualScreen] Receiving finish print order message from Android', {
      ...datadogPayload,
      printerStatus: message.code,
    });
    const printerStatus: DualScreenPrinterStatus = this.#getPrinterStatus(message);
    if (printerStatus !== DualScreenPrinterStatus.printerSuccess) {
      return this.#handlePrinterError(printerStatus).pipe(
        switchMap((shouldRetry: boolean) =>
          shouldRetry
            ? throwError(
                () =>
                  new RetryFromChunkError('User requested retry', chunkIndex, fullChunkOrders, order, useUnifiedLayout, isHidePriceEnabled),
              )
            : throwError(() => new UserDeclinedRetryError('User declined retry', printerStatus)),
        ),
      );
    }
    return EMPTY;
  }

  #processFinishPrintOrdersMessage(
    message: FinishPrintOrder,
    chunkIndex: number,
    datadogPayload: Record<string, unknown>,
  ): Observable<void> {
    this.#datadogLogService.logInfo('[Printer][DualScreen] Receiving finish print order message from Android', {
      ...datadogPayload,
      printerStatus: message.code,
    });
    const printerStatus: DualScreenPrinterStatus = this.#getPrinterStatus(message);
    if (printerStatus === DualScreenPrinterStatus.printerSuccess) {
      return EMPTY;
    }

    return this.#handlePrinterError(printerStatus).pipe(
      switchMap((shouldRetry: boolean) => {
        if (!shouldRetry) {
          return throwError(() => new UserDeclinedRetryError('User declined retry', printerStatus));
        }

        return throwError(() => new RetryFromMultiOrderChunkError('User requested retry', chunkIndex));
      }),
    );
  }

  #runChunkPipeline(
    order: Order,
    useUnifiedLayout: boolean,
    isHidePriceEnabled: boolean,
    chunkOrdersSubset: Order[],
    fullChunkOrders: Order[],
    startChunkIndex: number,
    datadogPayload: Record<string, unknown>,
    attempt: number,
    produceImages: ChunkImageProducer,
  ): Observable<void> {
    return from(chunkOrdersSubset).pipe(
      concatMap((chunkOrder: Order, indexInSubset: number) => {
        const chunkIndex = startChunkIndex + indexInSubset;
        this.#updatePrintLoaderProgress(chunkIndex + 1, fullChunkOrders.length);
        return produceImages(chunkOrder, chunkIndex, attempt).pipe(
          switchMap((base64Images: string[]) =>
            this.#sendPrintOrderAndWaitForFinish(order, chunkOrder, useUnifiedLayout, base64Images, datadogPayload),
          ),
          switchMap((message: FinishPrintOrder) =>
            this.#processFinishPrintMessage(
              message,
              order,
              chunkIndex,
              fullChunkOrders,
              useUnifiedLayout,
              isHidePriceEnabled,
              datadogPayload,
            ),
          ),
        );
      }),
      defaultIfEmpty(undefined),
    );
  }

  #runChunkPipelineWithRetry(
    order: Order,
    useUnifiedLayout: boolean,
    isHidePriceEnabled: boolean,
    chunkOrders: Order[],
    startChunkIndex: number,
    datadogPayload: Record<string, unknown>,
    renderPath: TicketRenderPath,
    attempt: number,
    produceImages: ChunkImageProducer,
  ): Observable<PrintOutcome> {
    const subset = startChunkIndex === 0 ? chunkOrders : chunkOrders.slice(startChunkIndex);
    const attemptPayload = this.#withAttempt(datadogPayload, attempt);
    return defer(() => {
      this.#printLoaderModalRef = this.#openPrintLoader(chunkOrders.length, startChunkIndex + 1);
      return this.#waitForLoaderPaint().pipe(
        switchMap(() =>
          this.#runChunkPipeline(
            order,
            useUnifiedLayout,
            isHidePriceEnabled,
            subset,
            chunkOrders,
            startChunkIndex,
            attemptPayload,
            attempt,
            produceImages,
          ),
        ),
      );
    }).pipe(
      map((): PrintOutcome => ({ attempts: attempt, result: 'success' })),
      catchError((err: Error) => {
        if (err instanceof UserDeclinedRetryError) {
          this.#datadogLogService.logInfo('[Printer][DualScreen] User declined retry', attemptPayload);
          return of<PrintOutcome>({
            attempts: attempt,
            printerStatus: err.printerStatus,
            reason: 'printer-status-error',
            result: 'failure',
          });
        }
        if (err instanceof RetryFromChunkError) {
          this.#printLoaderModalRef?.close();
          this.#printLoaderModalRef = null;
          const dualScreenData = this.#dualScreenStorageService.getData();
          const payload = this.#getDatadogPayload(err.order, err.useUnifiedLayout, dualScreenData, renderPath);
          return this.#runChunkPipelineWithRetry(
            err.order,
            err.useUnifiedLayout,
            err.isHidePriceEnabled,
            err.chunkOrders,
            err.chunkIndex,
            payload,
            renderPath,
            attempt + 1,
            produceImages,
          );
        }
        // Generation failures and finish-print timeouts still have to reach printer.service.ts, which logs
        // and swallows them. They travel on the outcome so the terminal event can be emitted once, at the
        // boundary, before the error is re-thrown there.
        return of<PrintOutcome>({
          attempts: attempt,
          error: err,
          reason: this.#failureReasonFromError(err),
          result: 'failure',
        });
      }),
      finalize(() => {
        this.#printLoaderModalRef?.close();
        this.#printLoaderModalRef = null;
      }),
    );
  }

  #printFromHtml(
    order: Order,
    useUnifiedLayout: boolean,
    isHidePriceEnabled: boolean,
    chunkOrders: Order[],
    shouldRotate: boolean,
    datadogPayload: Record<string, unknown>,
  ): Observable<PrintOutcome> {
    return this.#fetchHtmlImagesWithRetry(order, shouldRotate, useUnifiedLayout, isHidePriceEnabled, datadogPayload).pipe(
      switchMap((base64Images: string[] | null) =>
        base64Images === null
          ? // The render was retried until the operator gave up, so no chunk was ever sent. `attempts` counts
            // print attempts, and none happened; the render attempts stay visible on `Ticket HTML render failed`.
            of<PrintOutcome>({ attempts: 1, reason: 'html-render-failure', result: 'failure' })
          : this.#runChunkPipelineWithRetry(
              order,
              useUnifiedLayout,
              isHidePriceEnabled,
              chunkOrders,
              0,
              datadogPayload,
              'html',
              1,
              (_chunkOrder: Order, chunkIndex: number) => of(this.#sliceChunkImages(base64Images, chunkIndex)),
            ),
      ),
    );
  }

  #sliceChunkImages(base64Images: string[], chunkIndex: number): string[] {
    const batchStart: number = chunkIndex * PrinterDualScreenService.printBatchSize;
    return base64Images.slice(batchStart, batchStart + PrinterDualScreenService.printBatchSize);
  }

  // The endpoint answers for one order at a time, so a batch of N orders is N requests. They run
  // sequentially — the rasterizer drives a hidden iframe and a canvas per document, and rendering several
  // orders at once on a Zebra Android WebView competes for the same main thread instead of finishing sooner.
  #fetchHtmlImagesForOrdersWithRetry(orders: DualScreenPrintOrder[], datadogPayload: Record<string, unknown>): Observable<string[] | null> {
    return this.#renderHtmlWithRetry(
      () =>
        from(orders).pipe(
          concatMap((printOrder: DualScreenPrintOrder, index: number) => {
            this.#updatePrintLoaderProgress(index + 1, orders.length);
            return this.#renderOrderHtml(
              printOrder.order,
              this.#shouldRotateOrder(printOrder.order),
              printOrder.isUnifiedTicket,
              printOrder.isHidePriceEnabled,
              datadogPayload,
            );
          }),
          reduce((allImages: string[], orderImages: string[]) => [...allImages, ...orderImages], []),
        ),
      orders.length,
      datadogPayload,
      1,
    );
  }

  #fetchHtmlImagesWithRetry(
    order: Order,
    shouldRotate: boolean,
    useUnifiedLayout: boolean,
    isHidePriceEnabled: boolean,
    datadogPayload: Record<string, unknown>,
  ): Observable<string[] | null> {
    return this.#renderHtmlWithRetry(
      () => this.#renderOrderHtml(order, shouldRotate, useUnifiedLayout, isHidePriceEnabled, datadogPayload),
      1,
      datadogPayload,
      1,
    );
  }

  // A failed order fails the whole batch into the retry dialog rather than being skipped: the images are
  // sliced per chunk out of one flat set, so carrying on without an order would shift every later chunk's
  // slice, and falling back to pdfmake for it would mix two layouts in one stack of tickets.
  #renderHtmlWithRetry(
    render: () => Observable<string[]>,
    totalRenders: number,
    datadogPayload: Record<string, unknown>,
    attempt: number,
  ): Observable<string[] | null> {
    return defer(() => {
      const renderLoaderRef: NgbModalRef = this.#openPrintLoader(totalRenders, 1);
      this.#printLoaderModalRef = renderLoaderRef;
      return render().pipe(
        // Only tear down the loader this render opened. The print pipeline replaces the ref as soon as it
        // is subscribed, and closing that one here would drop the printing progress modal.
        finalize(() => {
          if (this.#printLoaderModalRef === renderLoaderRef) {
            renderLoaderRef.close();
            this.#printLoaderModalRef = null;
          }
        }),
      );
    }).pipe(
      catchError((error: Error) => {
        this.#datadogLogService.logError('[Printer][DualScreen] Ticket HTML render failed', {
          ...this.#withAttempt(datadogPayload, attempt),
          error: this.#getDatadogErrorPayload(error),
          reason: this.#getHtmlRenderFailureReason(error),
        });
        return this.#showHtmlRenderErrorMessageDialog().pipe(
          switchMap((shouldRetry: boolean) =>
            shouldRetry ? this.#renderHtmlWithRetry(render, totalRenders, datadogPayload, attempt + 1) : of(null),
          ),
        );
      }),
    );
  }

  #renderOrderHtml(
    order: Order,
    shouldRotate: boolean,
    useUnifiedLayout: boolean,
    isHidePriceEnabled: boolean,
    datadogPayload: Record<string, unknown>,
  ): Observable<string[]> {
    const startedAt: number = performance.now();
    // Nothing inside the render chain can time out on its own — the fetch has no abort signal and the
    // image, font and canvas waits are all unbounded — so the promise underneath keeps running past a
    // `timeout` here, which only tears down this subscription. The abort signal is what tells it to stop
    // rasterizing further documents once this attempt no longer matters.
    const abortController = new AbortController();
    return from(
      this.#ticketGeneratorFacade.getHtmlBase64Tickets(order, shouldRotate, useUnifiedLayout, isHidePriceEnabled, abortController.signal),
    ).pipe(
      // The loader is modal with a static backdrop, so bounding the render here is what gives the operator
      // the retry dialog instead of a stuck spinner. The bound is per order so one slow order in a batch is
      // what times out, not the batch's accumulated time.
      timeout(PrinterDualScreenService.htmlRenderTimeoutMs),
      tap((result: HtmlRenderResult) => this.#assertEveryTicketWasRendered(result.base64Images, order, useUnifiedLayout)),
      // Logged here rather than by `PrintDocumentRendererService` itself, and only after the assert above: that keeps
      // a `count_mismatch` from also logging a success for the same attempt it goes on to fail.
      tap((result: HtmlRenderResult) => this.#logHtmlRenderSucceeded(result, order, useUnifiedLayout)),
      map((result: HtmlRenderResult) => result.base64Images),
      tap((base64Images: string[]) =>
        this.#logTicketGenerationSucceeded(startedAt, datadogPayload, base64Images.length, order, useUnifiedLayout),
      ),
      finalize(() => abortController.abort()),
    );
  }

  // One log for the whole render rather than one per document: the count and the durations are what a
  // rollout monitor needs, and a per-document log would multiply by every ticket of every order. The
  // slowest document rides along because rasterization is the step most likely to be slow on the Zebra
  // Android WebView, and an average hides the one document that ate the timeout.
  #logHtmlRenderSucceeded(result: HtmlRenderResult, order: Order, isUnifiedTicket: boolean): void {
    this.#datadogLogService.logInfo('[Printer][DualScreen] Ticket HTML render succeeded', {
      documentCount: result.documentCount,
      imageCount: result.base64Images.length,
      orderId: order.id,
      planId: order.planId,
      rasterizeDurationMs: result.rasterizeDurationMs,
      renderPath: 'html',
      requestDurationMs: result.requestDurationMs,
      slowestDocumentMs: result.slowestDocumentMs,
      templateLayoutName: result.templateLayoutName,
      unifyTickets: isUnifiedTicket,
    });
  }

  // Each batch slices its images out of the rendered set, so the count has to match exactly: fewer images
  // than tickets prints an incomplete order and still reports success, and more images than tickets prints
  // labels nobody asked for — which is what a whole-order response to a single-ticket reprint looks like.
  // Counting batches instead of tickets misses any mismatch that does not add or remove a whole batch of 20.
  #assertEveryTicketWasRendered(base64Images: string[], order: Order, useUnifiedLayout: boolean): void {
    const expectedImages: number = this.#getExpectedImageCount(order, useUnifiedLayout);
    if (base64Images.length !== expectedImages) {
      throw new PrintDocumentRenderError(
        `Rendered documents do not match the tickets to print (${base64Images.length} images for ${expectedImages} tickets)`,
        'count_mismatch',
      );
    }
  }

  // Batching lays the chunks out in the same order the rendered images arrive — order by order, ticket by
  // ticket — so a chunk's images are the run starting at the count of everything batched before it. The
  // offsets are derived from the chunk list rather than from a cursor so a retry that resumes mid-batch
  // still slices the right run.
  #createChunkImageSlicer(base64Images: string[], printOrderChunks: DualScreenPrintOrder[][]): MultiOrderChunkImageProducer {
    const chunkImageCounts: number[] = printOrderChunks.map((chunkOrders: DualScreenPrintOrder[]) => this.#getChunkImageCount(chunkOrders));
    const chunkImageOffsets: number[] = chunkImageCounts.map((_count: number, index: number) =>
      chunkImageCounts.slice(0, index).reduce((total: number, count: number) => total + count, 0),
    );
    return (_chunkOrders: DualScreenPrintOrder[], chunkIndex: number) =>
      of(base64Images.slice(chunkImageOffsets[chunkIndex], chunkImageOffsets[chunkIndex] + chunkImageCounts[chunkIndex]));
  }

  #getChunkImageCount(chunkOrders: DualScreenPrintOrder[]): number {
    return chunkOrders.reduce(
      (total: number, printOrder: DualScreenPrintOrder) =>
        total + this.#getExpectedImageCount(printOrder.order, printOrder.isUnifiedTicket),
      0,
    );
  }

  #printOrdersFromHtml(
    orders: DualScreenPrintOrder[],
    printOrderChunks: DualScreenPrintOrder[][],
    datadogPayload: Record<string, unknown>,
  ): Observable<PrintOutcome> {
    return this.#fetchHtmlImagesForOrdersWithRetry(orders, datadogPayload).pipe(
      switchMap((base64Images: string[] | null) =>
        base64Images === null
          ? of<PrintOutcome>({ attempts: 1, reason: 'html-render-failure', result: 'failure' })
          : this.#runMultiOrderPipelineWithRetry(
              printOrderChunks,
              0,
              datadogPayload,
              1,
              this.#createChunkImageSlicer(base64Images, printOrderChunks),
            ),
      ),
    );
  }

  #runMultiOrderPipelineWithRetry(
    printOrderChunks: DualScreenPrintOrder[][],
    startChunkIndex: number,
    datadogPayload: Record<string, unknown>,
    attempt: number,
    produceImages: MultiOrderChunkImageProducer,
  ): Observable<PrintOutcome> {
    const subset = startChunkIndex === 0 ? printOrderChunks : printOrderChunks.slice(startChunkIndex);
    const attemptPayload = this.#withAttempt(datadogPayload, attempt);
    return (
      defer(() => {
        this.#printLoaderModalRef = this.#openPrintLoader(printOrderChunks.length, startChunkIndex + 1);
        return this.#waitForLoaderPaint().pipe(
          switchMap(() => from(subset)),
          concatMap((orders: DualScreenPrintOrder[], indexInSubset: number) => {
            const chunkIndex = startChunkIndex + indexInSubset;
            this.#updatePrintLoaderProgress(chunkIndex + 1, printOrderChunks.length);
            return produceImages(orders, chunkIndex, attempt).pipe(
              switchMap((base64Images: string[]) => this.#sendPrintOrdersAndWaitForFinish(orders, base64Images, attemptPayload)),
              switchMap((message: FinishPrintOrder) => this.#processFinishPrintOrdersMessage(message, chunkIndex, attemptPayload)),
            );
          }),
        );
      })
        .pipe(
          map((): PrintOutcome => ({ attempts: attempt, result: 'success' })),
          catchError((err: Error) => {
            if (err instanceof UserDeclinedRetryError) {
              this.#datadogLogService.logInfo('[Printer][DualScreen] User declined retry', attemptPayload);
              return of<PrintOutcome>({
                attempts: attempt,
                printerStatus: err.printerStatus,
                reason: 'printer-status-error',
                result: 'failure',
              });
            }
            if (err instanceof RetryFromMultiOrderChunkError) {
              this.#printLoaderModalRef?.close();
              this.#printLoaderModalRef = null;
              return this.#runMultiOrderPipelineWithRetry(printOrderChunks, err.chunkIndex, datadogPayload, attempt + 1, produceImages);
            }
            return of<PrintOutcome>({
              attempts: attempt,
              error: err,
              reason: this.#failureReasonFromError(err),
              result: 'failure',
            });
          }),
          finalize(() => {
            this.#printLoaderModalRef?.close();
            this.#printLoaderModalRef = null;
          }),
        )
        // Load-bearing here, unlike `#runChunkPipelineWithRetry`: that method's inner `#runChunkPipeline` ends
        // with its own `defaultIfEmpty(undefined)`, so its `map(() => success)` always fires. This pipeline's
        // `from(subset)` has no such fallback, so an all-success run where `concatMap` emits nothing (e.g. an
        // empty subset) completes without a value — this is the only thing that then produces the success outcome.
        .pipe(defaultIfEmpty<PrintOutcome, PrintOutcome>({ attempts: attempt, result: 'success' }))
    );
  }

  #sendPrintOrderAndWaitForFinish(
    order: Order,
    chunkOrder: Order,
    useUnifiedLayout: boolean,
    base64Images: string[],
    datadogPayload: Record<string, unknown>,
  ): Observable<FinishPrintOrder> {
    this.#datadogLogService.logInfo('[Printer][DualScreen] Sending print order image message to Android app', {
      ...datadogPayload,
      base64ImagesCount: base64Images.length,
    });
    if (this.#supportsPrintImages()) {
      const { finalCut, middleCuts } = this.#printImagesCuts(order.planId);
      const metadata: PrintImagesMetadata = {
        orderId: order.id,
        orderPlanName: order.planName,
        orderTicketCodes: chunkOrder.accessTickets
          ? Array.from(chunkOrder.accessTickets.values()).map((t: AccessTicket) => t.code ?? '')
          : undefined,
        orderUserEmail: order.user?.email,
        orderUserId: order.user?.id,
        planId: order.planId,
        useUnifiedTicket: useUnifiedLayout,
        userEmail: order.user?.email,
        userId: order.user?.id,
      };
      this.#webviewMessengerService.sendWebViewMessage(
        new PrintImagesMessage({
          base64Images,
          finalCut,
          metadata,
          middleCuts,
          ...this.#paperForPrintImages([{ isUnifiedTicket: useUnifiedLayout, order }]),
          printer: 'zebra',
        }),
      );
    } else {
      this.#webviewMessengerService.sendWebViewMessage(
        new PrintOrderImageMessage({
          base64Images,
          cutterType: this.#cutterType,
          paperType: this.#paperType,
          orderId: order.id,
          orderPlanName: order.planName,
          orderTicketCodes: chunkOrder.accessTickets
            ? Array.from(chunkOrder.accessTickets.values()).map((t: AccessTicket) => t.code ?? '')
            : undefined,
          orderUserEmail: order.user?.email,
          orderUserId: order.user?.id,
          planId: order.planId,
          userEmail: order.user?.email,
          userId: order.user?.id,
          useUnifiedTicket: useUnifiedLayout,
        }),
      );
    }
    return this.#webviewMessengerService.observeOnce<FinishPrintOrder>(MessageType.FinishPrint).pipe(
      timeout(PrinterDualScreenService.printTimeoutMs),
      catchError((error: Error) => {
        this.#datadogLogService.logError('[Printer][DualScreen] Error waiting for finish print from Android', {
          ...datadogPayload,
          error: this.#getDatadogErrorPayload(error),
          reason: this.#isTimeoutError(error) ? 'timeout' : 'error',
        });
        this.#showPrinterTimeoutError();
        return throwError(() => error);
      }),
    );
  }

  #sendPrintOrdersAndWaitForFinish(
    orders: DualScreenPrintOrder[],
    base64Images: string[],
    datadogPayload: Record<string, unknown>,
  ): Observable<FinishPrintOrder> {
    this.#datadogLogService.logInfo('[Printer][DualScreen] Sending print order image message to Android app', {
      ...datadogPayload,
      base64ImagesCount: base64Images.length,
      orderCount: orders.length,
    });
    if (this.#supportsPrintImages()) {
      const { finalCut, middleCuts } = this.#printImagesCuts(orders[0]?.order.planId);
      const metadata: PrintImagesMetadata = {
        orderTicketCodes: orders.flatMap(printOrder =>
          Array.from(printOrder.order.accessTickets?.values() ?? []).map((ticket: AccessTicket) => ticket.code ?? ''),
        ),
        orders: this.#getPrintOrderPayloads(orders),
      };
      this.#webviewMessengerService.sendWebViewMessage(
        new PrintImagesMessage({
          base64Images,
          finalCut,
          metadata,
          middleCuts,
          ...this.#paperForPrintImages(orders),
          printer: 'zebra',
        }),
      );
    } else {
      this.#webviewMessengerService.sendWebViewMessage(
        new PrintOrderImageMessage({
          base64Images,
          cutterType: this.#cutterType,
          paperType: this.#paperType,
          orders: this.#getPrintOrderPayloads(orders),
          orderTicketCodes: orders.flatMap(printOrder =>
            Array.from(printOrder.order.accessTickets?.values() ?? []).map((ticket: AccessTicket) => ticket.code ?? ''),
          ),
        }),
      );
    }
    return this.#webviewMessengerService.observeOnce<FinishPrintOrder>(MessageType.FinishPrint).pipe(
      timeout(PrinterDualScreenService.printTimeoutMs),
      catchError((error: Error) => {
        this.#datadogLogService.logError('[Printer][DualScreen] Error waiting for finish print from Android', {
          ...datadogPayload,
          error: this.#getDatadogErrorPayload(error),
          reason: this.#isTimeoutError(error) ? 'timeout' : 'error',
        });
        this.#showPrinterTimeoutError();
        return throwError(() => error);
      }),
    );
  }

  #getPrintOrderPayloads(orders: DualScreenPrintOrder[]): PrintOrderImageMessageOrderPayload[] {
    return orders.map((printOrder: DualScreenPrintOrder) => {
      const order = printOrder.order;
      return {
        orderId: order.id,
        orderPlanName: order.planName,
        orderTicketCodes: Array.from(order.accessTickets?.values() ?? []).map((ticket: AccessTicket) => ticket.code ?? ''),
        orderUserEmail: order.user?.email,
        orderUserId: order.user?.id,
        planId: order.planId,
        userEmail: order.user?.email,
        userId: order.user?.id,
        useUnifiedTicket: printOrder.isUnifiedTicket,
      };
    });
  }

  #openPrintLoader(totalChunks: number, current = 1): NgbModalRef {
    this.#printLoaderModalRef?.close();
    this.#printLoaderModalRef = null;
    const ref: NgbModalRef = this.#modal.open(SpinnerModalComponent, {
      backdrop: 'static',
      keyboard: false,
    });
    ref.componentInstance.message =
      totalChunks > 1
        ? this.#translateService.instant('boxOffice.order.zebraPrinter.printingProgress', {
            current,
            total: totalChunks,
          })
        : this.#translateService.instant('boxOffice.order.zebraPrinter.printing');
    return ref;
  }

  #updatePrintLoaderProgress(current: number, total: number): void {
    if (total <= 1 || !this.#printLoaderModalRef?.componentInstance) {
      return;
    }
    this.#printLoaderModalRef.componentInstance.message = this.#translateService.instant('boxOffice.order.zebraPrinter.printingProgress', {
      current,
      total,
    });
  }

  #getDatadogErrorPayload(error: Error): { msg: string | undefined; name: string | undefined } {
    return { msg: error?.message, name: error?.name };
  }

  #getDatadogPayload(
    order: Order,
    useUnifiedLayout: boolean,
    dualScreenData: DualScreenData | null,
    renderPath: TicketRenderPath,
  ): {
    androidId: string | undefined;
    order: {
      orderId: number | undefined;
      tickets: string[];
      plan: {
        id: number | undefined;
        name: string | undefined;
      };
      user: {
        id: number | undefined;
        email: string | undefined;
        type: string | undefined;
      };
    };
    useUnifiedTicket: boolean;
    cutterType: string;
    renderPath: TicketRenderPath;
  } {
    return {
      androidId: dualScreenData?.androidId,
      order: this.#getOrderDatadogInfo(order),
      renderPath,
      useUnifiedTicket: useUnifiedLayout,
      cutterType: this.#cutterType,
    };
  }

  #getOrderDatadogInfo(order: Order): {
    orderId: number | undefined;
    tickets: string[];
    plan: {
      id: number | undefined;
      name: string | undefined;
    };
    user: {
      id: number | undefined;
      email: string | undefined;
      type: string | undefined;
    };
  } {
    return {
      orderId: order.id,
      tickets: Array.from(order.accessTickets?.values() ?? []).map((ticket: AccessTicket) => ticket.code ?? ''),
      plan: {
        id: order.planId,
        name: order.planName,
      },
      user: {
        id: order.user?.id,
        email: order.user?.email,
        type: order.user?.type,
      },
    };
  }

  #getPrinterError(printerStatus: DualScreenPrinterStatus): PrinterErrors {
    switch (printerStatus) {
      case DualScreenPrinterStatus.printerNotFoundError:
        return PrinterErrors.DualScreenPrinterNotFound;
      case DualScreenPrinterStatus.printerConnectionError:
        return PrinterErrors.SoftwareCausedConnection;
      case DualScreenPrinterStatus.printerNotReadyPaperOutError:
        return PrinterErrors.PaperOut;
      case DualScreenPrinterStatus.printerNotReadyPausedError:
        return PrinterErrors.PrinterPaused;
      case DualScreenPrinterStatus.printerNotReadyHeadTooHotError:
        return PrinterErrors.PrintHeadOverheating;
      case DualScreenPrinterStatus.printerNotReadyHeadOpenError:
        return PrinterErrors.MediaDoorOpen;
      case DualScreenPrinterStatus.printerNotReadyRibbonOutError:
        return PrinterErrors.RibbonOut;
      default:
        return PrinterErrors.UnknownError;
    }
  }

  // Batching already skips orders that render to nothing. Dropping them here as well keeps the render and
  // the flag lookup aligned with the chunks: a ticketless order must not be rendered, and must not be the
  // one plan whose disabled flag pushes the whole batch back onto pdfmake.
  #getPrintableOrders(orders: DualScreenPrintOrder[]): DualScreenPrintOrder[] {
    return orders.filter((printOrder: DualScreenPrintOrder) => this.#hasPrintableTickets(printOrder.order));
  }

  #hasPrintableTickets(order: Order): boolean {
    return (order.accessTickets?.size ?? 0) > 0;
  }

  #getPrinterStatus(payload: FinishPrintOrder): DualScreenPrinterStatus {
    return Object.values(DualScreenPrinterStatus).find(value => value === payload.code) ?? DualScreenPrinterStatus.printerUnknownError;
  }

  #handlePrinterError(printerStatus: DualScreenPrinterStatus): Observable<boolean> {
    const printerError: PrinterErrors = this.#getPrinterError(printerStatus);
    return this.#showPrinterErrorMessageDialog(printerError);
  }

  #shouldRotateOrder(order: Order): boolean {
    return !this.#optimizelyService.isFeatureEnabled(FeatureFlags.DUAL_SCREEN_NOT_ROTATE_TICKET, {
      plan_id: order.planId?.toString() ?? '',
    });
  }

  #showAdyenConfigurationError(): void {
    const modalRef: NgbModalRef = this.#modal.open(MessageModalComponent);
    modalRef.componentInstance.title = this.#translateService.instant('boxOffice.order.adyenPrinter.errors.title');
    modalRef.componentInstance.messages = [this.#translateService.instant('boxOffice.order.adyenPrinter.errors.messages.notSetup')];
    modalRef.componentInstance.acceptButtonLabel = this.#translateService.instant('common.accept');
  }

  #showPrinterErrorMessageDialog(printerError: PrinterErrors): Observable<boolean> {
    const errorMessage: string = printerError.toString();
    const modalRef: NgbModalRef = this.#modal.open(MessageModalComponent, {
      backdrop: 'static',
      keyboard: false,
    });
    const errorMessageTranslate: string =
      this.#translateService.instant('boxOffice.order.zebraPrinter.errors.' + errorMessage) ?? errorMessage;
    modalRef.componentInstance.title = this.#translateService.instant('boxOffice.order.zebraPrinter.title');
    modalRef.componentInstance.messages = [errorMessageTranslate];
    modalRef.componentInstance.acceptButtonLabel = this.#translateService.instant('boxOffice.order.zebraPrinter.buttons.retry');
    modalRef.componentInstance.cancelButtonLabel = this.#translateService.instant('common.cancel');
    return (modalRef.closed as Observable<boolean>).pipe(defaultIfEmpty(false));
  }

  #showHtmlRenderErrorMessageDialog(): Observable<boolean> {
    const modalRef: NgbModalRef = this.#modal.open(MessageModalComponent, {
      backdrop: 'static',
      keyboard: false,
    });
    modalRef.componentInstance.title = this.#translateService.instant('boxOffice.order.zebraPrinter.title');
    modalRef.componentInstance.messages = [this.#translateService.instant('boxOffice.order.zebraPrinter.errors.TicketHtmlRenderFailed')];
    modalRef.componentInstance.acceptButtonLabel = this.#translateService.instant('boxOffice.order.zebraPrinter.buttons.retry');
    modalRef.componentInstance.cancelButtonLabel = this.#translateService.instant('common.cancel');
    return (modalRef.closed as Observable<boolean>).pipe(defaultIfEmpty(false));
  }

  #showPrinterTimeoutError(): void {
    const modalRef: NgbModalRef = this.#modal.open(MessageModalComponent);
    modalRef.componentInstance.messages = [this.#translateService.instant('boxOffice.order.adyenPrinter.errors.messages.timeout')];
    modalRef.componentInstance.acceptButtonLabel = this.#translateService.instant('common.accept');
  }

  #showTicketGenerationError(): void {
    const modalRef: NgbModalRef = this.#modal.open(MessageModalComponent);
    modalRef.componentInstance.title = this.#translateService.instant('boxOffice.order.zebraPrinter.title');
    modalRef.componentInstance.messages = [this.#translateService.instant('boxOffice.order.zebraPrinter.errors.TicketGenerationFailed')];
    modalRef.componentInstance.acceptButtonLabel = this.#translateService.instant('common.accept');
  }

  // Each retry re-runs the pipeline and re-emits the same failure logs, so without a discriminator the
  // SLO's bad-event query counts one failed print once per attempt. `isRetry` is what that query excludes;
  // `attempt` is kept alongside it so the retry depth stays visible in the logs themselves.
  // The one terminal event per print. Good and bad are then the same unit by construction: retries collapse
  // into the print they belong to, and a chunked order counts once instead of once per chunk. `error` is
  // transport for the caller and is deliberately not logged here — the failing site already logged it in full.
  #emitPrintOutcome(outcome$: Observable<PrintOutcome>, datadogPayload: Record<string, unknown>): Observable<void> {
    return outcome$.pipe(
      tap((outcome: PrintOutcome) =>
        this.#datadogLogService.logInfo('[Printer][DualScreen] Print outcome', {
          ...datadogPayload,
          attempts: outcome.attempts,
          result: outcome.result,
          ...(outcome.reason ? { reason: outcome.reason } : {}),
          ...(outcome.printerStatus ? { printerStatus: outcome.printerStatus } : {}),
        }),
      ),
      switchMap((outcome: PrintOutcome) => (outcome.error ? throwError(() => outcome.error) : of(undefined))),
    );
  }

  // Only reached from the chunk / multi-order pipeline `catchError`, which sees just generation failures and
  // finish-print timeouts. HTML render errors never arrive here: `#renderHtmlWithRetry` converts them to
  // `of(null)`, which `#printFromHtml`/`#printOrdersFromHtml` turn into an explicit `html-render-failure`
  // outcome before the pipeline runs.
  #failureReasonFromError(error: Error): PrintFailureReason {
    return this.#isTimeoutError(error) ? 'finish-timeout' : 'ticket-generation-failure';
  }

  #isTimeoutError(error: Error | null | undefined): boolean {
    return error?.name === 'TimeoutError';
  }

  #waitForLoaderPaint(): Observable<unknown> {
    return race(animationFrames(), timer(PrinterDualScreenService.loaderPaintFallbackMs)).pipe(take(1), delay(0));
  }

  #withAttempt(datadogPayload: Record<string, unknown>, attempt: number): Record<string, unknown> {
    return { ...datadogPayload, attempt, isRetry: attempt > 1 };
  }
}

import { inject, Injectable } from '@angular/core';

import { isSemanticVersionGreaterOrEqual, isSemanticVersionGreaterThan } from '@fz-original/app/app/utils/version.util';
import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { FinishPrintOrder } from '@fz-original/app/shared/services/webview-messenger/models/finish-print-order.model';
import {
  PrintImagesBackfeedSequence,
  PrintImagesMessage,
  PrintImagesMetadata,
  PrintImagesPrinterSettings,
} from '@fz-original/app/shared/services/webview-messenger/models/print-images-message.model';
import {
  PrintOrderImageMessage,
  PrintOrderImageMessageOrderPayload,
} from '@fz-original/app/shared/services/webview-messenger/models/print-order-image-message.model';
import { MessageType, WebviewMessengerService } from '@fz-original/app/shared/services/webview-messenger/webview-messenger.service';
import { PrinterErrors } from '@fz-original/app/shared/services/zebra-printer/models/printer-errors.enum';
import { TranslateService } from '@ngx-translate/core';
import { catchError, concatMap, defer, from, map, Observable, switchMap, throwError, timeout, toArray } from 'rxjs';

import { WebViewMessage } from '@feverup/ts-webview';

import { DualScreenPrinterStatus } from '../../enums/dual-screen-printer-status.enum';
import { PrintAdapterError, RenderedPrintable } from '../print-adapter/models/print-adapter.model';
import { PrintAdapter } from '../print-adapter/print.adapter';
import { closingProgress, PrintDialogService } from '../print-dialog/print-dialog.service';
import { PrintBlockedReason, PrintConfigurationBlockedReason } from '../print-v2/models/print-block.model';
import { PrintCommand, PrintCommandPrinterType, ZebraPrinterConfig } from '../print-v2/models/print-command.model';
import { ZebraPrintChunk, ZebraPrintChunkEntry } from '../print-zebra/models/zebra-print-chunk.model';
import { buildZebraPrintChunks } from '../print-zebra/utils/zebra-print-chunks.util';
import { isZebraPrePrintedPaper, resolveZebraCuts, ZebraCuts } from '../print-zebra/utils/zebra-print-settings.util';
import { ZebraPrinterStatusError } from './errors/zebra-printer-status.error';

interface ZebraPrintJob {
  chunks: ZebraPrintChunk[];
  config: ZebraPrinterConfig;
  isMultiOrder: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ZebraDualScreenPrintAdapter extends PrintAdapter {
  static readonly maxUnsupportedAppVersion = '1.0.5';
  static readonly printBatchSize = 20;
  static readonly printImagesMinVersion = '1.12.0';
  static readonly printTimeoutMs = 60_000;
  static readonly printerErrorKeyPrefix = 'boxOffice.order.zebraPrinter.errors.';
  static readonly timeoutKey = 'boxOffice.order.adyenPrinter.errors.messages.timeout';
  static readonly titleKey = 'boxOffice.order.zebraPrinter.title';

  static readonly printerErrorsByStatus: Readonly<Partial<Record<DualScreenPrinterStatus, PrinterErrors>>> = {
    [DualScreenPrinterStatus.printerConnectionError]: PrinterErrors.SoftwareCausedConnection,
    [DualScreenPrinterStatus.printerNotFoundError]: PrinterErrors.DualScreenPrinterNotFound,
    [DualScreenPrinterStatus.printerNotReadyHeadOpenError]: PrinterErrors.MediaDoorOpen,
    [DualScreenPrinterStatus.printerNotReadyHeadTooHotError]: PrinterErrors.PrintHeadOverheating,
    [DualScreenPrinterStatus.printerNotReadyPaperOutError]: PrinterErrors.PaperOut,
    [DualScreenPrinterStatus.printerNotReadyPausedError]: PrinterErrors.PrinterPaused,
    [DualScreenPrinterStatus.printerNotReadyRibbonOutError]: PrinterErrors.RibbonOut,
  };

  readonly #datadogLogService = inject(DatadogLogService);
  readonly #printDialogService = inject(PrintDialogService);
  readonly #translateService = inject(TranslateService);
  readonly #webviewMessengerService = inject(WebviewMessengerService);

  print(documents: RenderedPrintable[], config: ZebraPrinterConfig): Observable<void> {
    return defer(() => {
      const job: ZebraPrintJob = {
        chunks: buildZebraPrintChunks(documents, ZebraDualScreenPrintAdapter.printBatchSize, ZebraDualScreenPrintAdapter.name),
        config,
        isMultiOrder: documents.length > 1,
      };

      return this.#printFrom$(job, 0, 1);
    });
  }

  validate(command: PrintCommand): PrintConfigurationBlockedReason | null {
    const appVersion: string | null = command.printer.printerType === PrintCommandPrinterType.zebra ? command.printer.appVersion : null;
    const isAppSupported: boolean =
      appVersion !== null && isSemanticVersionGreaterThan(appVersion, ZebraDualScreenPrintAdapter.maxUnsupportedAppVersion);

    return isAppSupported ? null : PrintBlockedReason.dual_screen_app_outdated;
  }

  #assertPrinted(printerStatus: DualScreenPrinterStatus, chunkIndex: number): void {
    if (printerStatus !== DualScreenPrinterStatus.printerSuccess) {
      throw new ZebraPrinterStatusError(printerStatus, chunkIndex);
    }
  }

  #getLogPayload(chunk: ZebraPrintChunk, attempt: number): Record<string, unknown> {
    return {
      attempt,
      isRetry: attempt > 1,
      orderCount: chunk.entries.length,
      orderIds: chunk.entries.map((entry: ZebraPrintChunkEntry) => entry.printable.order.id),
      renderPath: 'backend_png',
    };
  }

  #getPrinterErrorMessage(error: ZebraPrinterStatusError): string {
    const printerError: PrinterErrors =
      ZebraDualScreenPrintAdapter.printerErrorsByStatus[error.printerStatus] ?? PrinterErrors.UnknownError;

    return this.#translate(`${ZebraDualScreenPrintAdapter.printerErrorKeyPrefix}${printerError}`);
  }

  #onChunkFailed$(error: unknown, job: ZebraPrintJob, attempt: number): Observable<void> {
    if (error instanceof ZebraPrinterStatusError) {
      return this.#printDialogService
        .confirmRetry(this.#translate(ZebraDualScreenPrintAdapter.titleKey), this.#getPrinterErrorMessage(error))
        .pipe(
          switchMap((shouldRetry: boolean) => {
            if (shouldRetry) {
              return this.#printFrom$(job, error.chunkIndex, attempt + 1);
            }
            this.#datadogLogService.logInfo('[Printer][DualScreen] User declined retry', { attempt, printerStatus: error.printerStatus });
            return throwError(
              () => new PrintAdapterError('The operator declined to retry the print', 'printer-status-error', error.printerStatus),
            );
          }),
        );
    }
    if (error instanceof Error && error.name === 'TimeoutError') {
      this.#datadogLogService.logError('[Printer][DualScreen] Error waiting for finish print from Android', { attempt, reason: 'timeout' });
      this.#printDialogService.showMessage(
        this.#translate(ZebraDualScreenPrintAdapter.titleKey),
        this.#translate(ZebraDualScreenPrintAdapter.timeoutKey),
      );
      return throwError(() => new PrintAdapterError('The printer did not report the print as finished', 'finish-timeout'));
    }

    return throwError(() => error);
  }

  #printFrom$(job: ZebraPrintJob, startChunkIndex: number, attempt: number): Observable<void> {
    return defer(() => {
      const progress = this.#printDialogService.openProgress(job.chunks.length, startChunkIndex + 1);

      return from(job.chunks.slice(startChunkIndex)).pipe(
        concatMap((chunk: ZebraPrintChunk, offset: number) => {
          const chunkIndex: number = startChunkIndex + offset;
          progress.update(chunkIndex + 1);
          return this.#sendAndWaitForFinish$(chunk, job, attempt).pipe(
            map((printerStatus: DualScreenPrinterStatus): void => this.#assertPrinted(printerStatus, chunkIndex)),
          );
        }),
        toArray(),
        closingProgress(progress),
      );
    }).pipe(
      map((): void => undefined),
      catchError((error: unknown) => this.#onChunkFailed$(error, job, attempt)),
    );
  }

  #sendAndWaitForFinish$(chunk: ZebraPrintChunk, job: ZebraPrintJob, attempt: number): Observable<DualScreenPrinterStatus> {
    return defer(() => {
      this.#datadogLogService.logInfo('[Printer][DualScreen] Sending print order image message to Android app', {
        ...this.#getLogPayload(chunk, attempt),
        backfeedSequence: this.#toBackfeedSequence(chunk.printerSettings, resolveZebraCuts(job.config)),
        base64ImagesCount: chunk.base64Images.length,
        markOffsetDots: chunk.printerSettings?.markOffsetDots,
      });
      // A finishPrint that arrived while no batch was in flight answers no print of ours: drop it before asking.
      this.#webviewMessengerService.discardUnconsumed(MessageType.FinishPrint);
      this.#webviewMessengerService.sendWebViewMessage(this.#toMessage(chunk, job));

      return this.#webviewMessengerService.observeOnce<FinishPrintOrder>(MessageType.FinishPrint).pipe(
        timeout(ZebraDualScreenPrintAdapter.printTimeoutMs),
        map((message: FinishPrintOrder): DualScreenPrinterStatus => {
          const printerStatus: DualScreenPrinterStatus = this.#toPrinterStatus(message);
          this.#datadogLogService.logInfo('[Printer][DualScreen] Receiving finish print order message from Android', {
            ...this.#getLogPayload(chunk, attempt),
            printerStatus,
            printerStatusRaw: String(message.code).slice(0, 100),
          });
          return printerStatus;
        }),
      );
    });
  }

  #supportsPrintImages(config: ZebraPrinterConfig): boolean {
    return (
      config.appVersion !== null && isSemanticVersionGreaterOrEqual(config.appVersion, ZebraDualScreenPrintAdapter.printImagesMinVersion)
    );
  }

  // Resolved with the cuts the print is cut with, so the backfeed and the cut always follow the same setting.
  #toBackfeedSequence(printerSettings: PrintImagesPrinterSettings | undefined, cuts: ZebraCuts): PrintImagesBackfeedSequence | undefined {
    if (printerSettings === undefined) {
      return undefined;
    }

    return printerSettings.backfeedBeforeCut && cuts.final === 'full' ? 'before' : 'normal';
  }

  #toMessage(chunk: ZebraPrintChunk, job: ZebraPrintJob): WebViewMessage<unknown> {
    const orderPayloads: PrintOrderImageMessageOrderPayload[] = chunk.entries.map((entry: ZebraPrintChunkEntry) =>
      this.#toOrderPayload(entry),
    );
    const metadata: PrintImagesMetadata = job.isMultiOrder
      ? { orders: orderPayloads, orderTicketCodes: chunk.entries.flatMap((entry: ZebraPrintChunkEntry) => entry.ticketCodes) }
      : orderPayloads[0];

    if (this.#supportsPrintImages(job.config)) {
      const cuts: ZebraCuts = resolveZebraCuts(job.config);
      const { printerSettings } = chunk;
      // The Android host honours the mark offset on pre-printed paper only, so a layout that brings one
      // prints on it whatever the onsite setup says.
      const isPrePrintedPaper: boolean = printerSettings !== undefined || isZebraPrePrintedPaper(job.config);
      return new PrintImagesMessage({
        base64Images: chunk.base64Images,
        finalCut: cuts.final,
        metadata,
        middleCuts: cuts.middle,
        paperType: isPrePrintedPaper ? 'pre-printed-paper' : 'basic-paper',
        printer: 'zebra',
        ...(printerSettings === undefined
          ? {}
          : { backfeedSequence: this.#toBackfeedSequence(printerSettings, cuts), markOffsetDots: printerSettings.markOffsetDots }),
      });
    }

    return new PrintOrderImageMessage({
      ...metadata,
      base64Images: chunk.base64Images,
      cutterType: job.config.cutterType,
      paperType: job.config.paperType,
    });
  }

  #toOrderPayload({ printable, ticketCodes }: ZebraPrintChunkEntry): PrintOrderImageMessageOrderPayload {
    const { order } = printable;

    return {
      orderId: order.id,
      orderPlanName: order.planName,
      orderTicketCodes: ticketCodes,
      orderUserEmail: order.user?.email,
      orderUserId: order.user?.id,
      planId: order.planId,
      userEmail: order.user?.email,
      userId: order.user?.id,
      useUnifiedTicket: printable.unifyTickets,
    };
  }

  #toPrinterStatus(message: FinishPrintOrder): DualScreenPrinterStatus {
    return (
      Object.values(DualScreenPrinterStatus).find((status: DualScreenPrinterStatus) => status === message.code) ??
      DualScreenPrinterStatus.printerUnknownError
    );
  }

  #translate(key: string): string {
    return this.#translateService.instant(key);
  }
}

import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { PrinterErrors } from '@fz-original/app/shared/services/zebra-printer/models/printer-errors.enum';
import { ZebraPrinter } from '@fz-original/app/shared/services/zebra-printer/models/zebra-printer.model';
import { ZebraPrinterService } from '@fz-original/app/shared/services/zebra-printer/zebra-printer.service';
import { TranslateService } from '@ngx-translate/core';
import { catchError, concatMap, defer, from, map, Observable, switchMap, tap, throwError, toArray } from 'rxjs';

import { PrintPdfRequestedError, RenderedPrintable } from '../print-adapter/models/print-adapter.model';
import { PrintAdapter } from '../print-adapter/print.adapter';
import { closingProgress, PrintDialogService } from '../print-dialog/print-dialog.service';
import { PrintConfigurationBlockedReason } from '../print-v2/models/print-block.model';
import { ZebraPrinterConfig } from '../print-v2/models/print-command.model';
import { ZebraImagePixels } from '../print-zebra/models/zebra-image-pixels.model';
import { ZebraPrintChunk, ZebraPrintChunkEntry } from '../print-zebra/models/zebra-print-chunk.model';
import { readPngDataUrlPixels } from '../print-zebra/utils/zebra-png-image.util';
import { buildZebraPrintChunks } from '../print-zebra/utils/zebra-print-chunks.util';
import { toZplGraphicField } from '../print-zebra/utils/zebra-zpl-graphic.util';
import { toZebraBatchZpl } from '../print-zebra/utils/zebra-zpl.util';
import { ZebraDesktopBatchError } from './errors/zebra-desktop-batch.error';

interface ZebraDesktopBatch {
  chunk: ZebraPrintChunk;
  zpl: string;
}

@Injectable({
  providedIn: 'root',
})
export class ZebraDesktopPrintAdapter extends PrintAdapter {
  static readonly downloadKey = 'boxOffice.order.zebraPrinter.buttons.download';
  static readonly printBatchSize = 20;
  static readonly printerErrorKeyPrefix = 'boxOffice.order.zebraPrinter.errors.';
  static readonly retryOrDownloadKey = 'boxOffice.order.zebraPrinter.question';
  static readonly titleKey = 'boxOffice.order.zebraPrinter.title';

  readonly #datadogLogService = inject(DatadogLogService);
  readonly #printDialogService = inject(PrintDialogService);
  readonly #translateService = inject(TranslateService);
  readonly #zebraPrinterService = inject(ZebraPrinterService);

  print(documents: RenderedPrintable[], config: ZebraPrinterConfig): Observable<void> {
    return defer(() => {
      const chunks: ZebraPrintChunk[] = buildZebraPrintChunks(
        documents,
        ZebraDesktopPrintAdapter.printBatchSize,
        ZebraDesktopPrintAdapter.name,
      );

      return from(Promise.all(chunks.map((chunk: ZebraPrintChunk) => this.#toBatch(chunk, config))));
    }).pipe(switchMap((batches: ZebraDesktopBatch[]) => this.#printFrom$(batches, 0, 1)));
  }

  validate(): PrintConfigurationBlockedReason | null {
    return null;
  }

  #getLogPayload(batch: ZebraDesktopBatch, attempt: number): Record<string, unknown> {
    return {
      attempt,
      imageCount: batch.chunk.base64Images.length,
      isRetry: attempt > 1,
      orderCount: batch.chunk.entries.length,
      orderIds: batch.chunk.entries.map((entry: ZebraPrintChunkEntry) => entry.printable.order.id),
      renderPath: 'backend_png',
    };
  }

  #onBatchFailed$(error: unknown, batches: ZebraDesktopBatch[], attempt: number): Observable<void> {
    if (!(error instanceof ZebraDesktopBatchError)) {
      return throwError(() => error);
    }
    const message = `${this.#translate(`${ZebraDesktopPrintAdapter.printerErrorKeyPrefix}${error.printerError}`)}\n${this.#translate(ZebraDesktopPrintAdapter.retryOrDownloadKey)}`;

    return this.#printDialogService
      .confirmRetry(this.#translate(ZebraDesktopPrintAdapter.titleKey), message, {
        cancelLabel: this.#translate(ZebraDesktopPrintAdapter.downloadKey),
      })
      .pipe(
        switchMap((shouldRetry: boolean) => {
          if (shouldRetry) {
            return this.#printFrom$(batches, error.batchIndex, attempt + 1);
          }
          this.#datadogLogService.logInfo('[Printer][ZebraDesktop] Operator chose to download the tickets as PDF', {
            attempt,
            printerError: error.printerError,
          });
          return throwError(() => new PrintPdfRequestedError(error.printerError));
        }),
      );
  }

  #printFrom$(batches: ZebraDesktopBatch[], startBatchIndex: number, attempt: number): Observable<void> {
    return defer(() => {
      const progress = this.#printDialogService.openProgress(batches.length, startBatchIndex + 1);

      return from(batches.slice(startBatchIndex)).pipe(
        concatMap((batch: ZebraDesktopBatch, offset: number) => {
          const batchIndex: number = startBatchIndex + offset;
          progress.update(batchIndex + 1);
          return this.#send$(batch, attempt).pipe(
            catchError((error: unknown) => {
              const printerError: PrinterErrors = this.#toPrinterError(error);
              this.#datadogLogService.logError('[Printer][ZebraDesktop] Print batch failed', {
                ...this.#getLogPayload(batch, attempt),
                printerError,
              });
              return throwError(() => new ZebraDesktopBatchError(printerError, batchIndex));
            }),
          );
        }),
        toArray(),
        closingProgress(progress),
      );
    }).pipe(
      map((): void => undefined),
      catchError((error: unknown) => this.#onBatchFailed$(error, batches, attempt)),
    );
  }

  #send$(batch: ZebraDesktopBatch, attempt: number): Observable<void> {
    return defer(() => {
      this.#datadogLogService.logInfo('[Printer][ZebraDesktop] Sending print batch to the zebra printer', {
        ...this.#getLogPayload(batch, attempt),
        zplLength: batch.zpl.length,
      });

      return from(this.#zebraPrinterService.getDefaultPrinter());
    }).pipe(
      switchMap((printer: ZebraPrinter) =>
        from(this.#zebraPrinterService.sendToPrinter(batch.zpl, batch.chunk.entries[0]?.printable.order.id)).pipe(
          tap(() =>
            this.#datadogLogService.logInfo('[Printer][ZebraDesktop] Print batch sent to the zebra printer', {
              ...this.#getLogPayload(batch, attempt),
              printer: printer.name,
            }),
          ),
        ),
      ),
    );
  }

  async #toBatch(chunk: ZebraPrintChunk, config: ZebraPrinterConfig): Promise<ZebraDesktopBatch> {
    const images: ZebraImagePixels[] = await Promise.all(chunk.base64Images.map((dataUrl: string) => readPngDataUrlPixels(dataUrl)));

    return {
      chunk,
      zpl: toZebraBatchZpl(
        images.map((image: ZebraImagePixels) => toZplGraphicField(image)),
        config,
      ),
    };
  }

  #toPrinterError(error: unknown): PrinterErrors {
    if (typeof error === 'string' && (Object.values(PrinterErrors) as string[]).includes(error)) {
      return error as PrinterErrors;
    }

    return error instanceof TypeError || String(error).includes('TypeError')
      ? PrinterErrors.FailedToFetchError
      : PrinterErrors.UnknownError;
  }

  #translate(key: string): string {
    return this.#translateService.instant(key);
  }
}

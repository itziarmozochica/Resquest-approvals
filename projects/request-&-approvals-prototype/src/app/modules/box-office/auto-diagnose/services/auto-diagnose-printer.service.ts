import { DOCUMENT, inject, Injectable } from '@angular/core';

import { DualScreenPrinterStatus } from '@fz-original/app/app/enums/dual-screen-printer-status.enum';
import { isSemanticVersionGreaterOrEqual } from '@fz-original/app/app/utils/version.util';
import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { CutterTypeEnum, PaperTypeEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { QrGeneratorService } from '@fz-original/app/shared/services/qr-generator/qr-generator.service';
import { FinishPrintOrder } from '@fz-original/app/shared/services/webview-messenger/models/finish-print-order.model';
import { PrintImagesMessage } from '@fz-original/app/shared/services/webview-messenger/models/print-images-message.model';
import { PrintOrderImageMessage } from '@fz-original/app/shared/services/webview-messenger/models/print-order-image-message.model';
import { PrintReceiptMessageModel } from '@fz-original/app/shared/services/webview-messenger/models/print-receipt-message.model';
import { MessageType, WebviewMessengerService } from '@fz-original/app/shared/services/webview-messenger/webview-messenger.service';
import { catchError, from, map, Observable, of, switchMap, timeout, TimeoutError } from 'rxjs';

import { WebViewMessage } from '@feverup/ts-webview';

import {
  PRINT_IMAGES_MIN_APP_VERSION,
  PRINTER_TEST_LABEL_HEIGHT_PX,
  PRINTER_TEST_LABEL_WIDTH_PX,
  PRINTER_TEST_QR_SIZE_PX,
  PRINTER_TEST_TIMEOUT_MS,
  PrinterTestKind,
  PrinterTestLabelContent,
  PrinterTestOutcome,
  PrinterTestResult,
  TicketPrinterSetup,
} from '../models/printer-diagnose.model';
import { buildPrinterTestReceipt, PrinterTestReceiptContent } from '../utils/printer-test-receipt.util';

@Injectable({ providedIn: 'root' })
export class AutoDiagnosePrinterService {
  static readonly labelFont = '600 34px sans-serif';
  static readonly labelSmallFont = '24px sans-serif';
  static readonly labelPadding = 32;
  static readonly labelLineHeight = 40;

  readonly #datadogLogService = inject(DatadogLogService);
  readonly #document = inject(DOCUMENT);
  readonly #qrGeneratorService = inject(QrGeneratorService);
  readonly #webviewMessengerService = inject(WebviewMessengerService);

  printTestReceipt(content: PrinterTestReceiptContent): void {
    this.#datadogLogService.logInfo('[AutoDiagnose][Printer] Sending test receipt');
    this.#webviewMessengerService.sendWebViewMessage(new PrintReceiptMessageModel({ instructions: buildPrinterTestReceipt(content) }));
  }

  printTestTicket$(setup: TicketPrinterSetup, content: PrinterTestLabelContent): Observable<PrinterTestResult> {
    return from(this.#renderLabel(content)).pipe(
      switchMap((base64Image: string) => {
        this.#webviewMessengerService.discardUnconsumed(MessageType.FinishPrint);
        this.#webviewMessengerService.sendWebViewMessage(this.#toMessage(base64Image, setup));

        return this.#webviewMessengerService.observeOnce<FinishPrintOrder>(MessageType.FinishPrint).pipe(timeout(PRINTER_TEST_TIMEOUT_MS));
      }),
      map((message: FinishPrintOrder): PrinterTestResult => {
        const printerStatus: DualScreenPrinterStatus = this.#toPrinterStatus(message);
        this.#datadogLogService.logInfo('[AutoDiagnose][Printer] Test ticket answered', { printerStatus });

        return this.#result(
          printerStatus === DualScreenPrinterStatus.printerSuccess ? PrinterTestOutcome.printed : PrinterTestOutcome.failed,
          printerStatus,
        );
      }),
      catchError((error: unknown) => {
        if (error instanceof TimeoutError) {
          this.#datadogLogService.logInfo('[AutoDiagnose][Printer] Test ticket got no answer', { error });

          return of(this.#result(PrinterTestOutcome.timeout, null));
        }

        this.#datadogLogService.logInfo('[AutoDiagnose][Printer] Test ticket was not sent', { error });

        return of(this.#result(PrinterTestOutcome.notSent, null));
      }),
    );
  }

  #loadImage(source: string): Promise<HTMLImageElement> {
    return new Promise((resolve: (image: HTMLImageElement) => void, reject: (error: unknown) => void) => {
      const image: HTMLImageElement = new Image();
      image.onload = (): void => resolve(image);
      image.onerror = reject;
      image.src = source;
    });
  }

  async #renderLabel(content: PrinterTestLabelContent): Promise<string> {
    const { labelFont, labelLineHeight, labelPadding, labelSmallFont } = AutoDiagnosePrinterService;
    const canvas: HTMLCanvasElement = this.#document.createElement('canvas');
    canvas.width = PRINTER_TEST_LABEL_WIDTH_PX;
    canvas.height = PRINTER_TEST_LABEL_HEIGHT_PX;
    const context: CanvasRenderingContext2D | null = canvas.getContext('2d');

    if (context === null) {
      throw new Error('Canvas 2D context is not available');
    }

    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#000';
    context.textBaseline = 'top';
    context.font = labelFont;
    context.fillText(content.title, labelPadding, labelPadding);
    context.font = labelSmallFont;
    content.lines.forEach((line: string, index: number) => {
      context.fillText(line, labelPadding, labelPadding + labelLineHeight * (index + 1.5));
    });

    const qrImage: HTMLImageElement = await this.#loadImage(
      await this.#qrGeneratorService.generateQr(content.qrContent, { width: PRINTER_TEST_QR_SIZE_PX }),
    );
    context.drawImage(
      qrImage,
      canvas.width - PRINTER_TEST_QR_SIZE_PX - labelPadding,
      (canvas.height - PRINTER_TEST_QR_SIZE_PX) / 2,
      PRINTER_TEST_QR_SIZE_PX,
      PRINTER_TEST_QR_SIZE_PX,
    );

    return canvas.toDataURL('image/png');
  }

  #result(outcome: PrinterTestOutcome, printerStatus: DualScreenPrinterStatus | null): PrinterTestResult {
    return { at: Date.now(), kind: PrinterTestKind.ticket, outcome, printerStatus };
  }

  #toMessage(base64Image: string, setup: TicketPrinterSetup): WebViewMessage<unknown> {
    const cutterType: string = setup.cutterType ?? CutterTypeEnum.basic_cutter;
    const paperType: string = setup.paperType ?? PaperTypeEnum.basic_paper;

    if (setup.appVersion !== null && isSemanticVersionGreaterOrEqual(setup.appVersion, PRINT_IMAGES_MIN_APP_VERSION)) {
      return new PrintImagesMessage({
        base64Images: [base64Image],
        finalCut: cutterType === CutterTypeEnum.basic_cutter ? 'full' : 'none',
        metadata: {},
        middleCuts: 'none',
        paperType: paperType === PaperTypeEnum.pre_printed_paper ? 'pre-printed-paper' : 'basic-paper',
        printer: 'zebra',
      });
    }

    return new PrintOrderImageMessage({ base64Images: [base64Image], cutterType, paperType });
  }

  #toPrinterStatus(message: FinishPrintOrder): DualScreenPrinterStatus {
    return (
      Object.values(DualScreenPrinterStatus).find((status: DualScreenPrinterStatus) => status === message.code) ??
      DualScreenPrinterStatus.printerUnknownError
    );
  }
}

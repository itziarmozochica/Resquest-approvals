import { DualScreenPrinterStatus } from '@fz-original/app/app/enums/dual-screen-printer-status.enum';
import type { IgntAlertSentiment } from '@ignite/common';

import { DiagnoseStatus } from './auto-diagnose.model';

export enum PrinterTestKind {
  receipt = 'receipt',
  ticket = 'ticket',
}

export enum PrinterTestOutcome {
  confirmedByUser = 'confirmedByUser',
  failed = 'failed',
  notConfirmed = 'notConfirmed',
  /** The label could not be prepared, so nothing reached the printer. */
  notSent = 'notSent',
  printed = 'printed',
  timeout = 'timeout',
}

export interface PrinterTestResult {
  at: number;
  kind: PrinterTestKind;
  outcome: PrinterTestOutcome;
  printerStatus: DualScreenPrinterStatus | null;
}

export interface PrinterTestLabelContent {
  lines: string[];
  qrContent: string;
  title: string;
}

export interface PrinterResultView {
  messageKey: string;
  sentiment: IgntAlertSentiment;
}

export interface TicketPrinterSetup {
  appVersion: string | null;
  cutterType: string | null;
  paperType: string | null;
}

export const PRINTER_TEST_TIMEOUT_MS = 20_000;
export const PRINT_IMAGES_MIN_APP_VERSION = '1.12.0';
export const PRINTER_TEST_LABEL_WIDTH_PX = 576;
export const PRINTER_TEST_LABEL_HEIGHT_PX = 360;
export const PRINTER_TEST_QR_SIZE_PX = 200;

export const PRINTER_STATUS_MESSAGE_KEY_PREFIX = 'boxOffice.autoDiagnose.printer.status.';

export const PRINTER_OUTCOME_STATUS: Readonly<Record<PrinterTestOutcome, DiagnoseStatus>> = {
  [PrinterTestOutcome.confirmedByUser]: DiagnoseStatus.ok,
  [PrinterTestOutcome.failed]: DiagnoseStatus.failed,
  [PrinterTestOutcome.notConfirmed]: DiagnoseStatus.failed,
  [PrinterTestOutcome.notSent]: DiagnoseStatus.failed,
  [PrinterTestOutcome.printed]: DiagnoseStatus.ok,
  [PrinterTestOutcome.timeout]: DiagnoseStatus.failed,
};

/** Statuses that share a message: the rest fall back to the unknown-error one. */
export const PRINTER_STATUS_MESSAGE_KEYS: Readonly<Partial<Record<DualScreenPrinterStatus, string>>> = {
  [DualScreenPrinterStatus.printerConnectionError]: 'connection',
  [DualScreenPrinterStatus.printerGetInstanceError]: 'connection',
  [DualScreenPrinterStatus.printerNotFoundError]: 'notFound',
  [DualScreenPrinterStatus.printerNotReadyBufferFulledError]: 'busy',
  [DualScreenPrinterStatus.printerNotReadyHeadOpenError]: 'coverOpen',
  [DualScreenPrinterStatus.printerNotReadyHeadTooHotError]: 'overheated',
  [DualScreenPrinterStatus.printerNotReadyPaperOutError]: 'paperOut',
  [DualScreenPrinterStatus.printerNotReadyPausedError]: 'paused',
  [DualScreenPrinterStatus.printerNotReadyRibbonOutError]: 'ribbonOut',
  [DualScreenPrinterStatus.printerSuccess]: 'success',
};

import { DualScreenPrinterStatus } from '@fz-original/app/app/enums/dual-screen-printer-status.enum';

import { DiagnoseStatus } from '../models/auto-diagnose.model';
import {
  PRINTER_OUTCOME_STATUS,
  PRINTER_STATUS_MESSAGE_KEY_PREFIX,
  PRINTER_STATUS_MESSAGE_KEYS,
  PrinterResultView,
  PrinterTestOutcome,
  PrinterTestResult,
} from '../models/printer-diagnose.model';

export function toPrinterResultView(result: PrinterTestResult | undefined): PrinterResultView | null {
  if (result === undefined) {
    return null;
  }

  return {
    messageKey: toPrinterMessageKey(result),
    sentiment: PRINTER_OUTCOME_STATUS[result.outcome] === DiagnoseStatus.ok ? 'positive' : 'danger',
  };
}

/** The worst of the latest results: one failing printer is enough to flag the tile. */
export function toPrinterStatus(results: readonly PrinterTestResult[]): DiagnoseStatus {
  if (results.length === 0) {
    return DiagnoseStatus.notTested;
  }

  return results.some((result: PrinterTestResult) => PRINTER_OUTCOME_STATUS[result.outcome] === DiagnoseStatus.failed)
    ? DiagnoseStatus.failed
    : DiagnoseStatus.ok;
}

function toPrinterMessageKey(result: PrinterTestResult): string {
  switch (result.outcome) {
    case PrinterTestOutcome.confirmedByUser:
      return `${PRINTER_STATUS_MESSAGE_KEY_PREFIX}receiptConfirmed`;
    case PrinterTestOutcome.notConfirmed:
      return `${PRINTER_STATUS_MESSAGE_KEY_PREFIX}receiptNotConfirmed`;
    case PrinterTestOutcome.notSent:
      return `${PRINTER_STATUS_MESSAGE_KEY_PREFIX}notSent`;
    case PrinterTestOutcome.timeout:
      return `${PRINTER_STATUS_MESSAGE_KEY_PREFIX}timeout`;
    default:
      return `${PRINTER_STATUS_MESSAGE_KEY_PREFIX}${
        PRINTER_STATUS_MESSAGE_KEYS[result.printerStatus ?? DualScreenPrinterStatus.printerUnknownError] ?? 'unknown'
      }`;
  }
}

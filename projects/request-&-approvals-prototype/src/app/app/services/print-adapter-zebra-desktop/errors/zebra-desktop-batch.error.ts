import { PrinterErrors } from '@fz-original/app/shared/services/zebra-printer/models/printer-errors.enum';

export class ZebraDesktopBatchError extends Error {
  readonly batchIndex: number;
  readonly printerError: PrinterErrors;

  constructor(printerError: PrinterErrors, batchIndex: number) {
    super(`The zebra printer reported ${printerError} for batch ${batchIndex}`);
    this.name = 'ZebraDesktopBatchError';
    this.batchIndex = batchIndex;
    this.printerError = printerError;
  }
}

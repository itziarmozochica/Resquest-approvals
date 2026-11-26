import { DualScreenPrinterStatus } from '../../../enums/dual-screen-printer-status.enum';

export class ZebraPrinterStatusError extends Error {
  readonly chunkIndex: number;
  readonly printerStatus: DualScreenPrinterStatus;

  constructor(printerStatus: DualScreenPrinterStatus, chunkIndex: number) {
    super(`The printer reported ${printerStatus} for chunk ${chunkIndex}`);
    this.name = 'ZebraPrinterStatusError';
    this.chunkIndex = chunkIndex;
    this.printerStatus = printerStatus;
  }
}

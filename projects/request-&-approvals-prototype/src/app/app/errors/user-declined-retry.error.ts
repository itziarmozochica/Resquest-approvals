import { DualScreenPrinterStatus } from '../enums/dual-screen-printer-status.enum';

export class UserDeclinedRetryError extends Error {
  readonly printerStatus?: DualScreenPrinterStatus;

  constructor(message = 'User declined retry', printerStatus?: DualScreenPrinterStatus) {
    super(message);
    this.name = 'UserDeclinedRetryError';
    this.printerStatus = printerStatus;
  }
}

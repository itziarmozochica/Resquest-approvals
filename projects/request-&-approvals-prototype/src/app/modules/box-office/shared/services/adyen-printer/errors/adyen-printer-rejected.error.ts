export class AdyenPrinterRejectedError extends Error {
  atIndex: number;

  constructor(atIndex: number) {
    super("We're unable to connect to your Adyen Printer. Please try again.");
    this.atIndex = atIndex;
  }
}

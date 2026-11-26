export class AdyenPrinterTimeoutError extends Error {
  atIndex: number;

  constructor(atIndex: number) {
    super('The printing process is somewhat slow; please try again.');
    this.atIndex = atIndex;
  }
}

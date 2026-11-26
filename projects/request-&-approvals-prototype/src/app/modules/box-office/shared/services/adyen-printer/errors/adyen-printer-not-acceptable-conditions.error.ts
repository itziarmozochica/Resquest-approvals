export class AdyenPrinterNotAcceptableConditionsError extends Error {
  atIndex: number;

  constructor(atIndex: number) {
    super('Your Adyen printer is either out of paper or not set up correctly for printing. Please check and try again.');
    this.atIndex = atIndex;
  }
}

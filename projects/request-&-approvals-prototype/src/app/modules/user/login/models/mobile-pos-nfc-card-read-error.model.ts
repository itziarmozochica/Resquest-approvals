import { MobilePosNfcCardReadFailure } from '../enums/mobile-pos-nfc-card-read-failure.enum';

export class MobilePosNfcCardReadError extends Error {
  constructor(readonly failure: MobilePosNfcCardReadFailure) {
    super(`[MobilePosNfcCardRead] ${failure}`);
    this.name = 'MobilePosNfcCardReadError';
  }
}

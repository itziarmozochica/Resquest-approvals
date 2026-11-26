import { CHARGE_IN_PROGRESS_ERROR_CODE } from './payments.model';

export class ChargeInProgressError extends Error {
  constructor() {
    super(CHARGE_IN_PROGRESS_ERROR_CODE);
    this.name = 'ChargeInProgressError';
  }
}

import type { FiscalComplianceBlockCode } from './fiscal-compliance-block-code';

export class FiscalComplianceBlockPrepareError extends Error {
  constructor(
    readonly code: FiscalComplianceBlockCode,
    readonly response: unknown,
  ) {
    super(code);
    this.name = 'FiscalComplianceBlockPrepareError';
  }
}

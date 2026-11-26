import { TraCZ } from './models/efsta-esr-response.model';
import { EfstaZReportInvalid, EfstaZReportParseResult, EfstaZReportTaxGroup } from './models/efsta-z-report.model';

export function parseEsrZReport(zBlock: TraCZ): EfstaZReportParseResult {
  const zi = zBlock.ZI;
  if (typeof zi !== 'number' || !Number.isFinite(zi)) {
    return invalidZReport(`ZI is not a number (received ${describeValue(zi)})`);
  }

  const reportedTotal = zBlock.T;
  if (!isDecimalString(reportedTotal)) {
    return invalidZReport(`T is not a decimal string (received ${describeValue(reportedTotal)})`);
  }

  const rawTaxGroups = zBlock.ZTaxA;
  if (!isUnknownArray(rawTaxGroups)) {
    return invalidZReport(`ZTaxA is not an array (received ${describeValue(rawTaxGroups)})`);
  }

  const taxGroups: EfstaZReportTaxGroup[] = [];
  for (const [index, rawTaxGroup] of rawTaxGroups.entries()) {
    if (!isRecord(rawTaxGroup)) {
      return invalidZReport(`ZTaxA[${index}] is not an object (received ${describeValue(rawTaxGroup)})`);
    }

    const { Amt, Prc, TaxG } = rawTaxGroup;

    if (typeof TaxG !== 'string' || TaxG.length === 0) {
      return invalidZReport(`ZTaxA[${index}].TaxG is not a non-empty string (received ${describeValue(TaxG)})`);
    }
    if (!isDecimalString(Amt)) {
      return invalidZReport(`ZTaxA[${index}].Amt is not a decimal string (received ${describeValue(Amt)})`);
    }
    if (typeof Prc !== 'string') {
      return invalidZReport(`ZTaxA[${index}].Prc is not a string (received ${describeValue(Prc)})`);
    }
    if (Prc.length > 0 && !isDecimalString(Prc)) {
      return invalidZReport(`ZTaxA[${index}].Prc is neither empty nor a decimal string (received ${describeValue(Prc)})`);
    }

    taxGroups.push({
      grossAmount: Amt,
      ratePercent: Prc.length === 0 ? null : Number(Prc),
      taxGroup: TaxG,
    });
  }

  return {
    report: { reportedTotal, taxGroups, zi },
    status: 'parsed',
  };
}

function describeValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  return typeof value;
}

function invalidZReport(reason: string): EfstaZReportInvalid {
  return { reason, status: 'invalid' };
}

const DECIMAL_STRING_PATTERN = /^-?\d+(\.\d+)?$/;

function isDecimalString(value: unknown): value is string {
  return typeof value === 'string' && DECIMAL_STRING_PATTERN.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

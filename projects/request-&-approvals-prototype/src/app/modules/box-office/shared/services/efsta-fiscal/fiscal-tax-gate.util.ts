import { CartSessionFiscalLines } from '@fz-original/app/shared/models/cart/cart-session-fiscal-lines.model';
import { FiscalLine } from '@fz-original/app/shared/models/order/fiscal-line.model';

import { buildPackFiscalBlocksFromLines } from './pack-fiscal-lines.util';

export type TaxGroupByRateResolver = (taxRate: number) => string | undefined;

export type FiscalTaxBlocker =
  | { reason: 'MISSING_FISCAL_LINES'; sessionId: number }
  | { reason: 'MISSING_TAX_RATE'; sessionId: number; text: string }
  | { reason: 'UNRECONCILED_PACK_FISCAL_LINES'; sessionId: number }
  | { reason: 'UNMAPPED_TAX_RATE'; sessionId: number; taxRate: number; text: string };

function findFiscalLineBlocker(
  sessionId: number,
  fiscalLine: FiscalLine,
  resolveTaxGroupByRate: TaxGroupByRateResolver,
): FiscalTaxBlocker | undefined {
  if (fiscalLine.taxRate == null) {
    return { reason: 'MISSING_TAX_RATE', sessionId, text: fiscalLine.text };
  }
  if (resolveTaxGroupByRate(fiscalLine.taxRate) == null) {
    return { reason: 'UNMAPPED_TAX_RATE', sessionId, taxRate: fiscalLine.taxRate, text: fiscalLine.text };
  }
  return undefined;
}

function packFiscalLinesReconcile(fiscalLines: readonly FiscalLine[], total: number): boolean {
  return buildPackFiscalBlocksFromLines(fiscalLines, total, fiscalLines[0]?.pricePerUnit.currency) !== undefined;
}

function findItemBlockers(item: CartSessionFiscalLines, resolveTaxGroupByRate: TaxGroupByRateResolver): FiscalTaxBlocker[] {
  if (item.fiscalLines === undefined) {
    return [];
  }
  if (item.fiscalLines === null || (item.fiscalLines.length === 0 && item.total > 0)) {
    return [{ reason: 'MISSING_FISCAL_LINES', sessionId: item.sessionId }];
  }
  const blockers = item.fiscalLines
    .map(fiscalLine => findFiscalLineBlocker(item.sessionId, fiscalLine, resolveTaxGroupByRate))
    .filter((blocker): blocker is FiscalTaxBlocker => blocker !== undefined);
  // A pack whose lines do not reconcile is declared as one pack line, and a pack session type has no tax group.
  if (item.isPack === true && item.fiscalLines.length > 0 && !packFiscalLinesReconcile(item.fiscalLines, item.total)) {
    blockers.push({ reason: 'UNRECONCILED_PACK_FISCAL_LINES', sessionId: item.sessionId });
  }
  return blockers;
}

export function findFiscalTaxBlockers(
  items: readonly CartSessionFiscalLines[],
  resolveTaxGroupByRate: TaxGroupByRateResolver,
): FiscalTaxBlocker[] {
  return items.flatMap(item => findItemBlockers(item, resolveTaxGroupByRate));
}

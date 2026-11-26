import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { FiscalLine } from '@fz-original/app/shared/models/order/fiscal-line.model';
import { Order } from '@fz-original/app/shared/models/order/order.model';

import { FiscalLinesByTicketId, formatAmount, getLineTotal } from './efsta-esr-mapper-common.util';

export interface PackFiscalFee {
  amount: number;
  quantity: number;
  taxRate: number | null;
  text: string;
}

export interface PackFiscalBlock {
  amount: number;
  component: FiscalLine;
  fee?: PackFiscalFee;
}

function toCurrencyAmount(amount: number, currency?: string): number {
  return Number(formatAmount(amount, currency));
}

function groupFeesByTaxRate(feeLines: readonly FiscalLine[], currency?: string): PackFiscalFee[] {
  const feeByTaxRate = new Map<number | null, PackFiscalFee>();
  for (const feeLine of feeLines) {
    const amount = toCurrencyAmount(feeLine.quantity * feeLine.pricePerUnit.amount, currency);
    const existing = feeByTaxRate.get(feeLine.taxRate);
    feeByTaxRate.set(
      feeLine.taxRate,
      existing != null
        ? {
            ...existing,
            amount: toCurrencyAmount(existing.amount + amount, currency),
            quantity: existing.quantity === feeLine.quantity ? existing.quantity : 1,
          }
        : { amount, quantity: feeLine.quantity, taxRate: feeLine.taxRate, text: feeLine.text },
    );
  }
  return [...feeByTaxRate.values()];
}

export function buildPackFiscalBlocks(
  session: CartSession,
  fiscalLinesByTicketId: FiscalLinesByTicketId | undefined,
  currency?: string,
): PackFiscalBlock[] | undefined {
  const fiscalLines = session.ticketId != null ? fiscalLinesByTicketId?.get(session.ticketId) : undefined;
  if (fiscalLines == null) {
    return undefined;
  }
  return buildPackFiscalBlocksFromLines(fiscalLines, getLineTotal(session), currency);
}

/**
 * Splits a pack's fiscal lines into one block per component, or returns `undefined` when their unrounded
 * amounts do not reconcile to `lineTotal`, in which case the mappers fall back to a single pack line.
 * Rounding each component to the currency precision can leave a residue (e.g. HUF 500.50 + 500.50);
 * it is added to the largest component so the blocks still sum to `lineTotal`.
 */
export function buildPackFiscalBlocksFromLines(
  fiscalLines: readonly FiscalLine[],
  lineTotal: number,
  currency?: string,
): PackFiscalBlock[] | undefined {
  const componentLines = fiscalLines.filter(fiscalLine => !fiscalLine.isBookingFee);
  const fees = groupFeesByTaxRate(
    fiscalLines.filter(fiscalLine => fiscalLine.isBookingFee),
    currency,
  );
  if (componentLines.length === 0 || fees.length > componentLines.length) {
    return undefined;
  }

  const rawAmounts = componentLines.map(component => component.quantity * component.pricePerUnit.amount);
  const feeTotal = fees.reduce((sum, fee) => sum + fee.amount, 0);
  const rawTotal = rawAmounts.reduce((sum, amount) => sum + amount, feeTotal);
  if (formatAmount(rawTotal, currency) !== formatAmount(lineTotal, currency)) {
    return undefined;
  }

  const amounts = absorbRoundingResidue(
    rawAmounts,
    rawAmounts.map(amount => toCurrencyAmount(amount, currency)),
    toCurrencyAmount(lineTotal - feeTotal, currency),
    currency,
  );
  const firstFeeIndex = componentLines.length - fees.length;
  return componentLines.map((component, index) =>
    index >= firstFeeIndex
      ? { amount: amounts[index], component, fee: fees[index - firstFeeIndex] }
      : { amount: amounts[index], component },
  );
}

function absorbRoundingResidue(
  rawAmounts: readonly number[],
  roundedAmounts: readonly number[],
  expectedTotal: number,
  currency?: string,
): number[] {
  const residue = toCurrencyAmount(expectedTotal - roundedAmounts.reduce((sum, amount) => sum + amount, 0), currency);
  if (residue === 0) {
    return [...roundedAmounts];
  }
  const largestIndex = rawAmounts.reduce((best, amount, index) => (Math.abs(amount) > Math.abs(rawAmounts[best]) ? index : best), 0);
  return roundedAmounts.map((amount, index) => (index === largestIndex ? toCurrencyAmount(amount + residue, currency) : amount));
}

export function buildFiscalLinesByTicketId(order: Order): FiscalLinesByTicketId | undefined {
  const tickets = [...(order.ticketsAndProducts?.values() ?? []), ...(order.accessTickets?.values() ?? [])];
  const fiscalLinesByTicketId = new Map<number, readonly FiscalLine[]>();
  tickets.forEach(ticket => {
    if (ticket.fiscalLines != null && ticket.fiscalLines.length > 0 && !fiscalLinesByTicketId.has(ticket.ticketId)) {
      fiscalLinesByTicketId.set(ticket.ticketId, ticket.fiscalLines);
    }
  });
  return fiscalLinesByTicketId.size > 0 ? fiscalLinesByTicketId : undefined;
}

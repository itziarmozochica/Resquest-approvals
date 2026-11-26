import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { AccessTicket } from '@fz-original/app/shared/models/order/access-ticket.model';
import { Order } from '@fz-original/app/shared/models/order/order.model';

import { PlEsrMapError, resolvePlTaxGroupByRate } from './efsta-esr-mapper-pl.util';

export { resolvePlTaxGroupByRate } from './efsta-esr-mapper-pl.util';

export function buildPlTaxRateBySessionTypeId(order: Order): Map<number, number> | undefined {
  return buildPlRateBySessionTypeId(
    order,
    ticket => ticket.taxRate ?? null,
    () => true,
  );
}

export function buildPlSurchargeTaxRateBySessionTypeId(order: Order): Map<number, number> | undefined {
  return buildPlRateBySessionTypeId(order, ticket => ticket.surchargeTaxRate ?? null, hasPositiveSurcharge);
}

export function buildPlTaxGroupBySessionTypeId(
  taxRateBySessionTypeId: Map<number, number> | undefined,
): ReadonlyMap<number, string> | undefined {
  if (taxRateBySessionTypeId == null) {
    return undefined;
  }

  const taxGroupBySessionTypeId = new Map<number, string>();
  for (const [sessionTypeId, taxRate] of taxRateBySessionTypeId) {
    const taxGroup = resolvePlTaxGroupByRate(taxRate);
    if (taxGroup != null) {
      taxGroupBySessionTypeId.set(sessionTypeId, taxGroup);
    }
  }

  return taxGroupBySessionTypeId.size > 0 ? taxGroupBySessionTypeId : undefined;
}

export function buildPlSurchargeTaxGroupBySessionTypeId(
  surchargeTaxRateBySessionTypeId: Map<number, number> | undefined,
): ReadonlyMap<number, string> | undefined {
  if (surchargeTaxRateBySessionTypeId == null) {
    return undefined;
  }

  const surchargeTaxGroupBySessionTypeId = new Map<number, string>();
  for (const [sessionTypeId, surchargeTaxRate] of surchargeTaxRateBySessionTypeId) {
    const surchargeTaxGroup = resolvePlTaxGroupByRate(surchargeTaxRate);
    if (surchargeTaxGroup == null) {
      throw new PlEsrMapError('EFR_PL_UNMAPPED_TAX_GROUP', `surchargeTaxRate:${surchargeTaxRate} sessionTypeId:${sessionTypeId}`);
    }
    surchargeTaxGroupBySessionTypeId.set(sessionTypeId, surchargeTaxGroup);
  }

  return surchargeTaxGroupBySessionTypeId.size > 0 ? surchargeTaxGroupBySessionTypeId : undefined;
}

function hasPositiveSurcharge(session: CartSession): boolean {
  return (session.surchargePerTicket?.amount ?? 0) * session.units > 0;
}

function buildPlRateBySessionTypeId(
  order: Order,
  extractRate: (ticket: AccessTicket) => number | null,
  isSessionRelevant: (session: CartSession) => boolean,
): Map<number, number> | undefined {
  const tickets = order.ticketsAndProducts;
  const cartSessions = order.cart?.sessionItemsByDatetime;

  if (!tickets?.size || !cartSessions?.size) {
    return undefined;
  }

  const rateByTicketId = new Map<number, number>();
  for (const ticket of tickets.values()) {
    const rate = extractRate(ticket);
    if (rate != null) {
      rateByTicketId.set(ticket.ticketId, rate);
    }
  }

  const rateBySessionTypeId = new Map<number, number>();
  for (const sessions of cartSessions.values()) {
    for (const session of sessions) {
      const sessionTypeId = session.sessionType?.id;
      if (sessionTypeId == null || session.ticketId == null || rateBySessionTypeId.has(sessionTypeId) || !isSessionRelevant(session)) {
        continue;
      }
      const rate = rateByTicketId.get(session.ticketId);
      if (rate != null) {
        rateBySessionTypeId.set(sessionTypeId, rate);
      }
    }
  }

  return rateBySessionTypeId.size > 0 ? rateBySessionTypeId : undefined;
}

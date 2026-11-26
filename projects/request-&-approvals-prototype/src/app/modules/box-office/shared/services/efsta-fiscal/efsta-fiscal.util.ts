import { PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';
import { AccessTicket } from '@fz-original/app/shared/models/order/access-ticket.model';
import { Order } from '@fz-original/app/shared/models/order/order.model';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';

import {
  FRANCE_COUNTRY_CODE,
  HUNGARY_COUNTRY_CODE,
  isFiscalFlagUnresolved,
  normalizeCountryCode,
  POLAND_COUNTRY_CODE,
  resolveFiscalCountryProfile,
  resolveFiscalDayFlowVariant,
  resolveFiscalReprintVariant,
} from './fiscal-country-profile.util';
import { FiscalDayFlowVariant, FiscalReprintVariant } from './models/fiscal-country-profile.model';

export function isCountryHungary(countryCode: string | undefined): boolean {
  return normalizeCountryCode(countryCode) === HUNGARY_COUNTRY_CODE;
}

export function isCountryPoland(countryCode: string | undefined): boolean {
  return normalizeCountryCode(countryCode) === POLAND_COUNTRY_CODE;
}

export function isEfstaFranceCountry(countryCode: string | undefined): boolean {
  return normalizeCountryCode(countryCode) === FRANCE_COUNTRY_CODE;
}

const ASYNC_FISCAL_FAILURE_WATCH_CHECKOUTS: ReadonlySet<PaymentCheckoutET> = new Set(['adyen', 'adyen_local', 'delegated', 'free']);

export function shouldWatchAsyncFiscalFailure(
  paymentCheckout: PaymentCheckoutET,
  blockBooker: boolean | undefined,
  blocksPurchaseOnFailure: boolean | undefined,
): boolean {
  return blockBooker === true && blocksPurchaseOnFailure === true && ASYNC_FISCAL_FAILURE_WATCH_CHECKOUTS.has(paymentCheckout);
}

export function isFiscalReceiptEnabled(optimizelyService: OptimizelyService, countryCode: string | undefined): boolean {
  return resolveFiscalCountryProfile(optimizelyService, countryCode) !== undefined;
}

export function isHungarianFiscalReceiptEnabled(optimizelyService: OptimizelyService, countryCode: string | undefined): boolean {
  return resolveFiscalCountryProfile(optimizelyService, countryCode)?.countryCode === HUNGARY_COUNTRY_CODE;
}

export function isHungarianFiscalDayFlow(optimizelyService: OptimizelyService, countryCode: string | undefined): boolean {
  return resolveFiscalDayFlowVariant(optimizelyService, countryCode) === 'hungary';
}

const IMPLEMENTED_FISCAL_DAY_FLOW_VARIANTS: ReadonlySet<FiscalDayFlowVariant> = new Set(['hungary', 'poland']);

/** See {@link isFiscalFlagUnresolved} — re-exported so the shift surfaces have one fiscal entry point. */
export function isFiscalDayFlowUnresolved(optimizelyService: OptimizelyService, countryCode: string | undefined): boolean {
  return isFiscalFlagUnresolved(optimizelyService, countryCode);
}

export function isFiscalDayFlowEnabled(optimizelyService: OptimizelyService, countryCode: string | undefined): boolean {
  const dayFlowVariant = resolveFiscalDayFlowVariant(optimizelyService, countryCode);
  return dayFlowVariant !== undefined && IMPLEMENTED_FISCAL_DAY_FLOW_VARIANTS.has(dayFlowVariant);
}

const IMPLEMENTED_FISCAL_REPRINT_VARIANTS: ReadonlySet<FiscalReprintVariant> = new Set(['france', 'hungary', 'poland']);

export function isFiscalReprintEnabled(optimizelyService: OptimizelyService, countryCode: string | undefined): boolean {
  const reprintVariant = resolveFiscalReprintVariant(optimizelyService, countryCode);
  return reprintVariant !== undefined && IMPLEMENTED_FISCAL_REPRINT_VARIANTS.has(reprintVariant);
}

export function buildTaxRateBySessionTypeId(order: Order): Map<number, number> | undefined {
  return buildBySessionTypeId(order, 'accessTickets', ticket => ticket.taxRate ?? null);
}

export function buildSurchargeTaxRateBySessionTypeId(order: Order): Map<number, number> | undefined {
  return buildBySessionTypeId(order, 'accessTickets', ticket => ticket.surchargeTaxRate ?? null);
}

export function buildProductTypeBySessionTypeId(order: Order): Map<number, string> | undefined {
  const productTypeBySessionTypeId = new Map(buildBySessionTypeId(order, 'ticketsAndProducts', ticket => ticket.productType ?? null));
  addFiscalLineProductTypes(order, productTypeBySessionTypeId);
  return productTypeBySessionTypeId.size > 0 ? productTypeBySessionTypeId : undefined;
}

function addFiscalLineProductTypes(order: Order, productTypeBySessionTypeId: Map<number, string>): void {
  const tickets = [...(order.ticketsAndProducts?.values() ?? []), ...(order.accessTickets?.values() ?? [])];
  const componentLines = tickets.flatMap(ticket => ticket.fiscalLines ?? []).filter(fiscalLine => !fiscalLine.isBookingFee);
  for (const { productType, sessionTypeId } of componentLines) {
    if (sessionTypeId != null && productType != null && !productTypeBySessionTypeId.has(sessionTypeId)) {
      productTypeBySessionTypeId.set(sessionTypeId, productType);
    }
  }
}

function buildBySessionTypeId<TValue>(
  order: Order,
  ticketSource: 'accessTickets' | 'ticketsAndProducts',
  extractValue: (ticket: AccessTicket) => TValue | null,
): Map<number, TValue> | undefined {
  const tickets = order[ticketSource];
  const cartSessions = order.cart?.sessionItemsByDatetime;

  if (!tickets?.size || !cartSessions?.size) {
    return undefined;
  }

  const valueByTicketId = new Map<number, TValue>();
  tickets.forEach(ticket => {
    const value = extractValue(ticket);
    if (value != null) {
      valueByTicketId.set(ticket.ticketId, value);
    }
  });

  if (!valueByTicketId.size) {
    return undefined;
  }

  const result = new Map<number, TValue>();
  cartSessions.forEach(sessions => {
    for (const session of sessions) {
      const sessionTypeId = session.sessionType?.id;
      if (sessionTypeId != null && !result.has(sessionTypeId)) {
        const value = valueByTicketId.get(session.ticketId!);
        if (value != null) {
          result.set(sessionTypeId, value);
        }
      }
    }
  });

  return result.size > 0 ? result : undefined;
}

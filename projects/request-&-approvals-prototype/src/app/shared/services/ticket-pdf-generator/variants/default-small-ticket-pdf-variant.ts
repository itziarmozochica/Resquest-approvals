import { Injectable } from '@angular/core';

import { JsonObject } from '../../../models/json-object';
import { AccessTicket } from '../../../models/order/access-ticket.model';
import { Order } from '../../../models/order/order.model';
import { PrinterOrder, PrinterPricing } from '../../../models/order/printer-order.model';
import { SmallTicketPdfLogoConfig, SmallTicketPdfPricingHelpers, SmallTicketPdfVariant } from './small-ticket-pdf-variant';

@Injectable({
  providedIn: 'root',
})
export class DefaultSmallTicketPdfVariant implements SmallTicketPdfVariant {
  getLogoConfig(order: PrinterOrder): SmallTicketPdfLogoConfig | null {
    void order;
    return null;
  }

  getPdfPricing(
    order: Order,
    printerOrder: PrinterOrder,
    accessTickets: Map<string, AccessTicket>,
    helpers: SmallTicketPdfPricingHelpers,
  ): PrinterPricing {
    void order;
    void accessTickets;
    void helpers;
    return printerOrder.pricing;
  }

  getPricingTableStyle(): string {
    return 'priceTable';
  }

  getPurchasedAtStyle(order: PrinterOrder): string {
    void order;
    return 'normalText';
  }

  getPurchaseFooterRows(order: PrinterOrder): JsonObject[][] {
    void order;
    return [];
  }

  getPurchaseRowsAfterPurchasedAt(order: PrinterOrder): JsonObject[][] {
    void order;
    return [];
  }

  getQrRawCodeLines(order: PrinterOrder): string[] {
    void order;
    return [];
  }

  getSessionLeadRows(order: PrinterOrder): JsonObject[][] {
    void order;
    return [];
  }

  getTicketsSectionHeight(): number {
    return 120;
  }

  getTicketTypeStyle(order: PrinterOrder, isLongLabel: boolean): string {
    void order;
    return isLongLabel ? 'sessionNameSmall' : 'sessionName';
  }

  shouldRenderDefaultSessionInfo(order: PrinterOrder): boolean {
    void order;
    return true;
  }
}

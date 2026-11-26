import { JsonObject } from '../../../models/json-object';
import { AccessTicket } from '../../../models/order/access-ticket.model';
import { Order } from '../../../models/order/order.model';
import { PrinterOrder, PrinterPricing } from '../../../models/order/printer-order.model';
import { PdfLogo } from '../ticket-generator.service';

export interface SmallTicketPdfPricingHelpers {
  invitationTranslation: string;
  locale: string;
  surchargeTranslation: string;
  totalIncludedInPriceTranslation: string;
  totalTranslation: string;
  vatTranslation: string;
  replaceCurrencySymbolWithCode: (content: string) => string;
  translate: (key: string) => string;
}

export interface SmallTicketPdfLogoConfig {
  logo: PdfLogo;
  marginDelta: number;
  showProvidedLabel: boolean;
  showProvidedLabelBeforePartnerLogo: boolean;
  partnerLogo?: PdfLogo;
}

export interface SmallTicketPdfVariant {
  getLogoConfig(order: PrinterOrder): SmallTicketPdfLogoConfig | null;

  getPdfPricing(
    order: Order,
    printerOrder: PrinterOrder,
    accessTickets: Map<string, AccessTicket>,
    helpers: SmallTicketPdfPricingHelpers,
  ): PrinterPricing;

  getPricingTableStyle(): string;

  getPurchasedAtStyle(order: PrinterOrder): string;

  getPurchaseFooterRows(order: PrinterOrder): JsonObject[][];

  getPurchaseRowsAfterPurchasedAt(order: PrinterOrder): JsonObject[][];

  getQrRawCodeLines(order: PrinterOrder): string[];

  getSessionLeadRows(order: PrinterOrder): JsonObject[][];

  getTicketsSectionHeight(): number;

  getTicketTypeStyle(order: PrinterOrder, isLongLabel: boolean): string;

  shouldRenderDefaultSessionInfo(order: PrinterOrder): boolean;
}

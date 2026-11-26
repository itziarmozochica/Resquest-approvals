import { formatDate } from '@angular/common';
import { Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import moment, { Moment } from 'moment-timezone';
import { Observable, of } from 'rxjs';

import { formatLocalDateTime, formatLocalFullDate } from '../../components/date-selector/date-selector.util';
import { buildPrinterOrder } from '../../factories/build-printer-order';
import { JsonObject } from '../../models/json-object';
import { Money } from '../../models/money.model';
import { AccessTicket, getDiscountApplied } from '../../models/order/access-ticket.model';
import { CodeType } from '../../models/order/code-type.model';
import { Order } from '../../models/order/order.model';
import {
  OnsitePlan,
  PrinterOrder,
  PrinterOrderLabels,
  PrintOrderInput,
  ResolvedPrintOrderInput,
} from '../../models/order/printer-order.model';
import { TicketTimeGranularity } from '../../models/order/ticket-time-granularity.enum';
import { FeatureFlags } from '../../optimizely/feature-flags';
import { getEffectiveBookingTimeGranularity, isNotPrintableOrders, withDefaultIsUnifiedTicket } from '../../utils/print-orders.util';
import { replaceCurrencySymbolWithCode } from '../../utils/print-text.util';
import { PartnerService } from '../partner/partner.service';
import { PdfTableContent } from '../pdf-generator/models/content/pdf-table-content';
import { PdfTextContent } from '../pdf-generator/models/content/pdf-text-content';
import { pdfContentContainsRtl, reorderPdfContentBidi, resolveBidiBaseDirection } from '../pdf-generator/pdf-bidi.util';
import { PdfGeneratorService } from '../pdf-generator/pdf-generator.service';
import { ZplReceiptLabels } from '../zebra-zpl-print/models/zebra-zpl.model';
import {
  getMuseumOfIllusionsNewDelhiLegalInformation,
  getParadoxMuseumIndiaLegalInformation,
  getTaxesInformation,
} from '../zebra-zpl-print/utils/zpl-receipt.util';

export interface PdfLogo {
  height: number;
  image: string;
  width: number;
}

export interface OnsitePricing {
  discount: number;
  isInvitation: boolean;
  surchargePerTicket: Money;
  total: Money;
  totalFirstRow: string;
  totalIncludingImpAndDto: Money;
  totalSecondRow: string;
  unitPrice: Money;
  loyaltyTotalPoints?: number;
}

export interface OnsiteTicket {
  code: string;
  codeType: CodeType;
  id: number;
  seat: string;
  timeGranularity: TicketTimeGranularity | null;
}

export interface OnsiteSession {
  address: string;
  isoCountryCode: string;
  name: string;
  startsAtDate: string;
  startsAtDateShortFormat: string;
  startsAtTime: string;
  ticketLabel: string;
  placeName?: string;
}

export interface OnsiteOrder {
  createdAt: string;
  id: string;
  plan: OnsitePlan;
  pricing: OnsitePricing;
  session: OnsiteSession;
  ticket: OnsiteTicket;
}

@Injectable({
  providedIn: 'root',
})
export abstract class TicketGeneratorService extends PdfGeneratorService {
  protected basePriceTranslation: string;
  protected invitationTranslation: string;
  protected locale: string;
  protected orderIdTranslation: string;
  protected providedByTranslation: string;
  protected purchasedAtTranslation: string;
  protected startTimeTranslation: string;
  protected surchargeTranslation: string;
  protected termsContentTranslation: string;
  protected termsHeaderTranslation: string;
  protected termsShortHeaderTranslation: string;
  protected ticketIdTranslation: string;
  protected ticketTranslation: string;
  protected totalIncludedInPriceTranslation: string;
  protected totalTranslation: string;
  protected validUntilTranslation: string;
  protected vatTranslation: string;

  protected pdfRenderOrder: Order | null = null;
  protected pdfRenderAccessTickets: Map<string, AccessTicket> | null = null;

  constructor(
    protected translateService: TranslateService,
    protected partnerService: PartnerService,
  ) {
    super();
    this.termsHeaderTranslation = this.translateService.instant('boxOffice.order.tickets.termsHeader');
    this.termsContentTranslation = this.translateService.instant('boxOffice.order.tickets.termsContent');
    this.startTimeTranslation = this.translateService.instant('boxOffice.order.tickets.startTime') + ':';
    this.surchargeTranslation = this.translateService.instant('boxOffice.order.tickets.surcharge');
    this.totalTranslation = this.translateService.instant('boxOffice.order.tickets.total');
    this.vatTranslation = this.translateService.instant('boxOffice.order.tickets.vat');
    this.totalIncludedInPriceTranslation = this.translateService.instant('boxOffice.order.tickets.totalIncludedInPriceTranslation');
    this.ticketIdTranslation = this.translateService.instant('boxOffice.order.tickets.ticketId');
    this.orderIdTranslation = this.translateService.instant('boxOffice.order.tickets.orderId');
    this.invitationTranslation = this.translateService.instant('boxOffice.order.tickets.invitation');
    this.termsShortHeaderTranslation = this.translateService.instant('boxOffice.order.tickets.termsShortHeader');
    this.providedByTranslation = this.translateService.instant('boxOffice.order.tickets.providedBy');
    this.basePriceTranslation = this.translateService.instant('boxOffice.order.tickets.basePrice');
    this.ticketTranslation = this.translateService.instant('boxOffice.order.tickets.ticket');
    this.locale = this.translateService.currentLang;
    this.purchasedAtTranslation = this.translateService.instant('boxOffice.order.tickets.purchasedAt') + ': ';
    this.validUntilTranslation = this.translateService.instant('boxOffice.order.tickets.validUntil') + ': ';
  }

  protected abstract getTicket(order: PrinterOrder): PdfTableContent;

  protected abstract initializeDocument(): void;

  // The brand Montserrat font is Latin-only; fall back to the Unicode font so RTL content is not
  // rendered as tofu boxes. `usesVfsFonts()` reads this same name, so the font the ticket renders
  // with and the pdfmake load strategy cannot disagree. Note the predicate covers RTL scripts only
  // (`RTL_CHAR_REGEX` in `pdf-bidi.util.ts`): an all-Latin ILS ticket still renders ₪ as tofu.
  protected override getDocumentFontName(): string | null {
    return pdfContentContainsRtl(this.content) ? 'ArialUnicode' : super.getDocumentFontName();
  }

  protected override getRenderableDocument(): JsonObject | null {
    if (!this.document) {
      return this.document;
    }
    const baseDirection = resolveBidiBaseDirection(this.translateService.currentLang);
    const font = this.getDocumentFontName();
    return {
      ...this.document,
      content: reorderPdfContentBidi(this.content, baseDirection),
      ...(font ? { defaultStyle: { ...(this.document['defaultStyle'] as Record<string, unknown>), font } } : {}),
    } as JsonObject;
  }

  downloadTickets(orders: { order: Order; isUnifiedTicket?: boolean }[]): Observable<unknown> {
    const mappedOrders = this.withDefaultIsUnifiedTicket(orders);

    this.resetDocument();
    if (this.#generateOrdersDocument(mappedOrders)) {
      let filename = `tickets_${moment().format('YYYY-MM-DD')}_${mappedOrders[0].order.id}`;
      if (orders.length > 1) {
        filename += `_and_more`;
      }
      return this.download(filename);
    } else {
      return of(null);
    }
  }

  getBase64Tickets(
    orders: { order: Order; isHidePriceEnabled?: boolean; isUnifiedTicket?: boolean }[],
    shouldRotate: boolean = true,
  ): Promise<string[]> {
    const mappedOrders = this.withDefaultIsUnifiedTicket(orders);
    this.resetDocument();
    if (this.#generateOrdersDocument(mappedOrders)) {
      return this.generateBase64Images(shouldRotate);
    } else {
      return Promise.resolve([]);
    }
  }

  isNotPrintableOrders(orders: Order[]): boolean {
    return isNotPrintableOrders(orders);
  }

  printTickets(): void {
    this.openPrintScreen();
  }

  protected formatLocalizedDate(momentDate: Moment, format: string): string {
    if (!momentDate.isValid()) {
      return '';
    }
    const timezoneOffset = momentDate.format('Z');
    return formatDate(momentDate.toDate(), format, this.locale || 'en', timezoneOffset);
  }

  protected generateOnsiteOrder(order: Order, accessTicket: AccessTicket): OnsiteOrder {
    const showInvitationLabel = accessTicket.showInvitationLabel;
    const timezone = order.cart?.timezone ?? '';
    const startDate = moment(accessTicket.sessionStartsAt).tz(timezone);
    const startDateFormatted = formatLocalFullDate(accessTicket.sessionStartsAt, this.locale || 'en', timezone);
    const startsAtDateShortFormat = this.formatLocalizedDate(startDate, 'dd/MM/yyyy');
    const sessionStartsAtTime = this.formatLocalizedDate(startDate, 'HH:mm');
    const discount = getDiscountApplied(accessTicket);
    const hasLoyaltyPrice = accessTicket.loyaltyUnitPrice != null && accessTicket.loyaltyUnitPrice !== 0;
    const loyaltyPoints = accessTicket.loyaltyUnitPrice ?? 0;
    const totalIncludingImpAndDto = new Money(accessTicket.total.amount - discount.amount, accessTicket.total.currency);
    const defaultTotalPriceFirstRow =
      `${accessTicket.unitPrice ? accessTicket.unitPrice.toString(this.locale) : ''} ` +
      (accessTicket.surchargePerTicket.amount > 0
        ? `${accessTicket.surchargePerTicket ? '+ ' + accessTicket.surchargePerTicket.toString(this.locale) + ' ' + this.surchargeTranslation : ''}`
        : '');
    const defaultPriceSecondRow = `       ${this.totalTranslation}: ${accessTicket.total ? totalIncludingImpAndDto.toString(this.locale) : ''} (${discount.amount > 0 ? this.totalIncludedInPriceTranslation : this.vatTranslation})`;
    const loyaltyTotalPriceFirstRow = this.#formatLoyaltyPoints(loyaltyPoints);
    const loyaltyTotalPriceSecondRow = `       ${this.totalTranslation}: ${this.#formatLoyaltyPoints(loyaltyPoints)}`;
    const invitationTotalPriceFirstRow = `${this.invitationTranslation}`;
    const invitationTotalPriceSecondRow = `       ${this.totalTranslation}: ${new Money(0, accessTicket.total.currency).toString()} (${this.vatTranslation})`;
    const createdAtFormat = formatLocalDateTime(order.cart?.createdAt ?? '', this.locale || 'en', timezone);
    let totalFirstRow = defaultTotalPriceFirstRow;
    let totalSecondRow = defaultPriceSecondRow;

    if (hasLoyaltyPrice) {
      totalFirstRow = loyaltyTotalPriceFirstRow;
      totalSecondRow = loyaltyTotalPriceSecondRow;
    } else if (showInvitationLabel) {
      totalFirstRow = invitationTotalPriceFirstRow;
      totalSecondRow = invitationTotalPriceSecondRow;
    }

    return {
      createdAt: createdAtFormat,
      id: order.externalId ?? '',
      plan: {
        id: order.planId ?? 0,
        name: order.planName ?? '',
        sessionSelectorType: order.sessionSelectorType ?? '',
        termsAndConditionsQrImage: order.termsAndConditionsQrImage ?? '',
      },
      pricing: {
        discount: discount.amount,
        isInvitation: showInvitationLabel ?? false,
        loyaltyTotalPoints: hasLoyaltyPrice ? loyaltyPoints : undefined,
        surchargePerTicket: accessTicket.surchargePerTicket,
        total: accessTicket.total,
        totalFirstRow,
        totalIncludingImpAndDto: totalIncludingImpAndDto,
        totalSecondRow,
        unitPrice: accessTicket.unitPrice,
      },
      session: {
        address: accessTicket.sessionAddress,
        isoCountryCode: accessTicket.sessionIsoCountryCode,
        name: accessTicket.sessionName,
        placeName: accessTicket.sessionPlaceName,
        startsAtDate: startDateFormatted,
        startsAtDateShortFormat,
        startsAtTime: sessionStartsAtTime,
        ticketLabel: accessTicket.sessionTicketReceiptLabel,
      },
      ticket: {
        code: accessTicket.code ?? '',
        codeType: accessTicket.codeType ?? CodeType.NO_IMAGE,
        id: accessTicket.ticketId,
        seat: accessTicket.seat ?? '',
        timeGranularity: accessTicket.timeGranularity,
      },
    };
  }

  protected generatePriceTable(pricing: OnsitePricing): PdfTableContent {
    const totalPrice = [
      new PdfTextContent(`${pricing.totalFirstRow ? pricing.totalFirstRow : ''}`, 'normalText').generateContent(),
      new PdfTextContent(`${pricing.totalSecondRow ? pricing.totalSecondRow : ''}`, 'normalText').generateContent(),
    ];
    return new PdfTableContent(
      {
        content: {
          body: [totalPrice],
        },
        layout: 'noBorders',
      },
      'priceTable',
    );
  }

  protected generatePrinterOrder(
    order: Order,
    accessTickets: Map<string, AccessTicket>,
    position?: number,
    isHidePriceEnabled: boolean = false,
  ): PrinterOrder {
    return buildPrinterOrder(order, accessTickets, this.getPrinterOrderLabels(), position, isHidePriceEnabled);
  }

  protected getEffectiveBookingTimeGranularity(order: PrinterOrder): TicketTimeGranularity {
    return getEffectiveBookingTimeGranularity(order);
  }

  protected getMuseumOfIllusionsNewDelhiLegalInformation(): string[] {
    return getMuseumOfIllusionsNewDelhiLegalInformation();
  }

  protected getParadoxMuseumIndiaLegalInformation(): string[] {
    return getParadoxMuseumIndiaLegalInformation(this.getReceiptLabels());
  }

  protected getPrinterOrderLabels(): PrinterOrderLabels {
    return {
      invitation: this.invitationTranslation,
      locale: this.locale,
      surcharge: this.surchargeTranslation,
      total: this.totalTranslation,
      totalIncludedInPrice: this.totalIncludedInPriceTranslation,
      vat: this.vatTranslation,
      formatLoyaltyPoints: (points: number) => this.#formatLoyaltyPoints(points),
    };
  }

  protected getReceiptLabels(): ZplReceiptLabels {
    return {
      address: this.translateService.instant('boxOffice.order.receipt.address'),
      email: this.translateService.instant('boxOffice.order.receipt.email'),
      phone: this.translateService.instant('boxOffice.order.receipt.phone'),
      taxBase: this.translateService.instant('boxOffice.order.receipt.taxBase'),
      taxBreakdown: this.translateService.instant('boxOffice.order.receipt.taxBreakdown'),
      title: this.translateService.instant('boxOffice.order.receipt.title'),
      total: this.translateService.instant('boxOffice.order.receipt.total'),
    };
  }

  protected getTaxesInformation(order: Order, partnerId: number): string[] {
    return getTaxesInformation(order, partnerId, this.getReceiptLabels(), this.locale);
  }

  protected get partnerId(): number | undefined {
    return this.partnerService.getPartner()?.id;
  }

  protected replaceCurrencySymbolWithCode(content: string): string {
    return replaceCurrencySymbolWithCode(content);
  }

  protected get useMontserratFont(): boolean {
    return (
      this.optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.PDFMAKE_USE_MONTSERRAT_FONT,
        team: 'b2b-onsite',
      }) === true
    );
  }

  protected withDefaultIsUnifiedTicket(orders: PrintOrderInput[]): ResolvedPrintOrderInput[] {
    return withDefaultIsUnifiedTicket(orders);
  }

  #formatLoyaltyPoints(points: number): string {
    return this.translateService.instant('orders.loyaltyPoints', {
      points: new Intl.NumberFormat(this.locale || 'en').format(points),
    });
  }

  #generateOrdersDocument(orders: { isHidePriceEnabled: boolean; isUnifiedTicket: boolean; order: Order }[]): boolean {
    if (this.isNotPrintableOrders(orders.map(o => o.order))) {
      return false;
    }

    this.pdfRenderOrder = null;
    this.pdfRenderAccessTickets = null;
    try {
      const lastOrderIndex = orders.length - 1;
      for (let i = 0; i < orders.length; i++) {
        this.#generateTicketsDocument(orders[i].order, orders[i].isUnifiedTicket, orders[i].isHidePriceEnabled);
        if (i < lastOrderIndex) {
          this.addPageBreak();
        }
      }
    } finally {
      this.pdfRenderOrder = null;
      this.pdfRenderAccessTickets = null;
    }

    return true;
  }

  #generateTicketsDocument(order: Order, isUnifiedTicket: boolean = false, isHidePriceEnabled: boolean = false): void {
    if (!order.accessTickets?.size) {
      return;
    }
    const lastKeyInMap: string | undefined = Array.from(order.accessTickets?.keys() ?? []).pop();
    if (isUnifiedTicket) {
      this.pdfRenderOrder = order;
      this.pdfRenderAccessTickets = order.accessTickets ?? new Map();
      try {
        const printerOrder = this.generatePrinterOrder(order, order.accessTickets ?? new Map(), undefined, isHidePriceEnabled);
        this.addContent(this.getTicket(printerOrder));
      } finally {
        this.pdfRenderOrder = null;
        this.pdfRenderAccessTickets = null;
      }
    } else {
      let index = 0;
      order.accessTickets?.forEach((accessTicket: AccessTicket, key: string) => {
        const accessTicketMap: Map<string, AccessTicket> = new Map();
        accessTicketMap.set(accessTicket.id.toString(), accessTicket);
        this.pdfRenderOrder = order;
        this.pdfRenderAccessTickets = accessTicketMap;
        try {
          const printerOrder = this.generatePrinterOrder(order, accessTicketMap, index + 1, isHidePriceEnabled);
          this.addContent(this.getTicket(printerOrder));
          if (lastKeyInMap !== key) {
            this.addPageBreak();
          }
        } finally {
          this.pdfRenderOrder = null;
          this.pdfRenderAccessTickets = null;
        }
        index++;
      });
    }
  }
}

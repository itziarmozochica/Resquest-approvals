import { Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import moment from 'moment-timezone';

import { JsonObject } from '../../models/json-object';
import { AccessTicket } from '../../models/order/access-ticket.model';
import { Order } from '../../models/order/order.model';
import { PrinterOrder, PrinterTicket } from '../../models/order/printer-order.model';
import { TicketTimeGranularity } from '../../models/order/ticket-time-granularity.enum';
import { isCirqueDuSoleil, PartnerService } from '../partner/partner.service';
import { PdfTableContent } from '../pdf-generator/models/content/pdf-table-content';
import { logoDict } from '../pdf-generator/models/pdf-generator-images';
import { ticketLargeFontSize } from './models/ticket-large-font-size';
import { TicketGeneratorService } from './ticket-generator.service';

@Injectable({
  providedIn: 'root',
})
export class TicketLargeGeneratorService extends TicketGeneratorService {
  #concessionsOpensTranslation: string;
  #disclaimerTranslationCirqueDuSoleil: string;
  #showtimeTranslation: string;
  #siteOpensTranslation: string;

  constructor(translateService: TranslateService, partnerService: PartnerService) {
    super(translateService, partnerService);
    this.#siteOpensTranslation = this.translateService.instant('boxOffice.order.tickets.siteOpens');
    this.#showtimeTranslation = this.translateService.instant('boxOffice.order.tickets.showtime');
    this.#concessionsOpensTranslation = this.translateService.instant('boxOffice.order.tickets.concessionsOpens');
    this.#disclaimerTranslationCirqueDuSoleil = this.translateService.instant('boxOffice.order.tickets.disclaimerCirqueDuSoleil');
  }

  downloadAndOpenPdf(orders: { order: Order; isHidePriceEnabled?: boolean; isUnifiedTicket?: boolean }[]): void {
    if (this.isNotPrintableOrders(orders.map(o => o.order))) {
      return;
    }
    const mappedOrders = this.withDefaultIsUnifiedTicket(orders);
    this.resetDocument();
    this.#generateContent(mappedOrders);
    this.printTickets();
  }

  async print(orders: { order: Order; isHidePriceEnabled?: boolean; isUnifiedTicket?: boolean }[]): Promise<void> {
    this.downloadAndOpenPdf(orders);
  }

  protected getTicket(order: PrinterOrder): PdfTableContent {
    const content: (JsonObject | null)[] = [];
    const effectiveTimeGranularity = this.getEffectiveBookingTimeGranularity(order);
    const showDate = effectiveTimeGranularity !== TicketTimeGranularity.ANYTIME;

    content.push(this.#getHeaderImage(order));
    content.push(this.#getVenueSection(order));
    if (showDate) {
      content.push(this.#getDateSection(order));
    }
    content.push(this.#getSeparatorLine());
    content.push(this.#getTimesSection(order));
    content.push(this.#getSeatBox(order));
    content.push(this.#getTicketTypeSection(order));
    content.push(this.#getQrSection(order));
    content.push(this.#getPricingAndIdsSection(order));
    content.push(this.#getDashedSeparator());
    content.push(this.#getDisclaimerAndLogoSection(order));

    const filteredContent = content.filter((c): c is JsonObject => c !== null);

    return new PdfTableContent({
      content: {
        body: filteredContent.map(c => [c]),
        widths: ['*'],
      },
      layout: 'noBorders',
    });
  }

  protected initializeDocument(): void {
    this.styles = {
      dateText: {
        alignment: 'left',
        bold: true,
        fontSize: ticketLargeFontSize.h2,
      },
      disclaimer: {
        fontSize: ticketLargeFontSize.disclaimer,
        lineHeight: 1,
      },
      idLabel: {
        alignment: 'left',
        fontSize: ticketLargeFontSize.small,
      },
      idValue: {
        alignment: 'left',
        bold: true,
        fontSize: ticketLargeFontSize.base,
      },
      planName: {
        alignment: 'left',
        bold: true,
        fontSize: ticketLargeFontSize.h1,
      },
      pricingText: {
        fontSize: ticketLargeFontSize.base,
      },
      pricingTotal: {
        bold: true,
        fontSize: ticketLargeFontSize.base,
      },
      providedByLabel: {
        alignment: 'right',
        fontSize: ticketLargeFontSize.providedByLabel,
      },
      seatBox: {
        alignment: 'center',
        bold: true,
        fontSize: ticketLargeFontSize.h3,
      },
      showtimeRow: {
        alignment: 'center',
        bold: true,
        fontSize: ticketLargeFontSize.h2,
      },
      showtimeValue: {
        bold: false,
      },
      ticketType: {
        alignment: 'center',
        bold: true,
        fontSize: ticketLargeFontSize.h3,
      },
      timesLabel: {
        bold: false,
        fontSize: ticketLargeFontSize.h3,
      },
      timesRow: {
        alignment: 'center',
        fontSize: ticketLargeFontSize.h3,
      },
      timesValue: {
        fontSize: ticketLargeFontSize.h3,
      },
      venueAddress: {
        alignment: 'left',
        fontSize: ticketLargeFontSize.h2,
      },
      venueName: {
        alignment: 'left',
        fontSize: ticketLargeFontSize.h2,
      },
    };

    this.document = {
      content: this.content,
      defaultStyle: {
        font: 'Montserrat',
      },
      pageMargins: [16, 12, 16, 0],
      pageSize: { height: 504, width: 288 },
      styles: this.styles,
    };
  }

  #calculateConcessionsOpenTime(order: PrinterOrder): string {
    const timezone = order.session.timezone ?? 'UTC';
    const dateTimeString = `${order.session.startsAtDateShortFormat} ${order.session.startsAtTime}`;
    const parsed = moment.tz(dateTimeString, 'DD/MM/YYYY HH:mm', true, timezone);

    if (!parsed.isValid()) {
      return '-';
    }

    return this.formatLocalizedDate(parsed.subtract(1, 'hour'), 'HH:mm');
  }

  #extractSeatsInfo(order: PrinterOrder): string {
    const allSeats: string[] = [];
    order.tickets.forEach((ticket: PrinterTicket) => {
      if (ticket.seats && ticket.seats.length > 0) {
        allSeats.push(...ticket.seats);
      }
    });

    if (allSeats.length === 0) {
      return '';
    }

    return allSeats.join(' - ');
  }

  #formatOpenGatesTime(order: PrinterOrder): string {
    if (!order.session.openGatesAt) {
      return '-';
    }
    const openGatesDate = moment(order.session.openGatesAt).tz(order.session.timezone ?? 'UTC');
    if (!openGatesDate.isValid()) {
      return '-';
    }
    return this.formatLocalizedDate(openGatesDate, 'HH:mm');
  }

  #generateContent(orders: { isHidePriceEnabled: boolean; isUnifiedTicket: boolean; order: Order }[]): void {
    const lastOrderIndex = orders.length - 1;
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i].order;
      if (!order.accessTickets?.size) {
        continue;
      }
      if (orders[i].isUnifiedTicket) {
        const printerOrder = this.generatePrinterOrder(order, order.accessTickets ?? new Map(), undefined, orders[i].isHidePriceEnabled);
        this.addContent(this.getTicket(printerOrder));
      } else {
        const lastKey: string | undefined = Array.from(order.accessTickets.keys()).pop();
        let index = 0;
        order.accessTickets.forEach((accessTicket: AccessTicket, key: string) => {
          const accessTicketMap: Map<string, AccessTicket> = new Map();
          accessTicketMap.set(accessTicket.id.toString(), accessTicket);
          const printerOrder = this.generatePrinterOrder(order, accessTicketMap, index + 1, orders[i].isHidePriceEnabled);
          this.addContent(this.getTicket(printerOrder));
          if (lastKey !== key) {
            this.addPageBreak();
          }
          index++;
        });
      }
      if (i < lastOrderIndex) {
        this.addPageBreak();
      }
    }
  }

  #getDashedSeparator(): JsonObject {
    return {
      canvas: [
        {
          dash: { length: 3, space: 2 },
          lineWidth: 0.5,
          type: 'line',
          x1: -16,
          x2: 272,
          y1: 0,
          y2: 0,
        },
      ],
      margin: [0, 2, 0, 2],
    };
  }

  #getDateSection(order: PrinterOrder): JsonObject {
    return { style: 'dateText', text: order.session.startsAtDate };
  }

  #getDisclaimerAndLogoSection(order: PrinterOrder): JsonObject {
    const hasDisclaimer = this.#isCirqueDuSoleil(order);
    const logoStack = hasDisclaimer
      ? [
          { margin: [0, 0, 0, 2], style: 'providedByLabel', text: this.providedByTranslation },
          {
            alignment: 'right',
            image: logoDict.pdfFeverLogo.image,
            width: 40,
          },
        ]
      : [
          {
            alignment: 'center',
            margin: [0, 0, 0, 2],
            style: 'providedByLabel',
            text: this.providedByTranslation,
          },
          {
            alignment: 'center',
            image: logoDict.pdfFeverLogo.image,
            width: 40,
          },
        ];

    if (hasDisclaimer) {
      return {
        columns: [
          {
            style: 'disclaimer',
            text: this.#disclaimerTranslationCirqueDuSoleil,
            width: '80%',
          },
          {
            stack: logoStack,
            width: '20%',
          },
        ],
      };
    }

    return {
      alignment: 'center',
      stack: logoStack,
      width: '100%',
    };
  }

  #getHeaderImage(order: PrinterOrder): JsonObject | null {
    if (!this.#isCirqueDuSoleil(order)) {
      return null;
    }
    return {
      alignment: 'center',
      image: logoDict.pdfPCirqueDuSoleilLuzia.image,
      margin: [0, 5, 0, 15],
      width: 120,
    };
  }

  #getPricingAndIdsSection(order: PrinterOrder): JsonObject {
    return {
      columns: [
        {
          margin: [0, 6, 0, 0],
          stack: [
            { margin: [0, 0, 0, 4], style: 'pricingText', text: order.pricing.totalFirstRow },
            { style: 'pricingTotal', text: order.pricing.totalSecondRow },
          ],
          width: '76%',
        },
        {
          alignment: 'right',
          stack: [
            { style: 'idLabel', text: this.orderIdTranslation },
            { margin: [0, 0, 0, 4], style: 'idValue', text: order.orderId || '' },
            { style: 'idLabel', text: this.ticketIdTranslation },
            { style: 'idValue', text: order.ticketId || '' },
          ],
          width: '24%',
        },
      ],
      margin: [0, 0, 0, 0],
    };
  }

  #getQrSection(order: PrinterOrder): JsonObject {
    if (!order.code) {
      return { text: '' };
    }

    const seats = this.#extractSeatsInfo(order);
    const isCirqueDuSoleil = this.#isCirqueDuSoleil(order);

    const logoSpace = !isCirqueDuSoleil ? 118.5 : 0;
    const seatBoxSpace = !seats ? 43.5 : 0;
    const extraMargin = logoSpace + seatBoxSpace;

    return {
      columns: [
        { text: '', width: '*' },
        {
          fit: 75,
          qr: order.code,
          width: 'auto',
        },
        { text: '', width: '*' },
      ],
      margin: [0, 0, 0, 8 + extraMargin],
    };
  }

  #getSeatBox(order: PrinterOrder): JsonObject {
    const seats = this.#extractSeatsInfo(order);

    if (!seats) {
      return { text: '' };
    }

    const boxWidth = 256;
    const boxHeight = 30;

    return {
      margin: [0, 0, 0, 12],
      stack: [
        {
          canvas: [
            {
              h: boxHeight,
              lineWidth: 1,
              r: 4,
              type: 'rect',
              w: boxWidth,
              x: 0,
              y: 0,
            },
          ],
        },
        {
          margin: [0, -22, 0, 0],
          style: 'seatBox',
          text: seats,
        },
      ],
    };
  }

  #getSeparatorLine(): JsonObject {
    return {
      canvas: [
        {
          lineWidth: 1,
          type: 'line',
          x1: 0,
          x2: 256,
          y1: 0,
          y2: 0,
        },
      ],
    };
  }

  #getTicketTypeSection(order: PrinterOrder): JsonObject {
    const ticketLabels = order.tickets.map((t: PrinterTicket) => `${t.numberOfTickets}x ${t.label}`).join(', ');
    return { margin: [0, 0, 0, 4], style: 'ticketType', text: ticketLabels };
  }

  #getTimelessTimeSpacer(): JsonObject {
    return {
      margin: [0, 6, 0, 24],
      text: '',
    };
  }

  #getTimesSection(order: PrinterOrder): JsonObject {
    const effectiveTimeGranularity = this.getEffectiveBookingTimeGranularity(order);
    const showStartTime = effectiveTimeGranularity === TicketTimeGranularity.DATE_AND_TIME;
    const showSiteOpens = effectiveTimeGranularity !== TicketTimeGranularity.ANYTIME && Boolean(order.session.openGatesAt);
    const showConcessionsOpens = effectiveTimeGranularity !== TicketTimeGranularity.ANYTIME && this.#isCirqueDuSoleil(order);

    if (!showStartTime && !showSiteOpens && !showConcessionsOpens) {
      return this.#getTimelessTimeSpacer();
    }

    const timesRowParts: { style: string; text: string }[] = [];
    if (showSiteOpens) {
      timesRowParts.push(
        { style: 'timesLabel', text: `${this.#siteOpensTranslation} ` },
        { style: 'timesValue', text: this.#formatOpenGatesTime(order) },
      );
    }
    if (showConcessionsOpens) {
      if (timesRowParts.length > 0) {
        timesRowParts.push({ style: 'timesLabel', text: '  |  ' });
      }
      timesRowParts.push(
        { style: 'timesLabel', text: `${this.#concessionsOpensTranslation} ` },
        { style: 'timesValue', text: this.#calculateConcessionsOpenTime(order) },
      );
    }

    const stack: JsonObject[] = [];
    if (showStartTime) {
      stack.push({
        margin: [0, 0, 0, 6],
        style: 'showtimeRow',
        text: [{ text: `${this.#showtimeTranslation} ` }, { style: 'showtimeValue', text: order.session.startsAtTime }],
      });
    }
    if (timesRowParts.length > 0) {
      stack.push({
        style: 'timesRow',
        text: timesRowParts,
      });
    }

    return {
      margin: [0, 6, 0, 6],
      stack,
    };
  }

  #getVenueSection(order: PrinterOrder): JsonObject {
    return {
      stack: [
        ...(!this.#isCirqueDuSoleil(order) ? [{ style: 'planName', text: order.plan.name }] : []),
        { style: 'venueAddress', text: order.session.address },
      ],
    };
  }

  #isCirqueDuSoleil(order?: PrinterOrder): boolean {
    return isCirqueDuSoleil(this.partnerId, order?.plan.id);
  }
}

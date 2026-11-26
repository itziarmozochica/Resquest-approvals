import { inject, Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { JsonObject } from '../../../models/json-object';
import { Money } from '../../../models/money.model';
import { AccessTicket, getDiscountApplied } from '../../../models/order/access-ticket.model';
import { Order } from '../../../models/order/order.model';
import { PrinterOrder, PrinterPricing } from '../../../models/order/printer-order.model';
import { PdfTextContent } from '../../pdf-generator/models/content/pdf-text-content';
import { logoDict } from '../../pdf-generator/models/pdf-generator-images';
import { SmallTicketPdfLogoConfig, SmallTicketPdfPricingHelpers, SmallTicketPdfVariant } from './small-ticket-pdf-variant';

export const PRIMAVERA_SOUND_PORTO_2026_PLAN_IDS: readonly number[] = [389015, 554115];

export function isPrimaveraSoundPorto2026PdfLayout(planId: number): boolean {
  return PRIMAVERA_SOUND_PORTO_2026_PLAN_IDS.includes(planId);
}

@Injectable({
  providedIn: 'root',
})
export class PrimaveraSmallTicketPdfVariant implements SmallTicketPdfVariant {
  readonly #translate = inject(TranslateService);

  getLogoConfig(order: PrinterOrder): SmallTicketPdfLogoConfig | null {
    if (!isPrimaveraSoundPorto2026PdfLayout(order.plan.id)) {
      return null;
    }
    return {
      logo: logoDict.pdfPrimaveraSoundPorto2026,
      marginDelta: 43,
      partnerLogo: logoDict.pdfFeverLogo,
      showProvidedLabel: true,
      showProvidedLabelBeforePartnerLogo: true,
    };
  }

  getPdfPricing(
    _order: Order,
    printerOrder: PrinterOrder,
    accessTickets: Map<string, AccessTicket>,
    h: SmallTicketPdfPricingHelpers,
  ): PrinterPricing {
    let showInvitation = false;
    let unitAggregated = 0;
    let surchargeAggregated = 0;
    let discountAggregated = 0;
    let totalAggregated = 0;
    let currency = 'EUR';

    accessTickets.forEach((accessTicket: AccessTicket) => {
      showInvitation = showInvitation || accessTicket.showInvitationLabel;
      unitAggregated += accessTicket.unitPrice.amount;
      surchargeAggregated += accessTicket.surchargePerTicket.amount;
      discountAggregated += getDiscountApplied(accessTicket).amount;
      totalAggregated += accessTicket.total.amount;
      currency = accessTicket.total.currency;
    });

    if (showInvitation) {
      const invitationSecondRow = `       ${h.totalTranslation}: ${new Money(0, currency).toString(h.locale)} (${h.vatTranslation})`;
      return {
        totalFirstRow: h.replaceCurrencySymbolWithCode(h.invitationTranslation),
        totalSecondRow: h.replaceCurrencySymbolWithCode(invitationSecondRow),
      };
    }

    const totalIncludingImpAndDto = new Money(totalAggregated - discountAggregated, currency);
    const unitPrice = new Money(unitAggregated, currency);
    const surchargePerTicket = new Money(surchargeAggregated, currency);

    const vatTicketLabel = h.translate('boxOffice.order.tickets.primaveraPtVatTicketLabel');
    const vatSurchargeLabel = h.translate('boxOffice.order.tickets.primaveraPtVatSurchargeLabel');
    const surchargeNoun = h.translate('boxOffice.order.tickets.primaveraPtPriceSurchargeNoun');
    const vatTotalLabel = h.translate('boxOffice.order.tickets.primaveraPtVatTotalLabel');

    const unitSegment = `${unitPrice.toString(h.locale)} (${vatTicketLabel})`;
    const firstRow =
      surchargePerTicket.amount > 0
        ? `${unitSegment} + ${surchargePerTicket.toString(h.locale)} ${surchargeNoun} (${vatSurchargeLabel})`
        : unitSegment;

    const secondRow = `       ${h.totalTranslation}: ${totalIncludingImpAndDto.toString(h.locale)} (${vatTotalLabel})`;

    return {
      totalFirstRow: h.replaceCurrencySymbolWithCode(firstRow),
      totalSecondRow: h.replaceCurrencySymbolWithCode(secondRow),
    };
  }

  getPricingTableStyle(): string {
    return 'primaveraPtPriceTable';
  }

  getPurchasedAtStyle(order: PrinterOrder): string {
    return isPrimaveraSoundPorto2026PdfLayout(order.plan.id) ? 'primaveraPtPurchaseLine' : 'normalText';
  }

  getPurchaseFooterRows(order: PrinterOrder): JsonObject[][] {
    if (!isPrimaveraSoundPorto2026PdfLayout(order.plan.id)) {
      return [];
    }
    return [
      [
        new PdfTextContent(
          this.#translate.instant('boxOffice.order.tickets.primaveraPtPromoterLine'),
          'primaveraPtPromoterLine',
        ).generateContent(),
      ],
    ];
  }

  getPurchaseRowsAfterPurchasedAt(order: PrinterOrder): JsonObject[][] {
    if (!isPrimaveraSoundPorto2026PdfLayout(order.plan.id)) {
      return [];
    }
    return [
      [
        new PdfTextContent(
          this.#translate.instant('boxOffice.order.tickets.primaveraPtTermsLine'),
          'primaveraPtTermsLine',
        ).generateContent(),
      ],
    ];
  }

  getQrRawCodeLines(order: PrinterOrder): string[] {
    if (!isPrimaveraSoundPorto2026PdfLayout(order.plan.id) || !order.code) {
      return [];
    }
    return this.#splitRawCodeForPdf(order.code, 13);
  }

  getSessionLeadRows(order: PrinterOrder): JsonObject[][] {
    if (!isPrimaveraSoundPorto2026PdfLayout(order.plan.id)) {
      return [];
    }
    const venueLine = this.#getVenueFirstLine(order);
    if (!venueLine) {
      return [];
    }
    return [[new PdfTextContent(venueLine, 'primaveraPtVenueLine').generateContent()]];
  }

  getTicketsSectionHeight(): number {
    return 85;
  }

  getTicketTypeStyle(order: PrinterOrder, isLongLabel: boolean): string {
    if (!isPrimaveraSoundPorto2026PdfLayout(order.plan.id)) {
      return isLongLabel ? 'sessionNameSmall' : 'sessionName';
    }
    return isLongLabel ? 'primaveraSessionNameSmall' : 'primaveraSessionName';
  }

  shouldRenderDefaultSessionInfo(order: PrinterOrder): boolean {
    return !isPrimaveraSoundPorto2026PdfLayout(order.plan.id);
  }

  #getVenueFirstLine(order: PrinterOrder): string {
    const place = order.session.placeName?.trim();
    return place && place.length > 0 ? place : '';
  }

  #splitRawCodeForPdf(rawCode: string, maxCharsPerLine: number): string[] {
    if (!rawCode) {
      return [];
    }
    const chunks: string[] = [];
    for (let index = 0; index < rawCode.length; index += maxCharsPerLine) {
      chunks.push(rawCode.slice(index, index + maxCharsPerLine));
    }
    return chunks;
  }
}

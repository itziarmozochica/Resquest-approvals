import { inject, Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { DatadogLogService } from '../../../core/error/datadog/logger/datadog-log.service';
import { PlanContent } from '../../../modules/content-plan/models/plan-content';
import { JsonObject } from '../../models/json-object';
import { Order } from '../../models/order/order.model';
import { PrinterOrder, PrinterPricing } from '../../models/order/printer-order.model';
import { TicketTimeGranularity } from '../../models/order/ticket-time-granularity.enum';
import {
  CAPN_ID,
  CATEDRAL_SEGOVIA,
  isMerlinPartner,
  isPernodRicardPartner,
  PARADOX_MUSEUM_INDIA,
  PartnerService,
} from '../partner/partner.service';
import { PdfImageContent } from '../pdf-generator/models/content/pdf-image-content';
import { PdfQrContent } from '../pdf-generator/models/content/pdf-qr-content';
import { PdfTableContent } from '../pdf-generator/models/content/pdf-table-content';
import { PdfTextContent } from '../pdf-generator/models/content/pdf-text-content';
import { logoDict } from '../pdf-generator/models/pdf-generator-images';
import { PRIMAVERA_SOUND_PORTO_2025_ID } from '../zebra-zpl-print/models/zebra-zpl.model';
import { PdfLogo, TicketGeneratorService } from './ticket-generator.service';
import { SmallTicketPdfPricingHelpers } from './variants/small-ticket-pdf-variant';
import { SmallTicketPdfVariantResolver } from './variants/small-ticket-pdf-variant-resolver';

@Injectable({
  providedIn: 'root',
})
export class TicketSmallGeneratorService extends TicketGeneratorService {
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #smallTicketPdfVariantResolver = inject(SmallTicketPdfVariantResolver);

  constructor(translateService: TranslateService, partnerService: PartnerService) {
    super(translateService, partnerService);
  }

  downloadAndOpenPdf(orders: { order: Order; isUnifiedTicket?: boolean }[], afterRetry: boolean = false): void {
    if (this.isNotPrintableOrders(orders.map(o => o.order))) {
      return;
    }

    const orderIds = orders.map(o => o.order.id);
    this.#datadogLogService.logInfo(`[ZebraPrinter] Download the following orders as PDF : ${orderIds.join(', ')}`, {
      afterRetry,
      orderIds,
      planNames: orders.map(o => o.order.planName),
    });
    this.downloadTickets(orders);
    this.printTickets();
  }

  getTicket(order: PrinterOrder): PdfTableContent {
    return new PdfTableContent({
      content: {
        body: [[this.getMainFramePdfContent(order).generateContent(), this.getSideFramePdfContent(order).generateContent()]],
        heights: [100],
        widths: [207, 50],
      },
      layout: 'noBorders',
    });
  }

  readonly #pdfVariant = (order: PrinterOrder) => this.#smallTicketPdfVariantResolver.resolve(this.partnerId ?? 0, order);

  readonly #getPdfPricingHelpers = (): SmallTicketPdfPricingHelpers => ({
    invitationTranslation: this.invitationTranslation,
    locale: this.locale,
    surchargeTranslation: this.surchargeTranslation,
    totalIncludedInPriceTranslation: this.totalIncludedInPriceTranslation,
    totalTranslation: this.totalTranslation,
    vatTranslation: this.vatTranslation,
    replaceCurrencySymbolWithCode: (content: string) => this.replaceCurrencySymbolWithCode(content),
    translate: (key: string) => this.translateService.instant(key),
  });

  readonly #pdfPricingForPrinterOrder = (order: PrinterOrder): PrinterPricing => {
    if (!this.pdfRenderOrder || !this.pdfRenderAccessTickets) {
      return order.pricing;
    }
    return this.#pdfVariant(order).getPdfPricing(this.pdfRenderOrder, order, this.pdfRenderAccessTickets, this.#getPdfPricingHelpers());
  };

  readonly #buildSessionSectionRows = (order: PrinterOrder): JsonObject[][] => {
    const variant = this.#pdfVariant(order);
    const sessionBody: JsonObject[][] = [...variant.getSessionLeadRows(order)];
    if (variant.shouldRenderDefaultSessionInfo(order)) {
      sessionBody.push([new PdfTextContent(this.truncateText(order.session.address, 100), 'normalText').generateContent()]);
      const effectiveTimeGranularity = this.getEffectiveBookingTimeGranularity(order);
      if (effectiveTimeGranularity === TicketTimeGranularity.DATE_AND_TIME) {
        sessionBody.push([
          new PdfTextContent(order.session.startsAtDate + ' - ' + order.session.startsAtTime, 'normalText').generateContent(),
        ]);
      } else if (effectiveTimeGranularity === TicketTimeGranularity.DATE) {
        sessionBody.push([new PdfTextContent(order.session.startsAtDate, 'normalText').generateContent()]);
      }
    }
    return sessionBody;
  };

  readonly #buildPurchaseSectionRows = (order: PrinterOrder): JsonObject[][] => {
    const variant = this.#pdfVariant(order);
    const bodyPurchaseInfo: JsonObject[][] = [];
    if (this.partnerId === PARADOX_MUSEUM_INDIA) {
      bodyPurchaseInfo.push([
        new PdfTextContent(this.getParadoxMuseumIndiaLegalInformation().join('\n'), 'legalInformationText').generateContent(),
      ]);
    }
    for (const row of variant.getPurchaseFooterRows(order)) {
      bodyPurchaseInfo.push(row);
    }
    bodyPurchaseInfo.push([
      new PdfTextContent(this.purchasedAtTranslation + order.createdAt, variant.getPurchasedAtStyle(order)).generateContent(),
    ]);
    for (const row of variant.getPurchaseRowsAfterPurchasedAt(order)) {
      bodyPurchaseInfo.push(row);
    }
    return bodyPurchaseInfo;
  };

  initializeDocument(): void {
    this.styles = {
      addressAndDateTable: {
        marginBottom: 0,
        marginTop: -15,
      },
      alignmentRight: {
        alignment: 'right',
        marginRight: 8,
      },
      boldNormalText: {
        bold: true,
        fontSize: 8,
        lineHeight: 0.8,
      },
      emptySpacer: {
        marginRight: 43,
      },
      headerTable: {
        marginBottom: 0,
      },
      idInfoLabel: {
        fontSize: 5,
        lineHeight: 0.5,
        marginRight: 20,
        marginTop: -1.5,
      },
      idInfoValue: {
        fontSize: 9,
        lineHeight: 0.5,
      },
      legalInformationText: {
        fontSize: 4,
        lineHeight: 0.8,
        marginTop: -45,
      },
      newProvidedTable: {
        marginBottom: -5,
      },
      newSeats: {
        fontSize: 8,
        lineHeight: 0.7,
        marginTop: -5,
      },
      newSessionNameAndPrice: {
        marginBottom: 4,
        marginTop: -5,
      },
      newTermAndConditionsQr: {
        marginLeft: -3,
      },
      newTermAndConditionsTable: {
        marginRight: 0,
      },
      newTermAndConditionsText: {
        fontSize: 4.5,
        marginLeft: -5,
        marginTop: 10,
      },
      normalText: {
        fontSize: 8,
        lineHeight: 0.8,
        marginTop: -5,
      },
      numberOfTicketsLabel: {
        alignment: 'center',
        fontSize: 5,
        lineHeight: 0.5,
        marginTop: -5,
      },
      numberOfTicketsValue: {
        alignment: 'center',
        bold: true,
        fontSize: 20,
        marginBottom: 0,
      },
      orderInfo: {
        marginTop: 0,
      },
      planName: {
        fontSize: 13,
        marginBottom: 0,
        noWrap: false,
      },
      planNameSmall: {
        fontSize: 9,
        marginBottom: 0,
        noWrap: false,
      },
      priceTable: {
        marginTop: 0,
      },
      primaveraPtPriceTable: {
        marginTop: 0,
      },
      primaveraPtPromoterLine: {
        fontSize: 6.5,
        lineHeight: 0.8,
        marginBottom: 1,
        marginTop: -2,
      },
      primaveraPtPurchaseLine: {
        fontSize: 6.5,
        lineHeight: 0.8,
        marginTop: -5,
      },
      primaveraPtTermsLine: {
        fontSize: 5.5,
        lineHeight: 0.8,
        marginTop: 0,
      },
      primaveraPtVenueLine: {
        bold: true,
        fontSize: 9,
        lineHeight: 0.8,
      },
      primaveraQrCode: {
        alignment: 'right',
        marginRight: 8,
      },
      primaveraQrRawCode: {
        alignment: 'center',
        fontSize: 6,
        lineHeight: 0.8,
        marginRight: 15,
        marginTop: -2,
        noWrap: true,
      },
      primaveraSessionName: {
        bold: true,
        fontSize: 10,
        marginTop: 0,
      },
      primaveraSessionNameSmall: {
        bold: true,
        fontSize: 9,
        marginTop: 0,
      },
      primaveraStackedPartnerLogo: {
        marginTop: -1,
      },
      providedLabel: {
        fontSize: 5,
        marginBottom: -3,
      },
      providedTable: {
        alignment: 'right',
        marginTop: -4,
      },
      qrCode: {
        alignment: 'right',
        bold: true,
        fontSize: 7,
      },
      seats: {
        fontSize: 8,
        lineHeight: 0.8,
        marginTop: 2,
      },
      sessionLabel: {
        bold: true,
        fontSize: 8,
      },
      sessionName: {
        fontSize: 9,
        marginTop: 0,
      },
      sessionNameAndPrice: {
        marginBottom: 4,
        marginTop: 0,
      },
      sessionNameSmall: {
        bold: true,
        fontSize: 8,
        marginTop: 0,
      },
      sessionTickets: {
        alignment: 'right',
        bold: true,
        fontSize: 8,
        marginTop: 0,
      },
      shortTicketTable: {
        marginTop: 2,
      },
      startTime: {
        bold: true,
        fontSize: 8,
        lineHeight: 0.8,
        marginLeft: -6,
        marginTop: -5,
      },
      startTimeTable: {
        marginTop: 0,
      },
      termAndConditionsQr: {
        marginTop: -1,
      },
      termAndConditionsTable: {
        marginRight: 20,
        marginTop: -18,
      },
      termAndConditionsText: {
        fontSize: 4.5,
        marginLeft: -5,
        marginTop: 19,
      },
      ticketHolder: {
        fontSize: 8,
        lineHeight: 0.7,
        marginTop: -5,
      },
      ticketInfo: {
        marginTop: 0,
      },
      ticketTable: {
        marginTop: 0,
      },
    };
    this.document = {
      content: this.content,
      defaultStyle: {
        font: this.useMontserratFont ? 'Montserrat' : 'ArialUnicode',
      },
      pageMargins: [15, 8, 15, 0],
      pageSize: { height: 215, width: 290 }, //112x72mm
      styles: this.styles,
    };
  }

  async print(orders: { order: Order; isHidePriceEnabled?: boolean; isUnifiedTicket?: boolean }[]): Promise<void> {
    this.downloadAndOpenPdf(orders);
  }

  #getRawCodeMarginCompensation(rawCodeLines: string[]): number {
    if (!rawCodeLines.length) {
      return 0;
    }
    const lineCount = rawCodeLines.length;
    return 8 + (lineCount - 1) * 5;
  }

  private generateNumberOfTicketsPdfContent(totalOfTickets: number): PdfTableContent {
    return new PdfTableContent({
      content: {
        body: [
          [new PdfTextContent(String(totalOfTickets), 'numberOfTicketsValue').generateContent()],
          [new PdfTextContent('tickets', 'numberOfTicketsLabel').generateContent()],
          [
            new PdfTextContent('', 'emptySpacer').generateContent(),
            // This line is needed to center the content
          ],
        ],
        width: [50],
      },
      layout: 'noBorders',
    });
  }

  private generateOrderIdPdfContent(orderId: string): PdfTableContent {
    return new PdfTableContent(
      {
        content: {
          body: [
            [new PdfTextContent(this.orderIdTranslation, 'idInfoLabel').generateContent()],
            [new PdfTextContent(orderId, 'idInfoValue').generateContent()],
          ],
        },
        layout: 'noBorders',
      },
      'orderInfo',
    );
  }

  private generateProvideByPdfContent(
    logoDict: PdfLogo,
    showProvidedLabel: boolean,
    partnerLogo?: PdfLogo,
    showProvidedLabelBeforePartnerLogo: boolean = false,
  ): PdfTableContent {
    const body: unknown[] = [];
    if (showProvidedLabel && !showProvidedLabelBeforePartnerLogo) {
      body.push([new PdfTextContent(this.providedByTranslation, 'providedLabel').generateContent()]);
    }
    body.push([new PdfImageContent(logoDict, 'feverLogo').generateContent()]);
    if (showProvidedLabel && showProvidedLabelBeforePartnerLogo && partnerLogo) {
      body.push([new PdfTextContent(this.providedByTranslation, 'providedLabel').generateContent()]);
    }
    if (partnerLogo) {
      body.push([new PdfImageContent(partnerLogo, 'primaveraStackedPartnerLogo').generateContent()]);
    }
    return new PdfTableContent(
      {
        content: {
          body: body,
        },
        layout: 'noBorders',
      },
      'newProvidedTable',
    );
  }

  private generateTermsAndConditionsPdfContent(termsAndConditionsQrImage: string): PdfTableContent {
    return new PdfTableContent(
      {
        content: {
          body: [
            [
              new PdfTableContent({
                content: {
                  body: [
                    [
                      new PdfImageContent(
                        {
                          height: 25,
                          image: termsAndConditionsQrImage,
                          width: 25,
                        },
                        'newTermAndConditionsQr',
                      ).generateContent(),
                    ],
                  ],
                },
                layout: 'noBorders',
              }).generateContent(),
              new PdfTableContent({
                content: {
                  body: [[new PdfTextContent(this.termsHeaderTranslation, 'newTermAndConditionsText').generateContent()]],
                },
                layout: 'noBorders',
              }).generateContent(),
            ],
          ],
          widths: ['auto', 20],
        },
        layout: 'noBorders',
      },
      'newTermAndConditionsTable',
    );
  }

  private generateTicketIdPdfContent(ticketId: number): PdfTableContent {
    return new PdfTableContent(
      {
        content: {
          body: [
            [new PdfTextContent(this.ticketIdTranslation, 'idInfoLabel').generateContent()],
            [new PdfTextContent(ticketId.toString(), 'idInfoValue').generateContent()],
          ],
        },
        layout: 'noBorders',
      },
      'ticketInfo',
    );
  }

  private generateTicketPdfContent(order: PrinterOrder): JsonObject[] {
    if (!order.position) {
      return [this.generateNumberOfTicketsPdfContent(order.totalOfTickets).generateContent()];
    }
    return [];
  }

  private getEventNamePdfContent(plan: PlanContent): PdfTableContent {
    const planNameLength = plan.name?.length ?? 0;
    return new PdfTableContent({
      content: {
        body: [
          [
            new PdfTextContent(
              this.truncateText(plan.name ?? '', 135),
              planNameLength > 55 ? 'planNameSmall' : 'planName',
            ).generateContent(),
          ],
        ],
      },
      layout: 'noBorders',
    });
  }

  private getMainFramePdfContent(order: PrinterOrder): PdfTableContent {
    const ticketsSectionHeight = this.#pdfVariant(order).getTicketsSectionHeight();
    return new PdfTableContent({
      content: {
        body: [
          [this.getEventNamePdfContent(order.plan).generateContent()],
          [this.getSessionInfoPdfContent(order).generateContent()],
          [this.getTicketsDetailPdfContent(order).generateContent()],
          [this.getPurchaseInfoPdfContent(order).generateContent()],
        ],
        heights: [60, 'auto', ticketsSectionHeight, 'auto'],
      },
      layout: 'noBorders',
    });
  }

  private getMerlinVenueLogo(placeId: number | undefined): PdfLogo {
    switch (placeId) {
      case 12494:
        return logoDict.pdfMerlinLondonEye;
      case 16804:
        return logoDict.pdfMerlinMadameTussauds;
      case 17082:
        return logoDict.pdfMerlinMadameTussaudsLasVegas;
      case 16875:
        return logoDict.pdfMerlinMadameTussaudsHollywood;
      case 14982:
        return logoDict.pdfMerlinSeaLife;
      case 22111:
        return logoDict.pdfMerlinShreksAdventure;
      case 9067:
        return logoDict.pdfMerlinLondonDungeon;
      default:
        return logoDict.pdfFeverLogo;
    }
  }

  private getPricingPdfContent(pricing: PrinterPricing, tableStyle: string = 'priceTable'): PdfTableContent {
    const totalFirstRow = new PdfTextContent(pricing.totalFirstRow, 'normalText');
    const totalSecondRow = new PdfTextContent(pricing.totalSecondRow, 'boldNormalText');
    return new PdfTableContent(
      {
        content: {
          body: [[totalFirstRow.generateContent()], [totalSecondRow.generateContent()]],
        },
        layout: 'noBorders',
      },
      tableStyle,
    );
  }

  private getPurchaseInfoPdfContent(order: PrinterOrder): PdfTableContent {
    return new PdfTableContent(
      {
        content: {
          body: this.#buildPurchaseSectionRows(order),
        },
        layout: 'noBorders',
      },
      'addressAndDateTable',
    );
  }

  private getQrCodePdfContent(code: string, rawCodeLines?: string[]): PdfTableContent {
    const qrStyle = rawCodeLines?.length ? 'primaveraQrCode' : 'alignmentRight';
    const body: unknown[] = [[code ? new PdfQrContent({ fit: 60, qr: code }, qrStyle).generateContent() : '']];
    if (rawCodeLines?.length) {
      for (const rawCodeLine of rawCodeLines) {
        body.push([new PdfTextContent(rawCodeLine, 'primaveraQrRawCode').generateContent()]);
      }
    }
    return new PdfTableContent({
      content: {
        body,
        widths: [60],
      },
      layout: 'noBorders',
    });
  }

  private getSessionInfoPdfContent(order: PrinterOrder): PdfTableContent {
    return new PdfTableContent(
      {
        content: {
          body: this.#buildSessionSectionRows(order),
          heights: [5, 'auto'],
        },
        layout: 'noBorders',
      },
      'addressAndDateTable',
    );
  }

  private getSideFramePdfContent(order: PrinterOrder): PdfTableContent {
    const pdfVariant = this.#pdfVariant(order);
    const rawCodeLines = pdfVariant.getQrRawCodeLines(order);
    const body: unknown[] = [[this.getQrCodePdfContent(order.code, rawCodeLines).generateContent()]];
    const ticketContent: JsonObject[] = this.generateTicketPdfContent(order);
    let margin = ticketContent.length > 0 ? 70 : 120;
    if (rawCodeLines.length > 0) {
      margin -= 30;
      margin -= this.#getRawCodeMarginCompensation(rawCodeLines ?? []);
    }
    ticketContent.length && body.push(ticketContent);

    const ticketId: number | undefined = order.ticketId;
    if (ticketId !== undefined) {
      body.push([this.generateTicketIdPdfContent(ticketId).generateContent()]);
      margin -= 20;
    }
    body.push([this.generateOrderIdPdfContent(order.orderId).generateContent()]);

    const variantLogoConfig = pdfVariant.getLogoConfig(order);
    if (this.partnerId !== CAPN_ID) {
      if (variantLogoConfig !== null) {
        body.push([
          this.generateProvideByPdfContent(
            variantLogoConfig.logo,
            variantLogoConfig.showProvidedLabel,
            variantLogoConfig.partnerLogo,
            variantLogoConfig.showProvidedLabelBeforePartnerLogo,
          ).generateContent(),
        ]);
        margin -= variantLogoConfig.marginDelta;
      } else {
        let pdfLogo: PdfLogo;
        const isMerlin = isMerlinPartner(this.partnerId);
        const isPernodRicard = isPernodRicardPartner(this.partnerId);
        if (order.session.isoCountryCode === 'IN') {
          pdfLogo = logoDict.pdfLiveYourCityLogo;
        } else if (this.partnerId === CATEDRAL_SEGOVIA) {
          pdfLogo = logoDict.pdfSegovia;
        } else if (order.plan.id === PRIMAVERA_SOUND_PORTO_2025_ID) {
          pdfLogo = logoDict.pdfPrimaverSoundPorto2025;
        } else if (isPernodRicard) {
          pdfLogo = logoDict.pdfPernodRicard;
        } else if (isMerlin) {
          pdfLogo = this.getMerlinVenueLogo(order.placeId);
        } else {
          pdfLogo = logoDict.pdfFeverLogo;
        }
        const hasCustomLogo =
          this.partnerId === CATEDRAL_SEGOVIA || isMerlin || order.plan.id === PRIMAVERA_SOUND_PORTO_2025_ID || isPernodRicard;
        body.push([this.generateProvideByPdfContent(pdfLogo, !hasCustomLogo).generateContent()]);
        margin -= isPernodRicard ? 14 : hasCustomLogo ? 43 : 25;
      }
    }

    if (order.plan.termsAndConditionsQrImage) {
      body.push([this.generateTermsAndConditionsPdfContent(order.plan.termsAndConditionsQrImage).generateContent()]);
      margin -= 30;
    }

    if (order.code == null) {
      margin += 40;
    }

    if (ticketId !== undefined) {
      (this.styles['ticketInfo'] as JsonObject)['marginTop'] = margin;
    } else {
      (this.styles['orderInfo'] as JsonObject)['marginTop'] = margin;
    }
    return new PdfTableContent({
      content: {
        body,
        heights: ['auto', rawCodeLines.length > 0 ? 15 : 50, 'auto', 'auto', 'auto'],
        width: ['auto'],
      },
      layout: 'noBorders',
    });
  }

  private getTicketsDetailPdfContent(order: PrinterOrder): PdfTableContent {
    const tickets = order.tickets;
    const variant = this.#pdfVariant(order);
    const pricing = this.#pdfPricingForPrinterOrder(order);
    const pricingTableStyle = this.#pdfVariant(order).getPricingTableStyle();
    const ticketTypesTableBody: unknown[] = [];
    const expiryDateTableBody: unknown[] = [];
    tickets.forEach(ticket => {
      const ticketNameStyle = variant.getTicketTypeStyle(order, ticket.label.length > 210);
      const name = new PdfTextContent(`${ticket.numberOfTickets}x ${this.truncateText(ticket.label, 140)}`, ticketNameStyle);
      ticketTypesTableBody.push([name.generateContent()]);
      if (ticket.session_label) {
        const sessionLabel = new PdfTextContent(ticket.session_label, 'sessionLabel');
        ticketTypesTableBody.push([sessionLabel.generateContent()]);
      }
      if (ticket.seats.length > 0) {
        ticketTypesTableBody.push([new PdfTextContent(ticket.seats.join(', '), 'newSeats').generateContent()]);
      }
      if (ticket.holderName) {
        ticketTypesTableBody.push([new PdfTextContent(ticket.holderName, 'ticketHolder').generateContent()]);
      }
      if (ticket.expiryDate !== undefined) {
        expiryDateTableBody.push([new PdfTextContent(this.validUntilTranslation + ticket.expiryDate, 'normalText').generateContent()]);
      }
    });

    const ticketTypesTable = new PdfTableContent({
      content: {
        body: ticketTypesTableBody,
      } as JsonObject,
      layout: 'noBorders',
    });

    const pdfTableContentBody: JsonObject[][] = [
      [ticketTypesTable.generateContent()],
      [this.getPricingPdfContent(pricing, pricingTableStyle).generateContent()],
    ];
    if (expiryDateTableBody.length > 0) {
      pdfTableContentBody.push([
        new PdfTableContent({
          content: {
            body: expiryDateTableBody,
          } as JsonObject,
          layout: 'noBorders',
        }).generateContent(),
      ]);
    }

    return new PdfTableContent({
      content: {
        body: pdfTableContentBody,
      },
      layout: 'noBorders',
    });
  }
}

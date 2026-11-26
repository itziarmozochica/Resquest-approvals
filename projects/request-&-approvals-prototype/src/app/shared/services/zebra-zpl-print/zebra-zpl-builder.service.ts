import { inject, Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { buildFolioZeroPrinterOrder } from '../../factories/build-folio-zero-printer-order';
import { buildPrinterOrder } from '../../factories/build-printer-order';
import { AccessTicket } from '../../models/order/access-ticket.model';
import { PrinterOrder, PrinterOrderLabels, PrintOrderInput } from '../../models/order/printer-order.model';
import { FeatureFlags } from '../../optimizely/feature-flags';
import { OptimizelyService } from '../../optimizely/optimizely.service';
import { withDefaultIsUnifiedTicket } from '../../utils/print-orders.util';
import { replaceCurrencySymbolWithCode } from '../../utils/print-text.util';
import { PartnerService } from '../partner/partner.service';
import { SessionTypeCatalogItem } from '../sessions/session-type-catalog.model';
import { FolioZeroPrintPreview } from './models/folio-zero-print-preview.model';
import {
  zebraPartnersWithReceipt,
  ZebraZplSetup,
  ZplLabelContext,
  ZplLabels,
  zplPurgeStoredJobs,
  ZplReceiptLabels,
} from './models/zebra-zpl.model';
import { buildReceiptZpl } from './utils/zpl-receipt.util';
import { buildFolioZeroTicketZpl, buildTicketZpl } from './utils/zpl-ticket.util';

@Injectable({
  providedIn: 'root',
})
export class ZebraZplBuilderService {
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #partnerService = inject(PartnerService);
  readonly #translateService = inject(TranslateService);

  readonly #locale: string = this.#translateService.currentLang;

  readonly #labels: ZplLabels = {
    orderId: this.#translateService.instant('boxOffice.order.tickets.orderId'),
    providedBy: this.#translateService.instant('boxOffice.order.tickets.providedBy'),
    purchasedAt: this.#translateService.instant('boxOffice.order.tickets.purchasedAt') + ': ',
    termsHeader: this.#translateService.instant('boxOffice.order.tickets.termsHeader'),
    ticketId: this.#translateService.instant('boxOffice.order.tickets.ticketId'),
  };

  readonly #printerOrderLabels: PrinterOrderLabels = {
    invitation: this.#translateService.instant('boxOffice.order.tickets.invitation'),
    locale: this.#locale,
    surcharge: this.#translateService.instant('boxOffice.order.tickets.surcharge'),
    total: this.#translateService.instant('boxOffice.order.tickets.total'),
    totalIncludedInPrice: this.#translateService.instant('boxOffice.order.tickets.totalIncludedInPriceTranslation'),
    vat: this.#translateService.instant('boxOffice.order.tickets.vat'),
    formatLoyaltyPoints: (points: number) => this.#formatLoyaltyPoints(points),
  };

  buildFolioZeroZpl(preview: FolioZeroPrintPreview, setup: ZebraZplSetup): string {
    const context = this.#getContext();
    const zpl = preview.selectedSessionTypes.reduce((accumulatedZpl: string, sessionType: SessionTypeCatalogItem, index: number) => {
      const printerOrder = buildFolioZeroPrinterOrder(preview, sessionType, { locale: this.#locale });
      printerOrder.pricing = {
        totalFirstRow: replaceCurrencySymbolWithCode(printerOrder.pricing.totalFirstRow),
        totalSecondRow: replaceCurrencySymbolWithCode(printerOrder.pricing.totalSecondRow),
      };
      const isLast = index === preview.selectedSessionTypes.length - 1;

      return accumulatedZpl + buildFolioZeroTicketZpl(printerOrder, context, setup, isLast);
    }, '');

    return zpl.length === 0 ? '' : zplPurgeStoredJobs + zpl;
  }

  buildOrdersZpl(orders: PrintOrderInput[], setup: ZebraZplSetup): string {
    const context = this.#getContext();
    let zpl = '';
    for (const { isHidePriceEnabled, isUnifiedTicket, order } of withDefaultIsUnifiedTicket(orders)) {
      if (!order.accessTickets?.size) {
        return '';
      }
      const accessTickets: Map<string, AccessTicket> = order.accessTickets;
      let index = 0;
      if (isUnifiedTicket) {
        const printerOrder: PrinterOrder = buildPrinterOrder(order, accessTickets, this.#printerOrderLabels, undefined, isHidePriceEnabled);
        zpl += buildTicketZpl(printerOrder, context, setup, { isLast: true, isUnifiedTicket });
      } else {
        const shouldCutEveryTicket: boolean =
          this.#optimizelyService.isFeatureEnabled(FeatureFlags.ZEBRA_PRINTER_CUT_EVERY_TICKET, {
            plan_id: order?.planId?.toString() ?? '',
          }) ?? false;
        accessTickets.forEach((accessTicket: AccessTicket) => {
          index++;
          const isLast: boolean = accessTickets.size === index || shouldCutEveryTicket;
          const printerOrder: PrinterOrder = buildPrinterOrder(
            order,
            new Map([[accessTicket.id.toString(), accessTicket]]),
            this.#printerOrderLabels,
            index,
            isHidePriceEnabled,
          );
          zpl += buildTicketZpl(printerOrder, context, setup, { isLast, isUnifiedTicket });
        });
      }
      if (this.shouldPrintReceipt()) {
        zpl += buildReceiptZpl(order, context.partnerId ?? 0, this.#getReceiptLabels(), this.#locale, setup, true);
      }
    }

    return zpl.length > 0 ? zplPurgeStoredJobs + zpl : zpl;
  }

  shouldPrintReceipt(): boolean {
    const partnerId = this.#partnerId;

    return partnerId !== undefined && zebraPartnersWithReceipt.includes(partnerId);
  }

  #formatLoyaltyPoints(points: number): string {
    return this.#translateService.instant('orders.loyaltyPoints', {
      points: new Intl.NumberFormat(this.#locale || 'en').format(points),
    });
  }

  #getContext(): ZplLabelContext {
    return { labels: this.#labels, partnerId: this.#partnerId };
  }

  #getReceiptLabels(): ZplReceiptLabels {
    return {
      address: this.#translateService.instant('boxOffice.order.receipt.address'),
      email: this.#translateService.instant('boxOffice.order.receipt.email'),
      phone: this.#translateService.instant('boxOffice.order.receipt.phone'),
      taxBase: this.#translateService.instant('boxOffice.order.receipt.taxBase'),
      taxBreakdown: this.#translateService.instant('boxOffice.order.receipt.taxBreakdown'),
      title: this.#translateService.instant('boxOffice.order.receipt.title'),
      total: this.#translateService.instant('boxOffice.order.receipt.total'),
    };
  }

  get #partnerId(): number | undefined {
    return this.#partnerService.getPartner()?.id;
  }
}

import { inject, Injectable } from '@angular/core';

import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';

import { Order } from '../../models/order/order.model';
import { PrintImagesBackfeedSequence } from '../webview-messenger/models/print-images-message.model';
import { ZebraZplPrintService } from '../zebra-zpl-print/zebra-zpl-print.service';
import { HtmlRenderResult } from './models/html-render-result.model';
import { PrintDocumentRendererService } from './print-document-renderer.service';
import { TicketLargeGeneratorService } from './ticket-large-generator.service';
import { TicketPrePrintedFrontGeneratorService } from './ticket-pre-printed-front-generator.service';
import { TicketSmallGeneratorService } from './ticket-small-generator.service';

@Injectable({
  providedIn: 'root',
})
export class TicketGeneratorFacadeService {
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #printDocumentRendererService = inject(PrintDocumentRendererService);
  readonly #ticketLargeGenerator = inject(TicketLargeGeneratorService);
  readonly #ticketPrePrintedFrontGenerator = inject(TicketPrePrintedFrontGeneratorService);
  readonly #ticketSmallGenerator = inject(TicketSmallGeneratorService);
  readonly #zebraZplPrintService = inject(ZebraZplPrintService);

  // The backfeed sequence a dual-screen asks for with these orders' images, when they print on stock printed
  // on the front; the other layouts leave the Android host's default.
  getBackfeedSequence(orders: { order: Order; isUnifiedTicket?: boolean }[], shouldCut: boolean): PrintImagesBackfeedSequence | undefined {
    const generator = this.#getGenerator(orders);
    return generator === this.#ticketPrePrintedFrontGenerator
      ? this.#ticketPrePrintedFrontGenerator.getBackfeedSequence(shouldCut)
      : undefined;
  }

  getBase64Tickets(
    orders: { order: Order; isHidePriceEnabled?: boolean; isUnifiedTicket?: boolean }[],
    shouldRotate: boolean = true,
  ): Promise<string[]> {
    return this.#getGenerator(orders).getBase64Tickets(orders, shouldRotate);
  }

  getHtmlBase64Tickets(
    order: Order,
    shouldRotate: boolean = true,
    isUnifiedTicket: boolean = false,
    isHidePriceEnabled: boolean = false,
    signal?: AbortSignal,
  ): Promise<HtmlRenderResult> {
    return this.#printDocumentRendererService.getBase64Tickets(order, shouldRotate, isUnifiedTicket, isHidePriceEnabled, signal);
  }

  // The mark offset a dual-screen sends with these orders' images, when they print on stock printed on the
  // front; the other layouts print from the mark.
  getMarkOffsetDots(orders: { order: Order; isUnifiedTicket?: boolean }[]): number | undefined {
    const generator = this.#getGenerator(orders);
    return generator === this.#ticketPrePrintedFrontGenerator ? this.#ticketPrePrintedFrontGenerator.getMarkOffsetDots() : undefined;
  }

  print(orders: { isHidePriceEnabled: boolean; order: Order; isUnifiedTicket?: boolean }[]): Promise<void> {
    const generator = this.#getGenerator(orders);
    if (generator === this.#ticketSmallGenerator && this.#zebraZplPrintService.isZebraPrinter()) {
      return this.#zebraZplPrintService.print(orders);
    }
    return generator.print(orders);
  }

  #getGenerator(
    orders: { order: Order; isUnifiedTicket?: boolean }[],
  ): TicketSmallGeneratorService | TicketLargeGeneratorService | TicketPrePrintedFrontGeneratorService {
    const planId = orders[0]?.order?.planId?.toString() ?? '';

    const usePrePrintedFrontTicket = this.#optimizelyService.isFeatureEnabled(FeatureFlags.PRE_PRINTED_FRONT_TICKET_PDF, {
      plan_id: planId,
    });
    if (usePrePrintedFrontTicket === true) {
      return this.#ticketPrePrintedFrontGenerator;
    }

    const useLargeTicket =
      this.#optimizelyService.isFeatureEnabled(FeatureFlags.LARGE_TICKET_PDF, {
        plan_id: planId,
      }) ?? false;

    return useLargeTicket ? this.#ticketLargeGenerator : this.#ticketSmallGenerator;
  }
}

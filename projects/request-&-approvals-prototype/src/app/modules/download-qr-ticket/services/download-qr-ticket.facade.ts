import { DOCUMENT, inject, Injectable, signal } from '@angular/core';

import { datadogRum } from '@datadog/browser-rum-slim';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { STORAGE_SERVICE, type StoragePort } from '@fz/storage';
import { IgntDialogService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { catchError, EMPTY, finalize, map, Observable, tap } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { BaseErrorResponse, BaseResponse } from '../../../shared/models/base-response';
import { Order } from '../../../shared/models/order/order.model';
import {
  DownloadQrTicketLink,
  encodedOrderNotFoundErrorCode,
  genericErrorMessageKey,
  OpenedTicketsOrder,
  OpenedTicketsState,
  orderNotFoundMessageKey,
  TicketBatchLink,
} from '../models/download-qr-ticket.model';
import { clickDownloadTicketPdf } from '../tracking/events/click-download-ticket-pdf.event';
import { openDownloadTicketPage } from '../tracking/events/open-download-ticket-page.event';
import { buildEncodedOrderTicketPdfUrl, chunkCodeIds } from '../utils/encoded-order-ticket-pdf.util';
import { OpenOrderService } from './open-order/open-order.service';

@Injectable()
export class DownloadQrTicketFacade {
  readonly #dialogService = inject(IgntDialogService);
  readonly #document = inject(DOCUMENT);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #openOrderService = inject(OpenOrderService);
  readonly #storage: StoragePort = inject(STORAGE_SERVICE);
  readonly #translateService = inject(TranslateService);

  readonly #batches = signal<TicketBatchLink[]>([]);
  readonly #hasOpenedTickets = signal(false);
  readonly #isLoading = signal(false);
  readonly #link = signal<DownloadQrTicketLink>({ data: '', onsiteSetupId: null, partnerId: null });
  readonly #order = signal<OpenedTicketsOrder | null>(null);

  readonly batches = this.#batches.asReadonly();
  readonly hasOpenedTickets = this.#hasOpenedTickets.asReadonly();
  readonly isLoading = this.#isLoading.asReadonly();

  init(link: DownloadQrTicketLink): void {
    this.#link.set(link);
    // Opening navigates the tab away, so Back rebuilds the page unless bfcache keeps it.
    const saved: OpenedTicketsState | null = this.#storage.get<OpenedTicketsState>(openedTicketsStorageKey(link));
    this.#batches.set(saved?.batches ?? []);
    this.#hasOpenedTickets.set(saved?.hasOpenedTickets ?? false);
    this.#order.set(saved?.order ?? null);
    if (link.partnerId !== null) {
      this.#fzTracking.track(openDownloadTicketPage({ partnerIdentifier: link.partnerId }));
    }
  }

  openTickets(): Observable<void> {
    const link: DownloadQrTicketLink = this.#link();
    const partnerId: number | null = link.partnerId;
    if (partnerId === null || link.data.length === 0) {
      this.#openErrorModal(genericErrorMessageKey);
      return EMPTY;
    }

    this.#isLoading.set(true);
    return this.#openOrderService.getOrder(partnerId, link.data).pipe(
      catchError((error: BaseErrorResponse) => {
        this.#trackOpenTickets(partnerId, null, false);
        this.#openErrorModal(error.code === encodedOrderNotFoundErrorCode ? orderNotFoundMessageKey : genericErrorMessageKey);
        return EMPTY;
      }),
      tap((response: BaseResponse<Order>) => {
        this.#handleOrder(partnerId, link, response.data);
      }),
      map((): void => undefined),
      finalize(() => {
        this.#isLoading.set(false);
      }),
    );
  }

  trackBatchOpen(batch: TicketBatchLink): void {
    const link: DownloadQrTicketLink = this.#link();
    const order: OpenedTicketsOrder | null = this.#order();
    if (link.partnerId === null) {
      return;
    }
    this.#trackOpenTickets(link.partnerId, order, true);
    this.#trackPrintRequest(link.partnerId, link.onsiteSetupId, order?.id ?? null, batch.to - batch.from + 1);
  }

  #buildBatchLinks(partnerId: number, link: DownloadQrTicketLink, batches: string[][]): TicketBatchLink[] {
    return batches.map((codeIds: string[], index: number) => {
      const from: number = batches.slice(0, index).reduce((count: number, batch: string[]) => count + batch.length, 0) + 1;
      const to: number = from + codeIds.length - 1;
      return {
        from,
        label: this.#translateService.instant('downloadTicket.batchLabel', { from, to }),
        to,
        url: buildEncodedOrderTicketPdfUrl({ codeIds, data: link.data, onsiteSetupId: link.onsiteSetupId, partnerId }),
      };
    });
  }

  #handleOrder(partnerId: number, link: DownloadQrTicketLink, order: Order | null): void {
    if (order === null) {
      this.#trackOpenTickets(partnerId, null, false);
      this.#openErrorModal(genericErrorMessageKey);
      return;
    }

    const codeIds: string[] = [...(order.accessTickets?.keys() ?? [])];
    const batches: string[][] = chunkCodeIds(codeIds);
    const openedOrder: OpenedTicketsOrder = { id: order.id ?? null, planId: order.planId ?? null };
    this.#order.set(openedOrder);

    if (batches.length > 1) {
      // Nothing opens until a batch link is tapped, so the open is tracked there.
      const batchLinks: TicketBatchLink[] = this.#buildBatchLinks(partnerId, link, batches);
      this.#batches.set(batchLinks);
      this.#storage.set<OpenedTicketsState>(openedTicketsStorageKey(link), {
        batches: batchLinks,
        hasOpenedTickets: false,
        order: openedOrder,
      });
      return;
    }

    this.#trackOpenTickets(partnerId, openedOrder, true);
    this.#trackPrintRequest(partnerId, link.onsiteSetupId, openedOrder.id, codeIds.length);
    this.#hasOpenedTickets.set(true);
    this.#storage.set<OpenedTicketsState>(openedTicketsStorageKey(link), { batches: [], hasOpenedTickets: true });
    this.#document.defaultView?.location.assign(
      buildEncodedOrderTicketPdfUrl({ codeIds: [], data: link.data, onsiteSetupId: link.onsiteSetupId, partnerId }),
    );
  }

  #openErrorModal(messageKey: string): void {
    this.#dialogService.openMessageModal(this.#translateService.instant('common.errorTitle'), this.#translateService.instant(messageKey));
  }

  #trackOpenTickets(partnerId: number, order: OpenedTicketsOrder | null, isSuccess: boolean): void {
    this.#fzTracking.track(
      clickDownloadTicketPdf({
        orderId: order?.id ?? null,
        partnerIdentifier: partnerId,
        planId: order?.planId ?? null,
        successDownloadingPdf: isSuccess,
      }),
    );
  }

  #trackPrintRequest(partnerId: number, onsiteSetupId: string | null, orderId: number | null, codeCount: number): void {
    if (environment.datadog.rum.enabled === false) {
      return;
    }
    datadogRum.addAction('print_request', {
      code_count: codeCount,
      document_type: 'ticket',
      entry_point: 'public_qr_download',
      method: 'open',
      onsite_setup_id: onsiteSetupId,
      order_id: orderId,
      partner_id: partnerId,
      pipeline: 'new_pipeline',
      printer_type: 'browser_pdf',
    });
  }
}

function openedTicketsStorageKey(link: DownloadQrTicketLink): string {
  return `downloadQrTicket.opened.${link.partnerId ?? ''}.${link.onsiteSetupId ?? ''}.${link.data}`;
}

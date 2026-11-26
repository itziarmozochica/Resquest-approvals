import { HttpClient, HttpContext, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import {
  PrintableObject,
  PrintCommand,
  printCommandBackendLocales,
  printCommandDefaultLocale,
} from '@fz-original/app/app/services/print-v2/models/print-command.model';
import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { OnsiteSetupsStorageService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';
import { SKIP_FORBIDDEN_TOAST } from '@fz-original/app/shared/interceptors/skip-forbidden-toast.token';
import { Order } from '@fz-original/app/shared/models/order/order.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { PrintImagesPrinterSettings } from '@fz-original/app/shared/services/webview-messenger/models/print-images-message.model';
import { TranslateService } from '@ngx-translate/core';
import { catchError, defer, firstValueFrom, from, map, Observable, switchMap, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PrintDocumentRenderError } from './errors/print-document-render.error';
import { HtmlRenderResult } from './models/html-render-result.model';
import { PngRenderResult } from './models/png-render-result.model';
import { RenderedPrintDocumentDTO, RenderedPrintDocumentsApiResponseBody } from './models/ticket-html.dto';
import {
  RenderedPrintDocumentImageDTO,
  RenderedPrintDocumentImagesApiResponseBody,
  RenderedPrintDocumentPrinterSettingsDTO,
  RenderedPrintDocumentZebraPrinterSettingsDTO,
} from './models/ticket-png.dto';
import { TicketHtmlRasterizerService } from './ticket-html-rasterizer.service';

interface RenderedDocuments {
  documents: string[];
  requestDurationMs: number;
  sharedStyles: string;
  templateLayoutName: string;
}

interface RenderedDocumentsRequest {
  codeIds: string[];
  hidePrice: boolean;
  onsiteSetupId: string | undefined;
  order: Order;
  orderId: number;
  partnerId: number;
  unifyTickets: boolean;
  locale?: string;
}

interface RenderRequestLog {
  errorMessage: string;
  logMessage: string;
  order: Order;
  renderPath: string;
  startedAt: number;
  unifyTickets: boolean;
}

interface ApiErrorEnvelope {
  error: { code: string };
}

function isApiErrorEnvelope(body: unknown): body is ApiErrorEnvelope {
  if (body === null || typeof body !== 'object' || !('error' in body)) {
    return false;
  }
  const { error }: { error: unknown } = body;

  return error !== null && typeof error === 'object' && 'code' in error && typeof error.code === 'string';
}

@Injectable({
  providedIn: 'root',
})
export class PrintDocumentRendererService {
  static readonly browserPdfPrinterType = 'browser_pdf';
  static readonly documentType = 'ticket';
  static readonly pdfOutputFormat = 'pdf';
  static readonly pngOutputFormat = 'png';
  static readonly zebraPrinterType = 'zebra';

  readonly #datadogLogService = inject(DatadogLogService);
  readonly #http = inject(HttpClient);
  readonly #partnerService = inject(PartnerService);
  readonly #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  readonly #rasterizer = inject(TicketHtmlRasterizerService);
  readonly #translateService = inject(TranslateService);
  readonly #dataUrlCache = new Map<string, string>();

  async getBase64Tickets(
    order: Order,
    shouldRotate: boolean = true,
    isUnifiedTicket: boolean = false,
    isHidePriceEnabled: boolean = false,
    signal?: AbortSignal,
  ): Promise<HtmlRenderResult> {
    const ids = this.#resolveIds(order);
    const request: RenderedDocumentsRequest = {
      ...ids,
      codeIds: isUnifiedTicket ? [] : Array.from(order.accessTickets?.keys() ?? []),
      hidePrice: isHidePriceEnabled,
      order,
      unifyTickets: isUnifiedTicket,
    };

    return this.#renderBase64Tickets(request, shouldRotate, signal);
  }

  getPdf$(command: PrintCommand, printable: PrintableObject): Observable<Blob> {
    return defer(() => {
      const { context } = command;
      const orderId: number | undefined = printable.order.id;
      if (orderId === undefined) {
        return throwError(
          () => new PrintDocumentRenderError('Missing order identifier for rendered print documents request', 'config_error'),
        );
      }

      const { params, url } = this.#buildRequest(
        context.partnerId,
        context.onsiteSetupId,
        orderId,
        printable.codeIds,
        printable.unifyTickets,
        printable.hidePrice,
        PrintDocumentRendererService.browserPdfPrinterType,
        PrintDocumentRendererService.pdfOutputFormat,
        context.locale,
      );
      const startedAt: number = performance.now();

      return this.#http.get(url, { context: this.#renderRequestContext(), params, responseType: 'blob' }).pipe(
        catchError((error: unknown) =>
          this.#onRenderRequestFailed(error, {
            errorMessage: 'Rendered print document pdf request failed',
            logMessage: '[Printer][BrowserPdf] Rendered print document pdf request failed',
            order: printable.order,
            renderPath: 'backend_pdf',
            startedAt,
            unifyTickets: printable.unifyTickets,
          }),
        ),
        map((pdf: Blob) => this.#toRenderedPdf(pdf, printable.order, printable.unifyTickets, printable.codeIds.length, startedAt)),
      );
    });
  }

  getPngs$(command: PrintCommand, printable: PrintableObject): Observable<PngRenderResult> {
    return defer(() => {
      const { context } = command;
      const orderId: number | undefined = printable.order.id;
      if (orderId === undefined) {
        return throwError(
          () => new PrintDocumentRenderError('Missing order identifier for rendered print documents request', 'config_error'),
        );
      }

      const { params, url } = this.#buildRequest(
        context.partnerId,
        context.onsiteSetupId,
        orderId,
        printable.codeIds,
        printable.unifyTickets,
        printable.hidePrice,
        PrintDocumentRendererService.zebraPrinterType,
        PrintDocumentRendererService.pngOutputFormat,
        context.locale,
      );
      const startedAt: number = performance.now();

      return this.#http.get<RenderedPrintDocumentImagesApiResponseBody>(url, { context: this.#renderRequestContext(), params }).pipe(
        catchError((error: unknown) =>
          this.#onRenderRequestFailed(error, {
            errorMessage: 'Rendered print document pngs request failed',
            logMessage: '[Printer][DualScreen] Rendered print document pngs request failed',
            order: printable.order,
            renderPath: 'backend_png',
            startedAt,
            unifyTickets: printable.unifyTickets,
          }),
        ),
        map((body: RenderedPrintDocumentImagesApiResponseBody) =>
          this.#toRenderedPngs(body, printable.order, printable.unifyTickets, printable.codeIds.length, startedAt),
        ),
      );
    });
  }

  async #renderBase64Tickets(request: RenderedDocumentsRequest, shouldRotate: boolean, signal?: AbortSignal): Promise<HtmlRenderResult> {
    const { order } = request;
    const { documents, requestDurationMs, sharedStyles, templateLayoutName } = await this.#fetchRenderedDocuments(request);
    const htmlDocuments: string[] = await this.#inlineRemoteImages(documents, order);
    const rasterizeStartedAt: number = performance.now();
    const base64Images: string[] = [];
    const documentDurationsMs: number[] = [];
    for (const html of htmlDocuments) {
      if (signal?.aborted) {
        break;
      }
      const documentStartedAt: number = performance.now();
      base64Images.push(await this.#rasterize(html, shouldRotate, sharedStyles));
      documentDurationsMs.push(performance.now() - documentStartedAt);
    }

    return {
      base64Images,
      documentCount: documents.length,
      rasterizeDurationMs: Math.round(performance.now() - rasterizeStartedAt),
      requestDurationMs,
      slowestDocumentMs: documentDurationsMs.length > 0 ? Math.round(Math.max(...documentDurationsMs)) : 0,
      templateLayoutName,
    };
  }

  #resolveIds(order: Order): { onsiteSetupId: string | undefined; orderId: number; partnerId: number } {
    const partnerId: number | undefined = this.#partnerService.getPartner()?.id;
    const onsiteSetupId: string | undefined = this.#onsiteSetupsStorageService.getConfiguration()?.id;
    const orderId: number | undefined = order.id;
    if (partnerId === undefined || orderId === undefined) {
      throw new PrintDocumentRenderError('Missing partner or order identifier for rendered print documents request', 'config_error');
    }

    return { onsiteSetupId, orderId, partnerId };
  }

  #renderRequestContext(): HttpContext {
    return new HttpContext().set(SKIP_FORBIDDEN_TOAST, true);
  }

  #buildRequest(
    partnerId: number,
    onsiteSetupId: string | undefined,
    orderId: number,
    requestedCodeIds: string[],
    isUnifiedTicket: boolean,
    isHidePriceEnabled: boolean,
    printerType: string,
    outputFormat?: string,
    locale?: string,
  ): { params: HttpParams; url: string } {
    const url = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/orders/${orderId}/rendered-print-documents`;
    let params = new HttpParams()
      .set('document_type', PrintDocumentRendererService.documentType)
      .set('printer_type', printerType)
      .set('unify_tickets', isUnifiedTicket.toString())
      .set('locale', locale ?? printCommandBackendLocales[this.#translateService.currentLang] ?? printCommandDefaultLocale);
    // One comma-separated param instead of one per code: a repeated `code_ids` pushes large orders past the gateway's URL limit.
    if (requestedCodeIds.length > 0) {
      params = params.set('code_ids_csv', requestedCodeIds.join(','));
    }
    if (onsiteSetupId !== undefined) {
      params = params.set('onsite_setup_id', onsiteSetupId);
    }
    if (outputFormat !== undefined) {
      params = params.set('output_format', outputFormat);
    }
    // Sent only when enabled: absence means false on the backend, keeping the contract free of a default param.
    return { params: isHidePriceEnabled ? params.set('hide_price', 'true') : params, url };
  }

  #onRenderRequestFailed(error: unknown, log: RenderRequestLog): Observable<never> {
    const status: number | undefined = error instanceof HttpErrorResponse ? error.status : undefined;

    return from(this.#readApiCode(error)).pipe(
      switchMap((apiCode: string | undefined) => {
        this.#datadogLogService.logError(log.logMessage, {
          apiCode,
          orderId: log.order.id,
          planId: log.order.planId,
          renderPath: log.renderPath,
          requestDurationMs: Math.round(performance.now() - log.startedAt),
          status,
          unifyTickets: log.unifyTickets,
        });

        return throwError(() => new PrintDocumentRenderError(log.errorMessage, 'http_error', status, apiCode));
      }),
    );
  }

  async #readApiCode(error: unknown): Promise<string | undefined> {
    if (!(error instanceof HttpErrorResponse)) {
      return undefined;
    }

    try {
      const body: unknown = error.error instanceof Blob ? JSON.parse(await this.#readBlobAsText(error.error)) : error.error;

      return isApiErrorEnvelope(body) ? body.error.code : undefined;
    } catch {
      return undefined;
    }
  }

  #readBlobAsText(blob: Blob): Promise<string> {
    return new Promise<string>((resolve: (value: string) => void, reject: (reason: unknown) => void) => {
      const reader: FileReader = new FileReader();
      reader.onload = (): void => resolve(String(reader.result));
      reader.onerror = (): void => reject(reader.error);
      reader.readAsText(blob);
    });
  }

  #toPrinterSettings(dto: RenderedPrintDocumentPrinterSettingsDTO | null | undefined): PrintImagesPrinterSettings | undefined {
    const zebra: RenderedPrintDocumentZebraPrinterSettingsDTO | undefined = dto?.zebra;
    if (zebra === undefined) {
      return undefined;
    }

    return { backfeedBeforeCut: zebra.backfeed_before_cut, markOffsetDots: zebra.mark_offset_dots };
  }

  #toRenderedPdf(pdf: Blob, order: Order, isUnifiedTicket: boolean, requestedCodeIdCount: number, startedAt: number): Blob {
    this.#datadogLogService.logInfo('[Printer][BrowserPdf] Rendered print document pdf received', {
      orderId: order.id,
      planId: order.planId,
      renderPath: 'backend_pdf',
      requestDurationMs: Math.round(performance.now() - startedAt),
      requestedCodeIdCount,
      sizeBytes: pdf.size,
      unifyTickets: isUnifiedTicket,
    });

    if (pdf.size === 0) {
      throw new PrintDocumentRenderError('Empty rendered print document pdf response', 'empty_response');
    }

    return pdf;
  }

  #toRenderedPngs(
    body: RenderedPrintDocumentImagesApiResponseBody,
    order: Order,
    isUnifiedTicket: boolean,
    requestedCodeIdCount: number,
    startedAt: number,
  ): PngRenderResult {
    const documents: string[][] = body.data?.documents.map((document: RenderedPrintDocumentImageDTO) => document.pngs) ?? [];
    const printerSettings: PrintImagesPrinterSettings | undefined = this.#toPrinterSettings(body.data?.printer_settings);
    const requestDurationMs: number = Math.round(performance.now() - startedAt);
    this.#datadogLogService.logInfo('[Printer][DualScreen] Rendered print document pngs received', {
      backfeedBeforeCut: printerSettings?.backfeedBeforeCut,
      documentCount: documents.length,
      imageCount: documents.reduce((count: number, pngs: string[]) => count + pngs.length, 0),
      markOffsetDots: printerSettings?.markOffsetDots,
      orderId: order.id,
      planId: order.planId,
      renderPath: 'backend_png',
      requestDurationMs,
      requestedCodeIdCount,
      templateLayoutName: body.data?.template_layout_name,
      unifyTickets: isUnifiedTicket,
    });

    if (body.data === null || documents.length === 0) {
      throw new PrintDocumentRenderError('Empty rendered print document pngs response', 'empty_response');
    }

    return { documents, printerSettings, requestDurationMs, templateLayoutName: body.data.template_layout_name };
  }

  async #fetchRenderedDocuments(request: RenderedDocumentsRequest): Promise<RenderedDocuments> {
    const { codeIds: requestedCodeIds, order, orderId, unifyTickets: isUnifiedTicket } = request;
    const { params, url } = this.#buildRequest(
      request.partnerId,
      request.onsiteSetupId,
      orderId,
      requestedCodeIds,
      isUnifiedTicket,
      request.hidePrice,
      PrintDocumentRendererService.zebraPrinterType,
      undefined,
      request.locale,
    );

    const startedAt: number = performance.now();
    const body: RenderedPrintDocumentsApiResponseBody = await this.#requestRenderedDocuments(
      url,
      params,
      order,
      isUnifiedTicket,
      startedAt,
    );
    const requestDurationMs: number = Math.round(performance.now() - startedAt);

    this.#datadogLogService.logInfo('[Printer][DualScreen] Rendered print documents received', {
      documentCount: body.data?.documents.length ?? 0,
      orderId,
      planId: order.planId,
      renderPath: 'html',
      requestDurationMs,
      requestedCodeIdCount: requestedCodeIds.length,
      templateLayoutName: body.data?.template_layout_name,
      unifyTickets: isUnifiedTicket,
    });

    if (!body.data || body.data.documents.length === 0) {
      throw new PrintDocumentRenderError('Empty rendered print documents response', 'empty_response');
    }

    return {
      documents: body.data.documents.map((document: RenderedPrintDocumentDTO) => document.html),
      requestDurationMs,
      sharedStyles: body.data.shared_styles ?? '',
      templateLayoutName: body.data.template_layout_name,
    };
  }

  async #rasterize(html: string, shouldRotate: boolean, sharedStyles: string): Promise<string> {
    try {
      return await this.#rasterizer.rasterize(html, shouldRotate, sharedStyles);
    } catch (error: unknown) {
      throw new PrintDocumentRenderError(error instanceof Error ? error.message : 'Ticket rasterization failed', 'raster_error');
    }
  }

  async #requestRenderedDocuments(
    url: string,
    params: HttpParams,
    order: Order,
    isUnifiedTicket: boolean,
    startedAt: number,
  ): Promise<RenderedPrintDocumentsApiResponseBody> {
    try {
      return await firstValueFrom(
        this.#http.get<RenderedPrintDocumentsApiResponseBody>(url, { context: this.#renderRequestContext(), params }),
      );
    } catch (error: unknown) {
      const status: number | undefined = error instanceof HttpErrorResponse ? error.status : undefined;
      const apiCode: string | undefined = await this.#readApiCode(error);
      this.#datadogLogService.logError('[Printer][DualScreen] Rendered print documents request failed', {
        apiCode,
        orderId: order.id,
        planId: order.planId,
        renderPath: 'html',
        requestDurationMs: Math.round(performance.now() - startedAt),
        status,
        unifyTickets: isUnifiedTicket,
      });
      throw new PrintDocumentRenderError('Rendered print documents request failed', 'http_error', status, apiCode);
    }
  }

  // Falling back to the original url is deliberate — a missing partner logo must not fail a print — but it
  // means a logo lost to CORS or a 404 vanishes from the printed ticket with nothing else to show for it.
  // This warning is the only signal that happened, so it is per url rather than per print job.
  #logRemoteImageFailure(url: string, order: Order, reason: string): void {
    this.#datadogLogService.logWarn('[Printer][DualScreen] Ticket HTML remote image inline failed', {
      orderId: order.id,
      planId: order.planId,
      reason,
      renderPath: 'html',
      url,
    });
  }

  #getRemoteImageUrls(html: string): string[] {
    return Array.from(html.matchAll(/<img\b[^>]*\bsrc="(https?:\/\/[^"]+)"/gi), (match: RegExpMatchArray) => match[1]);
  }

  // The documents are rasterized one per ticket, each in its own iframe, so a remote image would be
  // fetched once per ticket. Resolving them up front also keeps the rasterizer's cors fetch away from
  // the opaque cache entry that an <img> load leaves behind, which drops the image silently.
  async #inlineRemoteImages(htmlDocuments: string[], order: Order): Promise<string[]> {
    const urls: string[] = Array.from(new Set(htmlDocuments.flatMap((html: string) => this.#getRemoteImageUrls(html))));
    if (urls.length === 0) {
      return htmlDocuments;
    }

    const resolved: [string, string][] = (
      await Promise.all(urls.map(async (url: string): Promise<[string, string | null]> => [url, await this.#toDataUrl(url, order)]))
    )
      .filter((entry: [string, string | null]): entry is [string, string] => entry[1] !== null)
      // Longest first: one url can be a prefix of another (`logo.png` and `logo.png?v=2`), and replacing
      // the shorter one first would leave the tail of the longer one dangling after a data url.
      .sort(([firstUrl]: [string, string], [secondUrl]: [string, string]) => secondUrl.length - firstUrl.length);

    return htmlDocuments.map((html: string) =>
      resolved.reduce((document: string, [url, dataUrl]: [string, string]) => document.split(url).join(dataUrl), html),
    );
  }

  // `cache: 'reload'` keeps the fetch away from the opaque entry an <img> load leaves behind, but it also
  // re-downloads the partner logo on every print job. The service is root-provided, so holding the data
  // url for the session pays that cost once instead of once per print.
  async #toDataUrl(url: string, order: Order): Promise<string | null> {
    const cached: string | undefined = this.#dataUrlCache.get(url);
    if (cached !== undefined) {
      return cached;
    }
    try {
      const response: Response = await fetch(url, { cache: 'reload' });
      if (!response.ok) {
        this.#logRemoteImageFailure(url, order, `HTTP ${response.status}`);
        return null;
      }
      const blob: Blob = await response.blob();
      const dataUrl: string = await new Promise<string>((resolve: (value: string) => void, reject: (reason: unknown) => void) => {
        const reader: FileReader = new FileReader();
        reader.onload = (): void => resolve(String(reader.result));
        reader.onerror = (): void => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      this.#dataUrlCache.set(url, dataUrl);
      return dataUrl;
    } catch (error: unknown) {
      this.#logRemoteImageFailure(url, order, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
}

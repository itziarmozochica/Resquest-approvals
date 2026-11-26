import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { PrintDocumentRenderError } from '@fz-original/app/shared/services/ticket-pdf-generator/errors/print-document-render.error';
import { PngRenderResult } from '@fz-original/app/shared/services/ticket-pdf-generator/models/png-render-result.model';
import { PrintDocumentRendererService } from '@fz-original/app/shared/services/ticket-pdf-generator/print-document-renderer.service';
import { from, map, Observable, switchMap, tap, timeout } from 'rxjs';

import { PrintableImagesRepresentation, PrintRepresentationType } from '../print-adapter/models/print-adapter.model';
import { PrintRenderer } from '../print-renderer/print.renderer';
import { PrintableObject, PrintCommand } from '../print-v2/models/print-command.model';
import { rotatePngDataUrl180, toPngDataUrl } from '../print-zebra/utils/zebra-png-image.util';

interface ZebraImages {
  base64Images: string[];
  rotateDurationMs: number;
}

@Injectable({
  providedIn: 'root',
})
export class ZebraPrintRenderer implements PrintRenderer {
  static readonly renderTimeoutMs = 60_000;

  readonly #datadogLogService = inject(DatadogLogService);
  readonly #printDocumentRendererService = inject(PrintDocumentRendererService);

  render$(command: PrintCommand, printable: PrintableObject): Observable<PrintableImagesRepresentation> {
    return this.#printDocumentRendererService.getPngs$(command, printable).pipe(
      tap((result: PngRenderResult) => this.#assertEveryTicketWasRendered(result.documents, printable)),
      switchMap((result: PngRenderResult) =>
        from(this.#toImages(result.documents, printable.shouldRotate)).pipe(
          tap((images: ZebraImages) => this.#logRenderSucceeded(command, result, images, printable)),
          map(
            (images: ZebraImages): PrintableImagesRepresentation => ({
              base64Images: images.base64Images,
              printerSettings: result.printerSettings,
              type: PrintRepresentationType.images,
            }),
          ),
        ),
      ),
      timeout(ZebraPrintRenderer.renderTimeoutMs),
    );
  }

  #assertEveryTicketWasRendered(documents: string[][], printable: PrintableObject): void {
    const ticketCount: number = printable.order.accessTickets?.size ?? 0;
    const expectedDocuments: number = printable.unifyTickets ? Math.min(ticketCount, 1) : ticketCount;
    if (documents.length !== expectedDocuments) {
      throw new PrintDocumentRenderError(
        `Rendered documents do not match the tickets to print (${documents.length} documents for ${expectedDocuments} tickets)`,
        'count_mismatch',
      );
    }
    const overflowingDocuments: number = documents.filter((pngs: string[]) => pngs.length !== 1).length;
    if (overflowingDocuments > 0) {
      throw new PrintDocumentRenderError(
        `Rendered documents do not fit a single label (${overflowingDocuments} of ${documents.length} documents)`,
        'page_overflow',
      );
    }
  }

  #logRenderSucceeded(command: PrintCommand, result: PngRenderResult, images: ZebraImages, printable: PrintableObject): void {
    this.#datadogLogService.logInfo('[Printer][DualScreen] Ticket PNG render succeeded', {
      deviceHardwareType: command.context.deviceHardwareType,
      documentCount: result.documents.length,
      imageCount: images.base64Images.length,
      orderId: printable.order.id,
      planId: printable.order.planId,
      renderPath: 'backend_png',
      requestDurationMs: result.requestDurationMs,
      rotateDurationMs: images.rotateDurationMs,
      shouldRotate: printable.shouldRotate,
      templateLayoutName: result.templateLayoutName,
      unifyTickets: printable.unifyTickets,
    });
  }

  async #toImages(documents: string[][], shouldRotate: boolean): Promise<ZebraImages> {
    const startedAt: number = performance.now();
    const dataUrls: string[] = documents.flat().map((base64: string) => toPngDataUrl(base64));
    const base64Images: string[] = shouldRotate
      ? await Promise.all(dataUrls.map((dataUrl: string) => rotatePngDataUrl180(dataUrl)))
      : dataUrls;

    return { base64Images, rotateDurationMs: Math.round(performance.now() - startedAt) };
  }
}

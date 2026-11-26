import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { QrGeneratorService } from '@fz-original/app/shared/services/qr-generator/qr-generator.service';
import { TicketFontFace } from '@fz-original/app/shared/services/ticket-fonts/models/ticket-font.model';
import { TicketFontsService } from '@fz-original/app/shared/services/ticket-fonts/ticket-fonts.service';

@Injectable({
  providedIn: 'root',
})
export class TicketHtmlRasterizerService {
  // 102 mm at 203 DPI, matching the Zebra output width used by the pdfmake path (PdfGeneratorService).
  static readonly targetWidthPx = Math.round((102 * 203) / 25.4);

  readonly #qrGenerator = inject(QrGeneratorService);
  readonly #ticketFonts = inject(TicketFontsService);
  readonly #datadogLogService = inject(DatadogLogService);

  async rasterize(html: string, shouldRotate: boolean, sharedStyles: string = ''): Promise<string> {
    const fontFaceCss: string = await this.#ticketFonts.getFontFaceCss();
    const iframe: HTMLIFrameElement = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    // Backend-rendered HTML: no allow-scripts, so nothing in the document can execute, while
    // allow-same-origin keeps contentDocument readable. Mirrors the ticket preview iframe.
    iframe.setAttribute('sandbox', 'allow-same-origin');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    try {
      const doc: Document = await this.#writeIframeDocument(iframe, html);
      if (sharedStyles !== '') {
        doc.head.insertAdjacentHTML('afterbegin', sharedStyles);
      }
      if (fontFaceCss !== '') {
        doc.head.insertAdjacentHTML('afterbegin', `<style>${fontFaceCss}</style>`);
      }
      await this.#loadTicketFont(doc);
      await doc.fonts?.ready;

      // The template declares the ticket box on `html` (fixed size + overflow: hidden), so that element
      // is the authoritative capture area. A default iframe viewport is 300x150, which would lay the
      // document out in the wrong box, so grow the iframe to the declared size before measuring again.
      const target: HTMLElement = doc.documentElement;
      const { height: declaredHeight, width: declaredWidth } = target.getBoundingClientRect();
      iframe.style.width = `${declaredWidth}px`;
      iframe.style.height = `${declaredHeight}px`;

      const naturalWidth: number = Math.round(target.getBoundingClientRect().width);
      const naturalHeight: number = Math.round(target.getBoundingClientRect().height);
      const scale: number = naturalWidth > 0 ? TicketHtmlRasterizerService.targetWidthPx / naturalWidth : 1;

      await this.#renderQrCodes(doc, scale);
      await this.#waitForImages(doc);

      const { domToCanvas } = await import('modern-screenshot');
      const canvas: HTMLCanvasElement = await domToCanvas(target, {
        backgroundColor: '#ffffff',
        height: naturalHeight,
        scale,
        width: naturalWidth,
      });

      const finalCanvas: HTMLCanvasElement = shouldRotate ? this.#rotateCanvas(canvas) : canvas;
      return finalCanvas.toDataURL('image/jpeg', 0.8);
    } finally {
      iframe.remove();
    }
  }

  // The faces are written into a document that has already loaded, so its `fonts.ready` may be
  // fulfilled and would not cover them, and a face only starts loading once layout asks for it.
  // Requesting each face explicitly closes that race: nothing below measures a fallback metric.
  // It doubles as the guard, which `fonts.check()` cannot be — check() answers true for a family
  // that is missing entirely, since an empty match set has nothing pending to wait for. An empty
  // `load()` result, in contrast, means no face matched and the ticket is about to rasterise in a
  // fallback face: still prints, at the wrong metrics against the template's fixed height, which
  // is how the whole document silently ends up truncated.
  async #loadTicketFont(doc: Document): Promise<void> {
    if (doc.fonts === undefined) {
      return;
    }
    const requests: Promise<FontFace[]>[] = TicketFontsService.faces.map((face: TicketFontFace) =>
      doc.fonts.load(`${face.weight} 16px '${TicketFontsService.family}'`).catch((): FontFace[] => []),
    );
    const matches: FontFace[][] = await Promise.all(requests);
    const unresolvedWeights: number[] = TicketFontsService.faces
      .filter((_face: TicketFontFace, index: number) => matches[index].length === 0)
      .map((face: TicketFontFace) => face.weight);
    if (unresolvedWeights.length === 0) {
      return;
    }
    this.#datadogLogService.logWarn('[Printer][DualScreen] Ticket font was not applied to the render document', {
      family: TicketFontsService.family,
      unresolvedWeights: unresolvedWeights.join(','),
    });
  }

  async #renderQrCodes(doc: Document, scale: number): Promise<void> {
    const placeholders: HTMLElement[] = Array.from(doc.querySelectorAll<HTMLElement>('[data-qr-code]'));
    await Promise.all(
      placeholders.map(async (placeholder: HTMLElement) => {
        const code: string | undefined = placeholder.dataset['qrCode'];
        if (!code) {
          return;
        }
        const cssWidth: number = placeholder.getBoundingClientRect().width;
        const devicePixels: number = Math.round(cssWidth * scale);
        const dataUrl: string = await this.#qrGenerator.generateQr(code, devicePixels > 0 ? { width: devicePixels } : undefined);
        const img: HTMLImageElement = doc.createElement('img');
        img.className = placeholder.className;
        const style: string | null = placeholder.getAttribute('style');
        if (style) {
          img.setAttribute('style', style);
        }
        img.src = dataUrl;
        placeholder.replaceWith(img);
      }),
    );
  }

  #rotateCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const tempCanvas: HTMLCanvasElement = document.createElement('canvas');
    const tempContext: CanvasRenderingContext2D | null = tempCanvas.getContext('2d');
    if (!tempContext) {
      throw new Error('Could not get temporary canvas context');
    }
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempContext.translate(canvas.width, canvas.height);
    tempContext.rotate(Math.PI);
    tempContext.drawImage(canvas, 0, 0);
    return tempCanvas;
  }

  #waitForImages(doc: Document): Promise<void> {
    const images: HTMLImageElement[] = Array.from(doc.querySelectorAll('img'));
    return Promise.all(
      images.map(
        (img: HTMLImageElement) =>
          new Promise<void>((resolve: () => void) => {
            if (img.complete) {
              resolve();
              return;
            }
            img.onload = (): void => resolve();
            img.onerror = (): void => resolve();
          }),
      ),
    ).then((): undefined => undefined);
  }

  #writeIframeDocument(iframe: HTMLIFrameElement, html: string): Promise<Document> {
    return new Promise<Document>((resolve, reject) => {
      iframe.onload = (): void => {
        const doc: Document | null = iframe.contentDocument;
        if (doc) {
          resolve(doc);
        } else {
          reject(new Error('Could not access ticket iframe document'));
        }
      };
      iframe.srcdoc = html;
    });
  }
}

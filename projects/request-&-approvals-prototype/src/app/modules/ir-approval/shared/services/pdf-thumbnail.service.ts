import { Injectable } from '@angular/core';

import { pdfjsWorkerSrc } from '@fz-original/app/shared/services/pdf-generator/pdfjs-worker.util';
import type { PDFDocumentProxy } from 'pdfjs-dist';

const MAX_PREVIEWABLE_BYTES = 20 * 1024 * 1024;

@Injectable({ providedIn: 'root' })
export class PdfThumbnailService {
  async render(file: File, widthPx: number): Promise<string | null> {
    if (file.size > MAX_PREVIEWABLE_BYTES) {
      return null;
    }

    let pdf: PDFDocumentProxy | null = null;
    try {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc(pdfjsLib.version);
      pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      const page = await pdf.getPage(1);
      const scale = widthPx / page.getViewport({ scale: 1 }).width;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const canvasContext = canvas.getContext('2d');
      if (!canvasContext) {
        return null;
      }
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext, viewport }).promise;
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    } finally {
      await pdf?.destroy().catch((): undefined => undefined);
    }
  }
}

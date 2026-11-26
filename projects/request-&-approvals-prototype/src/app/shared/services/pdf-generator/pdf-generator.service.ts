import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

// eslint-disable-next-line fz/no-ngbootstrap, fz/no-ngbootstrap-modal -- matches existing SpinnerModalComponent usage pattern in PrinterDualScreenService
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import type { PageViewport, PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { Observable, Subject } from 'rxjs';

import { DatadogLogService } from '../../../core/error/datadog/logger/datadog-log.service';
import { SpinnerModalComponent } from '../../components/spinner-modal/spinner-modal.component';
import { JsonObject } from '../../models/json-object';
import { FeatureFlags } from '../../optimizely/feature-flags';
import { OptimizelyService } from '../../optimizely/optimizely.service';
import { ErrorWithContext } from '../error-logger/error-with-context';
import { PdfContent } from './models/content/pdf-content';
import { LibraryLoader } from './models/pdf-library-loader.class';
import { pdfjsWorkerSrc } from './pdfjs-worker.util';

// pdfmake fetches a font face whose value is an absolute http(s) URL (`URLBrowserResolver`) and
// reads every other value from its virtual file system, so only the latter need `vfs_fonts.js`.
const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;
const ORIGIN_PATTERN = /^https?:\/\/[^/]+/i;

type PdfDocumentInstance = {
  download(filename: string, callback: () => void): void;
  getBlob(callback: (blob: Blob) => void): void;
  open(): void;
  print(): void;
};

type PdfCreateModule = {
  createPdf(document: JsonObject | null, tableLayouts?: unknown, fonts?: JsonObject, vfs?: Record<string, unknown>): PdfDocumentInstance;
};

type PdfMakeModule = {
  pdfMake: {
    vfs: Record<string, unknown>;
  };
};

type PdfLibrary = {
  createPdf: PdfCreateModule;
  pdfMake: PdfMakeModule;
};

@Injectable({
  providedIn: 'root',
})
export abstract class PdfGeneratorService {
  private static createPdf: PdfCreateModule | null = null;
  private static pdfMake: PdfMakeModule | null = null;
  private static loadPdfLibraryModalRef: NgbModalRef | null = null;
  private static loadPdfLibraryRequestCount = 0;
  readonly #document = inject(DOCUMENT);
  readonly #modalService = inject(NgbModal);
  readonly #datadogLogService = inject(DatadogLogService);
  protected readonly optimizelyService = inject(OptimizelyService);
  readonly #translateService = inject(TranslateService);

  protected document: JsonObject | null = null;
  protected content: JsonObject[] = [];
  protected styles: JsonObject = {};
  protected fonts: JsonObject = {};

  protected abstract initializeDocument(): void;

  protected constructor() {
    this.initializeFonts();
    this.initializeDocument();
  }

  // Hook for subclasses to transform the document right before it is handed to pdfmake
  // (e.g. bidi reordering for RTL content). Defaults to the document as-is.
  protected getRenderableDocument(): JsonObject | null {
    return this.document;
  }

  private initializeFonts(): void {
    this.fonts = {
      ArialUnicode: {
        normal: 'Arial-Unicode-Regular.ttf',
        bold: 'Arial-Unicode-Regular.ttf',
        italics: 'Arial-Unicode-Regular.ttf',
        bolditalics: 'Arial-Unicode-Regular.ttf',
      },
      // Served from the app's own origin (see angular.json `src/assets`) instead of a
      // third-party CDN. Onsite devices on restricted/venue networks were failing to reach
      // jsdelivr, which broke ticket PDF generation ("Failed to fetch (url: .../montserrat...)").
      // Kept outside `assets/pdf-fonts` on purpose: that folder is the pdfmake VFS source and
      // `build-vfs.js` (generate-pdf-fonts) cannot handle subdirectories there.
      // Absolute URLs are required: pdfmake's URLBrowserResolver only fetches values starting with
      // `http(s)://`. Relative paths (`/assets/...`) are treated as VFS keys and would throw
      // "File '...' not found in virtual file system", hence taking the origin from `document`
      // rather than concatenating one that may not be a string.
      Montserrat: {
        normal: `${this.#assetOrigin()}/assets/fonts/montserrat/latin-400-normal.ttf`,
        bold: `${this.#assetOrigin()}/assets/fonts/montserrat/latin-600-normal.ttf`,
        italics: `${this.#assetOrigin()}/assets/fonts/montserrat/latin-400-italic.ttf`,
        bolditalics: `${this.#assetOrigin()}/assets/fonts/montserrat/latin-600-italic.ttf`,
      },
    };
  }

  // Sliced with a regex rather than `new URL(...)`: this runs in the constructor and specs replace
  // the `URL` global with a `createObjectURL` stub, which drops the constructor. `Document.location`
  // is the fallback rather than `defaultView.location`, which is nullable — the origin must never
  // come out empty, because a relative `/assets/...` value is a VFS key to pdfmake and
  // `#isCachedVfsUsable()` would then ask the VFS for a file no load can supply, re-entering the
  // whole load path on every render.
  #assetOrigin(): string {
    return ORIGIN_PATTERN.exec(this.#document.baseURI)?.[0] ?? this.#document.location.origin;
  }

  addContent(contentAdded: PdfContent<unknown>): void {
    this.content.push(contentAdded.generateContent());
  }

  addPageBreak(): void {
    this.content[this.content.length - 1].pageBreak = 'after';
  }

  async generateBase64Images(shouldRotate: boolean = true): Promise<string[]> {
    const library = await this.#resolvePdfLibrary();
    return new Promise<string[]>((resolve, reject) => {
      try {
        this.#createDocument(library).getBlob((blob: Blob) => resolve(this.#generateBlobBase64Images(blob, shouldRotate)));
      } catch (err) {
        this.#catchRenderError(err);
        reject(err);
      }
    });
  }

  resetDocument(): void {
    this.document = null;
    this.content = [];
    this.initializeDocument();
  }

  download(name: string): Observable<void> {
    const printed = new Subject<void>();

    this.#resolvePdfLibrary().then(
      library => {
        try {
          this.#createDocument(library).download(`${name}.pdf`, () => {
            printed.next();
            printed.complete();
          });
        } catch (err) {
          this.#catchRenderError(err);
          printed.error(err);
        }
      },
      err => {
        this.catchLibraryError(err);
        printed.error(err);
      },
    );

    return printed.asObservable();
  }

  open(): void {
    this.#resolvePdfLibrary().then(
      library => {
        try {
          this.#createDocument(library).open();
        } catch (err) {
          this.#catchRenderError(err);
        }
      },
      err => {
        this.catchLibraryError(err);
      },
    );
  }

  openPrintScreen(): void {
    this.#resolvePdfLibrary().then(
      library => {
        try {
          this.#createDocument(library).print();
        } catch (err) {
          this.#catchRenderError(err);
        }
      },
      err => {
        this.catchLibraryError(err);
      },
    );
  }

  truncateText(text: string, maxCharacters: number): string {
    if (text.length > maxCharacters) {
      return text.substring(0, maxCharacters) + '...';
    }
    return text;
  }

  protected getRasterRotation(): 0 | 90 | 180 | 270 {
    return 180;
  }

  protected getRasterWidthMm(): number {
    return 102;
  }

  async #generateBlobBase64Images(pdfBlob: Blob, shouldRotate: boolean = true): Promise<string[]> {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc(pdfjsLib.version);
    const pdfData: ArrayBuffer = await pdfBlob.arrayBuffer();
    const loadingTask: PDFDocumentLoadingTask = pdfjsLib.getDocument({ data: pdfData });
    try {
      const pdf: PDFDocumentProxy = await loadingTask.promise;
      const numPages: number = pdf.numPages;
      const base64Array: string[] = [];
      const widthInMm = this.getRasterWidthMm();
      const dpi = 203;
      const mmPerInch = 25.4;
      const width: number = Math.round((widthInMm * dpi) / mmPerInch);
      for (let i = 1; i <= numPages; i++) {
        const page: PDFPageProxy = await pdf.getPage(i);
        const originalViewport: PageViewport = page.getViewport({ scale: 1 });
        const scale = width / originalViewport.width;
        const viewport: PageViewport = page.getViewport({ scale });
        const canvas: HTMLCanvasElement = this.#document.createElement('canvas');
        const context: CanvasRenderingContext2D | null = canvas.getContext('2d');
        if (!context) {
          throw new Error('Could not get canvas context');
        }
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        const rotatedCanvas: HTMLCanvasElement = shouldRotate ? this.#rotateCanvas(canvas, this.getRasterRotation()) : canvas;
        const base64: string = rotatedCanvas.toDataURL('image/jpeg', 0.8);
        base64Array.push(base64);
      }
      return base64Array;
    } finally {
      void loadingTask.destroy().catch((): undefined => undefined);
    }
  }

  // Name pdfmake will resolve as the document default font for the next render.
  protected getDocumentFontName(): string | null {
    const defaultStyle = this.document?.['defaultStyle'] as { font?: string } | undefined;
    return defaultStyle?.font ?? null;
  }

  protected usesVfsFonts(): boolean {
    const requiredFiles = this.#getRequiredVfsFontFiles();
    return requiredFiles === null || requiredFiles.length > 0;
  }

  async loadPdfLibrary(silent: boolean = false): Promise<void> {
    await this.#resolvePdfLibrary(silent);
  }

  // Returns the modules this render must use. The statics are a cache shared by every generator and
  // any concurrent `loadPdfLibrary()` may overwrite them across an await — including the unawaited
  // dual-screen preload in `app.component.ts` — so a render that holds its own reference cannot be
  // handed a VFS that does not satisfy it.
  async #resolvePdfLibrary(silent: boolean = false): Promise<PdfLibrary> {
    if (this.isPdfLibraryCached() && this.#isCachedVfsUsable()) {
      return this.#requireLoadedPdfLibrary();
    }

    try {
      if (!silent) {
        this.#openPdfLoadingModal();
      }

      const useAssets =
        this.optimizelyService.isFeatureEnabled({
          optimizelyFeatureKey: FeatureFlags.PDFMAKE_LOAD_FROM_ASSETS,
          team: 'b2b-onsite',
        }) === true;

      const skipVfs = !this.usesVfsFonts();
      const useAssetsStrategy = useAssets || skipVfs;
      const [createPdfESM, pdfMakeESM] = await LibraryLoader.load(useAssetsStrategy, skipVfs).catch(async (primaryError: unknown) => {
        if (!useAssetsStrategy) {
          throw primaryError;
        }

        this.#datadogLogService.logWarn('PDF assets load failed, using local bundled pdfmake fallback', {
          useAssets,
          useAssetsStrategy,
          skipVfs,
          primaryError: this.#getErrorContext(primaryError),
        });

        try {
          return await LibraryLoader.load(false, false);
        } catch (fallbackError: unknown) {
          this.#datadogLogService.logError('PDF library load failed for assets and local bundle', {
            useAssets,
            useAssetsStrategy,
            skipVfs,
            fallbackError: this.#getErrorContext(fallbackError),
            primaryError: this.#getErrorContext(primaryError),
          });

          throw new ErrorWithContext('Failed to load PDF library from assets and local bundle', {
            fallbackError: this.#getErrorContext(fallbackError),
            primaryError: this.#getErrorContext(primaryError),
          });
        }
      });
      const library: PdfLibrary = {
        createPdf: createPdfESM.default as PdfCreateModule,
        pdfMake: pdfMakeESM.default as PdfMakeModule,
      };
      PdfGeneratorService.createPdf = library.createPdf;
      PdfGeneratorService.pdfMake = library.pdfMake;
      return library;
    } finally {
      if (!silent) {
        this.#closePdfLoadingModal();
      }
    }
  }

  isPdfLibraryCached(): boolean {
    return !!PdfGeneratorService.createPdf && !!PdfGeneratorService.pdfMake;
  }

  // Files the next render must read from the virtual file system, or `null` when the document
  // declares a font this service does not know. `vfs_fonts.js` is built from `src/assets/pdf-fonts`
  // (see the `generate-pdf-fonts` script) and holds only `Arial-Unicode-Regular.ttf`, so pdfmake's
  // bundled default is not in there either: an unknown font cannot be served whatever we load, and
  // `#assertFontsResolvable()` is what actually rejects it.
  #getRequiredVfsFontFiles(): string[] | null {
    const fontName = this.getDocumentFontName();
    const faces = fontName === null ? undefined : (this.fonts[fontName] as Record<string, string> | undefined);
    if (!faces) {
      return null;
    }
    // Deduplicated: the four faces of ArialUnicode are the same file, and this feeds both the cache
    // check and the Datadog context.
    return [...new Set(Object.values(faces).filter(file => !ABSOLUTE_URL_PATTERN.test(file)))];
  }

  // The loaded pdfmake module and its VFS are shared by every generator, so a VFS-less load done
  // for one render would starve a later render that does need the VFS: pdfmake binds an empty file
  // system and throws "File 'Arial-Unicode-Regular.ttf' not found in virtual file system".
  #isCachedVfsUsable(): boolean {
    const vfs = PdfGeneratorService.pdfMake?.pdfMake.vfs ?? {};
    const requiredFiles = this.#getRequiredVfsFontFiles();
    if (requiredFiles === null) {
      // No load can serve an unknown font, so demanding one would re-enter the load path on every
      // render. Accept any populated VFS here and let `#assertFontsResolvable()` reject the render.
      return Object.keys(vfs).length > 0;
    }
    return requiredFiles.every(file => file in vfs);
  }

  private catchLibraryError(err: unknown): void {
    PdfGeneratorService.createPdf = null;
    PdfGeneratorService.pdfMake = null;
    this.#datadogLogService.logError('Cannot load the pdf library', {
      error: this.#getErrorContext(err),
    });
    console.error(err);
    console.error('Cannot load the pdf library');
  }

  #getErrorContext(error: unknown): JsonObject {
    if (!(error instanceof Error)) {
      return {
        error: String(error),
      };
    }
    return {
      message: error.message,
      name: error.name,
      ...(error.stack ? { stack: error.stack } : {}),
    };
  }

  // pdfmake resolves fonts inside `urlResolver.resolved().then(...)` and its `download` / `open` /
  // `print` take no error callback, so a font it cannot resolve escapes every try/catch around the
  // render and reaches the user as a no-op: the caller waits forever and the only trace is an
  // unhandled rejection in Sentry. Refuse to hand over a document whose fonts are already known to
  // be unresolvable, so that class of failure stays inside a path we can log and surface.
  #createDocument({ createPdf, pdfMake }: PdfLibrary): PdfDocumentInstance {
    const vfs = pdfMake.pdfMake.vfs;
    this.#assertFontsResolvable(vfs);
    return createPdf.createPdf(this.getRenderableDocument(), undefined, this.fonts, vfs);
  }

  #assertFontsResolvable(vfs: Record<string, unknown>): void {
    const fontName = this.getDocumentFontName();
    if (fontName !== null && !this.fonts[fontName]) {
      throw new ErrorWithContext(`PDF document asks for font '${fontName}', which is not declared`, {
        declaredFonts: Object.keys(this.fonts),
        fontName,
      });
    }

    const missingFiles = (this.#getRequiredVfsFontFiles() ?? []).filter(file => !(file in vfs));
    if (missingFiles.length > 0) {
      throw new ErrorWithContext(`PDF font files for '${fontName}' are missing from the virtual file system`, {
        fontName,
        missingFiles,
        vfsFileCount: Object.keys(vfs).length,
      });
    }
  }

  // Distinct from `catchLibraryError`: the library loaded fine, so the static cache stays put and
  // the log does not claim otherwise.
  #catchRenderError(error: unknown): void {
    this.#datadogLogService.logError('Cannot render the pdf document', {
      error: this.#getErrorContext(error),
      fontName: this.getDocumentFontName(),
    });
    console.error(error);
  }

  #requireLoadedPdfLibrary(): PdfLibrary {
    const { createPdf, pdfMake } = PdfGeneratorService;
    if (!createPdf || !pdfMake) {
      throw new Error('PDF library is not loaded');
    }
    return { createPdf, pdfMake };
  }

  #openPdfLoadingModal(): void {
    PdfGeneratorService.loadPdfLibraryRequestCount += 1;
    if (PdfGeneratorService.loadPdfLibraryModalRef) {
      return;
    }
    PdfGeneratorService.loadPdfLibraryModalRef = this.#modalService.open(SpinnerModalComponent, {
      backdrop: 'static',
      keyboard: false,
    });
    PdfGeneratorService.loadPdfLibraryModalRef.componentInstance.message = this.#translateService.instant('common.loading');
  }

  #closePdfLoadingModal(): void {
    PdfGeneratorService.loadPdfLibraryRequestCount = Math.max(PdfGeneratorService.loadPdfLibraryRequestCount - 1, 0);
    if (PdfGeneratorService.loadPdfLibraryRequestCount !== 0) {
      return;
    }
    PdfGeneratorService.loadPdfLibraryModalRef?.close();
    PdfGeneratorService.loadPdfLibraryModalRef = null;
  }

  #rotateCanvas(canvas: HTMLCanvasElement, degrees: 0 | 90 | 180 | 270 = 180): HTMLCanvasElement {
    if (degrees === 0) {
      return canvas;
    }
    const tempCanvas: HTMLCanvasElement = this.#document.createElement('canvas');
    const tempContext: CanvasRenderingContext2D | null = tempCanvas.getContext('2d');
    if (!tempContext) {
      throw new Error('Could not get temporary canvas context');
    }
    const swapsAxes: boolean = degrees === 90 || degrees === 270;
    tempCanvas.width = swapsAxes ? canvas.height : canvas.width;
    tempCanvas.height = swapsAxes ? canvas.width : canvas.height;
    if (degrees === 90) {
      tempContext.translate(tempCanvas.width, 0);
    } else if (degrees === 180) {
      tempContext.translate(tempCanvas.width, tempCanvas.height);
    } else {
      tempContext.translate(0, tempCanvas.height);
    }
    tempContext.rotate((degrees * Math.PI) / 180);
    tempContext.drawImage(canvas, 0, 0);
    return tempCanvas;
  }
}

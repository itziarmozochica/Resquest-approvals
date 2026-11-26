type PdfMakeWindow = Window & {
  pdfMake?: {
    createPdf?: unknown;
    vfs?: Record<string, unknown>;
  };
};

type PdfModules = [{ default: unknown }, { default: unknown }];
type LoadStrategy = 'assets' | 'assets-no-vfs' | 'local';

export class LibraryLoader {
  static readonly #pdfMakeAssetUrl = '/assets/pdfmake/pdfmake.min.js';
  static readonly #vfsFontsAssetUrl = '/assets/pdfmake/vfs_fonts.js';
  static #loadPromises: Record<LoadStrategy, Promise<PdfModules> | null> = {
    assets: null,
    'assets-no-vfs': null,
    local: null,
  };

  static load(useAssets: boolean, skipVfs: boolean = false): Promise<PdfModules> {
    const strategy: LoadStrategy = useAssets ? (skipVfs ? 'assets-no-vfs' : 'assets') : 'local';
    const cachedPromise = this.#loadPromises[strategy];
    if (cachedPromise) {
      return cachedPromise;
    }

    const loadPromise = this.#loadForStrategy(strategy);
    this.#loadPromises[strategy] = loadPromise.catch((error: unknown) => {
      this.#loadPromises[strategy] = null;
      throw error;
    });

    return this.#loadPromises[strategy]!;
  }

  static #loadForStrategy(strategy: LoadStrategy): Promise<PdfModules> {
    switch (strategy) {
      case 'assets-no-vfs':
        return this.#loadFromAssetsWithoutVfs();
      case 'assets':
        return this.#loadFromAssets();
      case 'local':
        return this.#loadFromLocal();
    }
  }

  static #getPdfMakeFromWindow(): { createPdf: unknown; vfs: Record<string, unknown> } {
    const pdfMake = (window as PdfMakeWindow).pdfMake;
    if (!pdfMake?.createPdf || !pdfMake.vfs) {
      throw new Error('pdfmake asset scripts loaded but pdfMake global is incomplete');
    }
    return { createPdf: pdfMake.createPdf, vfs: pdfMake.vfs };
  }

  static #getPdfMakeFromWindowWithoutVfs(): { createPdf: unknown; vfs: Record<string, unknown> } {
    const pdfMake = (window as PdfMakeWindow).pdfMake;
    if (!pdfMake?.createPdf) {
      throw new Error('pdfmake asset script loaded but pdfMake.createPdf is missing');
    }
    return { createPdf: pdfMake.createPdf, vfs: {} };
  }

  static #isScriptAlreadyLoaded(src: string): boolean {
    const scripts = Array.from(document.querySelectorAll('script'));
    return scripts.some(script => script.src.endsWith(src));
  }

  static async #loadFromAssets(): Promise<PdfModules> {
    await this.#loadScript(this.#pdfMakeAssetUrl);
    await this.#loadScript(this.#vfsFontsAssetUrl);

    const pdfMake = this.#getPdfMakeFromWindow();
    return [{ default: pdfMake }, { default: { pdfMake } }];
  }

  static async #loadFromAssetsWithoutVfs(): Promise<PdfModules> {
    await this.#loadScript(this.#pdfMakeAssetUrl);

    const pdfMake = this.#getPdfMakeFromWindowWithoutVfs();
    return [{ default: pdfMake }, { default: { pdfMake } }];
  }

  static #loadFromLocal(): Promise<PdfModules> {
    return Promise.all([import('pdfmake/build/pdfmake.min'), import('pdfmake/build/vfs_fonts')]) as Promise<PdfModules>;
  }

  static #loadScript(src: string): Promise<void> {
    if (this.#isScriptAlreadyLoaded(src)) {
      this.#removeScriptBySrc(src);
    }

    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.async = true;
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => {
        this.#removeScriptBySrc(src);
        reject(new Error(`Failed to load script: ${src}`));
      };
      document.head.append(script);
    });
  }

  static #removeScriptBySrc(src: string): void {
    const scripts = Array.from(document.querySelectorAll('script'));
    scripts.filter(script => script.src.endsWith(src)).forEach(script => script.remove());
  }
}

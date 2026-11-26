import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';

import { TicketFontFace } from './models/ticket-font.model';

@Injectable({
  providedIn: 'root',
})
export class TicketFontsService {
  // The one name the templates reference, so the template stays a single opaque slot with no font
  // asset or brand name in it.
  static readonly family = 'TicketFont';

  // Latin only for now — this path assumes a latin-script partner. Adding another script is adding
  // an entry here; the template never changes.
  static readonly faces: TicketFontFace[] = [
    { url: 'assets/fonts/montserrat/latin-400-normal.ttf', weight: 400 },
    { url: 'assets/fonts/montserrat/latin-600-normal.ttf', weight: 600 },
  ];

  static readonly formatsByExtension: Record<string, string> = {
    otf: 'opentype',
    ttf: 'truetype',
    woff: 'woff',
    woff2: 'woff2',
  };

  readonly #datadogLogService = inject(DatadogLogService);
  readonly #dataUrlCache = new Map<string, string | null>();

  // `@font-face` is per document, so the faces have to be written into every iframe that renders a
  // ticket. Returns css rather than a style element so the caller decides how to inject it.
  async getFontFaceCss(): Promise<string> {
    const rules: (string | null)[] = await Promise.all(TicketFontsService.faces.map((face: TicketFontFace) => this.#toFontFaceRule(face)));
    return rules.filter((rule: string | null): rule is string => rule !== null).join('\n');
  }

  async #fetchAsDataUrl(url: string): Promise<string | null> {
    try {
      const response: Response = await fetch(url);
      if (!response.ok) {
        return null;
      }
      const blob: Blob = await response.blob();
      return await new Promise<string>((resolve: (value: string) => void, reject: (reason: unknown) => void) => {
        const reader: FileReader = new FileReader();
        reader.onload = (): void => resolve(String(reader.result));
        reader.onerror = (): void => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  // Fetched once per session and held as a data url: the faces are inlined into one iframe per ticket,
  // so a url would be re-resolved for every ticket of the order, and a cors font fetch is exactly the
  // step that fails silently behind a venue proxy. Failures are cached too, to avoid retrying per ticket.
  async #toDataUrl(url: string): Promise<string | null> {
    const cached: string | null | undefined = this.#dataUrlCache.get(url);
    if (cached !== undefined) {
      return cached;
    }
    const dataUrl: string | null = await this.#fetchAsDataUrl(url);
    this.#dataUrlCache.set(url, dataUrl);
    return dataUrl;
  }

  async #toFontFaceRule(face: TicketFontFace): Promise<string | null> {
    const dataUrl: string | null = await this.#toDataUrl(face.url);
    if (dataUrl === null) {
      this.#datadogLogService.logWarn('[TicketFonts] Ticket font face could not be loaded', {
        url: face.url,
        weight: face.weight,
      });
      return null;
    }
    const format: string | undefined = TicketFontsService.formatsByExtension[face.url.split('.').pop() ?? ''];
    const source: string = format === undefined ? `url(${dataUrl})` : `url(${dataUrl}) format('${format}')`;
    return `@font-face{font-family:'${TicketFontsService.family}';font-style:normal;font-weight:${face.weight};font-display:block;src:${source}}`;
  }
}

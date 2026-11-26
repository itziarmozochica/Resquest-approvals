import { inject, Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import type sanitize from 'sanitize-html';
import sanitizeHtml from 'sanitize-html';

@Injectable({
  providedIn: 'root',
})
export class SanitizeService {
  static readonly sanitizerOptions: sanitize.IOptions = {
    ...sanitizeHtml.defaults,
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
    allowedSchemesByTag: {
      ...sanitizeHtml.defaults.allowedSchemesByTag,
      img: ['http', 'https', 'data'],
    },
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(
      'img',
      'video',
      'center',
      'style',
      'input',
      'label',
      'source',
      'details',
      'summary',
      'svg',
      'path',
      'polygon',
      'rect',
      'circle',
      'ellipse',
      'line',
      'polyline',
    ),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['data-*', 'style', 'dir', 'class'],
      label: ['for', 'style'],
      input: ['type', 'name', 'id', 'checked', 'value', 'style'],
      style: ['type'],
      video: ['poster', 'controls', 'autoplay', 'loop', 'muted', 'src', 'width', 'height'],
      source: ['src', 'type'],
      svg: ['viewBox', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'],
      path: ['d', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'],
      polygon: ['points', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'],
      rect: ['x', 'y', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'],
      circle: ['cx', 'cy', 'r', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'],
      ellipse: ['cx', 'cy', 'rx', 'ry', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'],
      line: ['x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'],
      polyline: ['points', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'],
    },
    allowVulnerableTags: true, // This is needed for the style tag. It's not a security risk in modern browsers.
    selfClosing: sanitizeHtml.defaults.selfClosing.concat(['img']),
  };

  #domSanitizer: DomSanitizer = inject(DomSanitizer);

  sanitizeToSafeHtml(content: string | null): SafeHtml | null {
    if (content === null) {
      return null;
    }

    return this.#domSanitizer.bypassSecurityTrustHtml(this.#sanitize(content));
  }

  sanitizeToString(content: string | null): string | null {
    if (content === null) {
      return null;
    }

    return sanitizeHtml(content.toString(), SanitizeService.sanitizerOptions);
  }

  escapeHtml(text: string): string {
    const htmlEscapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char: string) => htmlEscapeMap[char]);
  }

  #sanitize(content: string): string {
    return sanitizeHtml(content, SanitizeService.sanitizerOptions);
  }
}

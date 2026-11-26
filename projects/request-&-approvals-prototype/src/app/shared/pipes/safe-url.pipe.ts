import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/** Resolves relative URLs so they can be classified; absolute URLs keep their own protocol. */
const RELATIVE_URL_BASE = 'https://relative.invalid';

/**
 * A rejected value has to stay a trusted `SafeResourceUrl`: returning `null` reaches
 * `ɵɵsanitizeResourceUrl`, which throws `NG0904` because the optional `Sanitizer` token is not
 * provided in an app, so the value is never sanitized — only checked for a bypass marker. That
 * would turn an unembeddable URL into a crash on every unguarded `iframe[src]` binding instead of
 * an empty frame.
 */
const REJECTED_URL = 'about:blank';

@Pipe({
  name: 'safeUrl',
  standalone: true,
})
export class SafeUrlPipe implements PipeTransform {
  readonly #sanitizer = inject(DomSanitizer);

  transform(url: string | null | undefined): SafeResourceUrl {
    const embeddableUrl = url && this.#isEmbeddableUrl(url) ? url : REJECTED_URL;

    return this.#sanitizer.bypassSecurityTrustResourceUrl(embeddableUrl);
  }

  #isEmbeddableUrl(url: string): boolean {
    try {
      return ALLOWED_PROTOCOLS.includes(new URL(url, RELATIVE_URL_BASE).protocol);
    } catch {
      return false;
    }
  }
}

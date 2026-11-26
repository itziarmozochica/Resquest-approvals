import { computed, Directive, inject, type Signal } from '@angular/core';

import {
  DEFAULT_TABLE_TRANSLATIONS,
  IGNT_TABLE_TRANSLATIONS,
  type IgntTableTranslations,
  type ResolvedIgntTableTranslations,
} from './models';

/**
 * Directive that injects IGNT_TABLE_TRANSLATIONS (multi), merges with defaults (lowest level wins),
 * and exposes the result as the `translations` signal. Apply as host directive on ignt-table so it sees
 * the full provider chain (root + route/feature + parent of table). All literals are reactive.
 */
@Directive({
  selector: '[igntTableTranslations]',
  standalone: true,
})
export class IgntTableTranslationsDirective {
  readonly #injectedTranslations = inject(IGNT_TABLE_TRANSLATIONS, { optional: true });

  /** Resolved table translations (defaults + merged from IGNT_TABLE_TRANSLATIONS). */
  readonly translations: Signal<ResolvedIgntTableTranslations> = computed(() => {
    const raw = this.#injectedTranslations;
    let list: Signal<IgntTableTranslations>[] = [];
    if (Array.isArray(raw)) {
      list = raw;
    } else if (raw) {
      list = [raw];
    }
    const chain: IgntTableTranslations[] = [DEFAULT_TABLE_TRANSLATIONS, ...list.map(sig => sig())];
    return this.#mergeTranslations(chain);
  });

  /** Merges a chain of partials; each element overwrites the previous. First element is the base (e.g. defaults). */
  #mergeTranslations(chain: IgntTableTranslations[]): ResolvedIgntTableTranslations {
    const base = chain.length > 0 ? chain[0] : DEFAULT_TABLE_TRANSLATIONS;
    return chain
      .slice(1)
      .reduce<ResolvedIgntTableTranslations>((acc, partial) => ({ ...acc, ...partial }), { ...base } as ResolvedIgntTableTranslations);
  }
}

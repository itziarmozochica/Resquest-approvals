import { computed, Directive, inject, type Signal } from '@angular/core';

import type { FztDateSelectorTranslations, ResolvedFztDateSelectorTranslations } from '../models/date-selector-translations.model';
import { DEFAULT_FZT_DATE_SELECTOR_TRANSLATIONS, FZT_DATE_SELECTOR_TRANSLATIONS } from './date-selector-translations.token';

@Directive({
  selector: '[fztDateSelectorTranslations]',
  standalone: true,
})
export class FztDateSelectorTranslationsDirective {
  readonly #injectedTranslations = inject(FZT_DATE_SELECTOR_TRANSLATIONS, { optional: true });

  readonly translations: Signal<ResolvedFztDateSelectorTranslations> = computed(() => {
    const chain: FztDateSelectorTranslations[] = [
      DEFAULT_FZT_DATE_SELECTOR_TRANSLATIONS,
      ...this.#injectedProviders().map(provided => provided()),
    ];

    return this.#mergeTranslations(chain);
  });

  #injectedProviders(): Signal<FztDateSelectorTranslations>[] {
    const raw = this.#injectedTranslations;

    if (Array.isArray(raw)) {
      return raw;
    }

    return raw ? [raw] : [];
  }

  #mergeTranslations(chain: FztDateSelectorTranslations[]): ResolvedFztDateSelectorTranslations {
    return chain.reduce<ResolvedFztDateSelectorTranslations>((accumulator, partial) => ({ ...accumulator, ...partial }), {
      ...DEFAULT_FZT_DATE_SELECTOR_TRANSLATIONS,
    });
  }
}

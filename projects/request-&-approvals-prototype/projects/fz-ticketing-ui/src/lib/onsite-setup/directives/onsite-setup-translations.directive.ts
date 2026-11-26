import { computed, Directive, inject, type Signal } from '@angular/core';

import type { FztOnsiteSetupTranslations, ResolvedFztOnsiteSetupTranslations } from '../models/onsite-setup-translations.model';
import { DEFAULT_FZT_ONSITE_SETUP_TRANSLATIONS, FZT_ONSITE_SETUP_TRANSLATIONS } from './onsite-setup-translations.token';

@Directive({
  selector: '[fztOnsiteSetupTranslations]',
})
export class FztOnsiteSetupTranslationsDirective {
  readonly #injectedTranslations = inject(FZT_ONSITE_SETUP_TRANSLATIONS, { optional: true });

  readonly translations: Signal<ResolvedFztOnsiteSetupTranslations> = computed(() => {
    const chain: FztOnsiteSetupTranslations[] = [
      DEFAULT_FZT_ONSITE_SETUP_TRANSLATIONS,
      ...this.#injectedProviders().map(provided => provided()),
    ];

    return this.#mergeTranslations(chain);
  });

  #injectedProviders(): Signal<FztOnsiteSetupTranslations>[] {
    const raw = this.#injectedTranslations;

    if (Array.isArray(raw)) {
      return raw;
    }

    return raw ? [raw] : [];
  }

  #mergeTranslations(chain: FztOnsiteSetupTranslations[]): ResolvedFztOnsiteSetupTranslations {
    return chain.reduce<ResolvedFztOnsiteSetupTranslations>((accumulator, partial) => ({ ...accumulator, ...partial }), {
      ...DEFAULT_FZT_ONSITE_SETUP_TRANSLATIONS,
    });
  }
}

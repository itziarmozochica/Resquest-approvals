import { computed, Directive, inject, type Signal } from '@angular/core';

import type { FztTicketSelectorTranslations, ResolvedFztTicketSelectorTranslations } from '../models/ticket-selector-translations.model';
import { DEFAULT_FZT_TICKET_SELECTOR_TRANSLATIONS, FZT_TICKET_SELECTOR_TRANSLATIONS } from './ticket-selector-translations.token';

@Directive({
  selector: '[fztTicketSelectorTranslations]',
  standalone: true,
})
export class FztTicketSelectorTranslationsDirective {
  readonly #injectedTranslations = inject(FZT_TICKET_SELECTOR_TRANSLATIONS, { optional: true });

  readonly translations: Signal<ResolvedFztTicketSelectorTranslations> = computed(() => {
    const chain: FztTicketSelectorTranslations[] = [
      DEFAULT_FZT_TICKET_SELECTOR_TRANSLATIONS,
      ...this.#injectedProviders().map(provided => provided()),
    ];

    return this.#mergeTranslations(chain);
  });

  #injectedProviders(): Signal<FztTicketSelectorTranslations>[] {
    const raw = this.#injectedTranslations;

    if (Array.isArray(raw)) {
      return raw;
    }

    return raw ? [raw] : [];
  }

  #mergeTranslations(chain: FztTicketSelectorTranslations[]): ResolvedFztTicketSelectorTranslations {
    return chain.reduce<ResolvedFztTicketSelectorTranslations>((accumulator, partial) => ({ ...accumulator, ...partial }), {
      ...DEFAULT_FZT_TICKET_SELECTOR_TRANSLATIONS,
    });
  }
}

import { computed, Directive, inject, Type, type Signal } from '@angular/core';

import { DIALOG_DEFAULT_TRANSLATIONS, IGNT_DIALOG_TRANSLATIONS, type IgntDialogTranslations } from '../models/dialog-translations';

@Directive({
  standalone: true,
})
export class IgntDialogTranslationsDirective {
  readonly #injectedTranslations = inject<Signal<Partial<IgntDialogTranslations>>>(IGNT_DIALOG_TRANSLATIONS, { optional: true });

  /** Translations */
  readonly translations: Signal<IgntDialogTranslations> = computed(() => {
    const raw = this.#injectedTranslations;
    let list: Signal<Partial<IgntDialogTranslations>>[] = [];
    if (Array.isArray(raw)) {
      list = raw;
    } else if (raw) {
      list = [raw];
    }
    const chain: Partial<IgntDialogTranslations>[] = [DIALOG_DEFAULT_TRANSLATIONS, ...list.map(sig => sig())];
    return this.#mergeTranslations(chain);
  });

  #mergeTranslations(chain: Partial<IgntDialogTranslations>[]): IgntDialogTranslations {
    const base = chain.length > 0 ? chain[0] : DIALOG_DEFAULT_TRANSLATIONS;
    return chain.slice(1).reduce<IgntDialogTranslations>((acc, partial) => ({ ...acc, ...partial }), { ...base } as IgntDialogTranslations);
  }
}

export function withIgntDialogTranslations(): {
  directive: Type<IgntDialogTranslationsDirective>;
  inputs: string[];
  outputs: string[];
} {
  return {
    directive: IgntDialogTranslationsDirective,
    inputs: [],
    outputs: [],
  };
}

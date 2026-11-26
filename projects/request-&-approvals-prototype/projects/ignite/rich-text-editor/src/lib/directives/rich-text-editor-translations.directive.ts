import { computed, Directive, inject, type Signal } from '@angular/core';

import type { IgntRichTextEditorTranslations, ResolvedIgntRichTextEditorTranslations } from '../models/rich-text-editor-translations.model';
import {
  DEFAULT_IGNT_RICH_TEXT_EDITOR_TRANSLATIONS,
  IGNT_RICH_TEXT_EDITOR_TRANSLATIONS,
} from '../models/tokens/rich-text-editor-translations.token';

@Directive({
  selector: '[igntRichTextEditorTranslations]',
  standalone: true,
})
export class IgntRichTextEditorTranslationsDirective {
  readonly #injectedTranslations = inject(IGNT_RICH_TEXT_EDITOR_TRANSLATIONS, { optional: true });

  readonly translations: Signal<ResolvedIgntRichTextEditorTranslations> = computed(() => {
    const raw = this.#injectedTranslations;
    let list: Signal<IgntRichTextEditorTranslations>[] = [];

    if (Array.isArray(raw)) {
      list = raw;
    } else if (raw) {
      list = [raw];
    }

    const chain: IgntRichTextEditorTranslations[] = [
      DEFAULT_IGNT_RICH_TEXT_EDITOR_TRANSLATIONS,
      ...list.map((signal: Signal<IgntRichTextEditorTranslations>) => signal()),
    ];

    return this.#mergeTranslations(chain);
  });

  #mergeTranslations(chain: IgntRichTextEditorTranslations[]): ResolvedIgntRichTextEditorTranslations {
    const base = chain.length > 0 ? chain[0] : DEFAULT_IGNT_RICH_TEXT_EDITOR_TRANSLATIONS;

    return chain.slice(1).reduce<ResolvedIgntRichTextEditorTranslations>(
      (acc, partial) => ({
        alignmentMenu: { ...acc.alignmentMenu, ...partial.alignmentMenu },
        linkPopover: { ...acc.linkPopover, ...partial.linkPopover },
        toolbar: { ...acc.toolbar, ...partial.toolbar },
      }),
      { ...base } as ResolvedIgntRichTextEditorTranslations,
    );
  }
}

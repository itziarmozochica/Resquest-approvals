import { InjectionToken, type Signal } from '@angular/core';

import type { IgntRichTextEditorTranslations, ResolvedIgntRichTextEditorTranslations } from '../rich-text-editor-translations.model';

export const DEFAULT_IGNT_RICH_TEXT_EDITOR_TRANSLATIONS: ResolvedIgntRichTextEditorTranslations = {
  alignmentMenu: {
    alignCenter: 'Align center',
    alignLeft: 'Align left',
    alignRight: 'Align right',
    menuLabel: 'Alignment options',
  },
  linkPopover: {
    applyButton: 'Apply',
    cancelButton: 'Cancel',
    dialogLabel: 'Insert link',
    invalidUrlError: 'Use a URL that starts with http://, https:// or mailto:',
    openLink: 'Open link',
    removeButton: 'Remove',
    urlPlaceholder: 'https://',
  },
  toolbar: {
    alignment: 'Text alignment',
    bulletList: 'Bullet list',
    clearFormat: 'Clear formatting',
    emoji: 'Insert emoji',
    image: 'Insert image',
    imageAlignCenter: 'Align image center',
    imageAlignLeft: 'Align image left',
    imageAlignRight: 'Align image right',
    imageFullWidth: 'Full width image',
    link: 'Insert link',
    orderedList: 'Ordered list',
    sourceHtml: 'View HTML source',
    strike: 'Strikethrough',
    toolbarLabel: 'Format tools',
    bold: (modifier: string) => `Bold (${modifier}+B)`,
    italic: (modifier: string) => `Italic (${modifier}+I)`,
    underline: (modifier: string) => `Underline (${modifier}+U)`,
  },
};

export const IGNT_RICH_TEXT_EDITOR_TRANSLATIONS = new InjectionToken<Signal<IgntRichTextEditorTranslations>>(
  'IGNT_RICH_TEXT_EDITOR_TRANSLATIONS',
);

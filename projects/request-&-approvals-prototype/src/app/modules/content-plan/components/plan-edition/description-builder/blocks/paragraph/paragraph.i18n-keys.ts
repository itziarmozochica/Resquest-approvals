const KEY_PREFIX = 'planEdition.contentEdition.builder.blocks.paragraph.';

/** Paragraph-only i18n keys (shared ones live in `_shared/shared.i18n-keys.ts`). */
export const PARAGRAPH_I18N = {
  componentLabel: `${KEY_PREFIX}componentLabel`,
  /** Expandable rich-text modal title. */
  editText: `${KEY_PREFIX}editText`,
  textPlaceholder: `${KEY_PREFIX}textPlaceholder`,
} as const;

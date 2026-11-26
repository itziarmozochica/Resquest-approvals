const KEY_PREFIX = 'planEdition.contentEdition.builder.blocks.imageGrid.';

/** Image-grid-only i18n keys (shared ones live in `_shared/shared.i18n-keys.ts`). */
export const IMAGE_GRID_I18N = {
  componentLabel: `${KEY_PREFIX}componentLabel`,
  /** Expandable rich-text modal title for the item body. */
  editBody: `${KEY_PREFIX}editBody`,
  titleField: `${KEY_PREFIX}titleField`,
  titleFieldPlaceholder: `${KEY_PREFIX}titleFieldPlaceholder`,
} as const;

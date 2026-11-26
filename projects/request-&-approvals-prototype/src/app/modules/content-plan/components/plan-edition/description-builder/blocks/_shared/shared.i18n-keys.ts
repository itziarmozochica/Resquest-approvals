// i18n keys shared by MORE THAN ONE block type (single-type keys live in each
// block's `<type>.i18n-keys.ts`). Values exist only in en.json — the other
// locales fall back to English.

const KEY_PREFIX = 'planEdition.contentEdition.builder.blocks.shared.';

export const SHARED_BLOCK_I18N = {
  /** Rich-text body label (image-grid items, tabs panels). */
  body: `${KEY_PREFIX}body`,
  bodyPlaceholder: `${KEY_PREFIX}bodyPlaceholder`,
  /** "Card content" eyebrow (image grid + info card). */
  cardContent: `${KEY_PREFIX}cardContent`,
  /** Interpolated "Card {{index}}" (image grid + info card + translation groups). */
  cardLabel: `${KEY_PREFIX}cardLabel`,
  off: `${KEY_PREFIX}off`,
  on: `${KEY_PREFIX}on`,
  /** Plain text label (title + paragraph). */
  text: `${KEY_PREFIX}text`,
  uploadImage: `${KEY_PREFIX}uploadImage`,
  /** Full-video upload field label (video only). */
  uploadVideo: `${KEY_PREFIX}uploadVideo`,
} as const;

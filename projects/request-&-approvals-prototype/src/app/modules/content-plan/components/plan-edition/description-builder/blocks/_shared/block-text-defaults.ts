// Placeholders that seed a freshly-created block. They are persisted as model
// data (`block.props.*`), not rendered as UI copy, so they reach the schema
// store on save and feed the per-language translation pipeline downstream.
export interface BlockTextDefaults {
  readonly imageGridTitle: string;
  readonly imageGridBody: string;
  readonly infoCardHeading: string;
  readonly infoCardPrice: string;
  readonly infoCardCtaLabel: string;
  readonly infoCardBulletPointsText: string;
  readonly tabLabel: (index: number) => string;
}

/**
 * Production defaults: every text prop starts EMPTY on purpose. The editor
 * surfaces (canvas, properties panel, translations editor) render localised
 * placeholder hints over empty values instead, so freshly-created blocks
 * never persist stub copy into the schema (which previously leaked "Title" /
 * "Tab 1" strings into the published description and the translation
 * pipeline). The pure factories still accept a `BlockTextDefaults` so tests
 * can stamp deterministic values.
 */
export const EMPTY_TEXT_DEFAULTS: BlockTextDefaults = {
  imageGridBody: '',
  imageGridTitle: '',
  infoCardBulletPointsText: '',
  infoCardCtaLabel: '',
  infoCardHeading: '',
  infoCardPrice: '',
  tabLabel: () => '',
};

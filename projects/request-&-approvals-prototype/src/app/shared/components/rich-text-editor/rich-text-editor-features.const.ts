import {
  composeIgntRichTextEditorFeatures,
  IGNT_RICH_TEXT_EDITOR_PRESET_EXTENDED,
  IGNT_RICH_TEXT_EDITOR_PRESET_MINIMAL,
  IGNT_RICH_TEXT_EDITOR_PRESET_STANDARD,
  IgntRichTextEditorFeature,
} from '@ignite/rich-text-editor';

/**
 * Feature sets for the TipTap-based `IgntRichTextEditorComponent`, carried over
 * from the legacy Quill toolbar configs. Alignment keeps strict parity with
 * Quill: only left/center are exposed (Quill never offered right).
 */

/** Inline text only: bold, italic, strike. */
export const RICH_TEXT_EDITOR_INLINE_TEXT_FEATURES: ReadonlySet<IgntRichTextEditorFeature> = IGNT_RICH_TEXT_EDITOR_PRESET_MINIMAL;

/** Bold, italic, strike, link, ordered/bullet lists. */
export const RICH_TEXT_EDITOR_INLINE_LINK_LISTS_FEATURES: ReadonlySet<IgntRichTextEditorFeature> = IGNT_RICH_TEXT_EDITOR_PRESET_STANDARD;

/** Inline link/lists plus left/center alignment. Replaces the memberships toolbar. */
export const RICH_TEXT_EDITOR_INLINE_LINK_LISTS_ALIGN_FEATURES: ReadonlySet<IgntRichTextEditorFeature> = composeIgntRichTextEditorFeatures(
  IGNT_RICH_TEXT_EDITOR_PRESET_STANDARD,
  {
    add: [IgntRichTextEditorFeature.AlignLeft, IgntRichTextEditorFeature.AlignCenter],
  },
);

/** Block-body toolbar: no image upload or resize, since embedded media does not fit the blocks' fixed width. */
export const RICH_TEXT_EDITOR_BLOCK_BODY_FEATURES: ReadonlySet<IgntRichTextEditorFeature> = composeIgntRichTextEditorFeatures(
  IGNT_RICH_TEXT_EDITOR_PRESET_EXTENDED,
  {
    remove: [IgntRichTextEditorFeature.AlignRight, IgntRichTextEditorFeature.Image, IgntRichTextEditorFeature.ImageFullWidth],
  },
);

/** Full plan-content toolbar with image upload/resize. */
export const RICH_TEXT_EDITOR_PLAN_CONTENT_FEATURES: ReadonlySet<IgntRichTextEditorFeature> = composeIgntRichTextEditorFeatures(
  IGNT_RICH_TEXT_EDITOR_PRESET_EXTENDED,
  {
    remove: [IgntRichTextEditorFeature.AlignRight],
  },
);

/**
 * Plan-content toolbar plus the source-HTML toggle, for the `translation-text-field` wrapper
 * and the plan-description editor. Keeps parity with the Quill wrapper's `showSourceToggle`,
 * which was always enabled for its rich-text branch.
 */
export const RICH_TEXT_EDITOR_TRANSLATION_FIELD_FEATURES: ReadonlySet<IgntRichTextEditorFeature> = composeIgntRichTextEditorFeatures(
  RICH_TEXT_EDITOR_PLAN_CONTENT_FEATURES,
  {
    add: [IgntRichTextEditorFeature.SourceHtml],
  },
);

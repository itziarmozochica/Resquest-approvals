// Per-block field contract: the declarative list of a block's editable fields,
// owned by the builder so each block's folder can declare ITS fields without
// the builder depending on the translations feature. Single source of truth
// consumed by the translations editor, the mandatory-field validation and the
// properties panel. The translation-runtime shapes that this contract feeds
// (`DescriptionField`, `DescriptionFieldGroup`, `DescriptionTranslationOverlay`)
// live with the translations feature, in
// `plan-translations-edition/models/description-translation.model.ts`.

/**
 * Widget used to edit a single field, matched to its data type. `'structural'`
 * is a non-textual field edited by a bespoke control in the properties panel
 * (e.g. the spacer slider, the title level selector, the info-card toggle): it
 * is never offered in the translations editor and is "always present" for
 * validation (the control cannot be left empty).
 */
export type DescriptionFieldKind = 'input' | 'textarea' | 'rich-text' | 'image' | 'video' | 'color' | 'structural';

/** Presets and default hex for a color field (mirrors the builder accent picker). */
export interface DescriptionColorConfig {
  readonly defaultHex: string;
  readonly presets: readonly string[];
}

// ── Per-block declarative contract ───────────────────────────────────────────

/**
 * One editable field, declared by the block that owns it. The same descriptor
 * drives translation (build the editor fields, extract/apply the overlay),
 * mandatory validation and the properties panel, so they can never drift apart.
 */
export interface DescriptionFieldSpec {
  /** Props key on the block (root fields) or on the sub-item (item fields). */
  readonly field: string;
  readonly kind: DescriptionFieldKind;
  readonly labelKey: string;
  /** Mandatory fields must be populated before the schema can be published. */
  readonly required: boolean;
  /**
   * Whether the field is offered in the translations editor. Omitted = `true`.
   * Set `false` for content that is not localized (e.g. a structural value);
   * the field is then skipped by the translation adapter but STILL counts for
   * `required`/asterisk/publish validation.
   */
  readonly translatable?: boolean;
  readonly placeholderKey?: string;
  /** Rich-text only: i18n key for the expandable editor modal title. */
  readonly editorLabelKey?: string;
  /** Color only: presets + default hex. */
  readonly color?: DescriptionColorConfig;
  /** Per-item interpolated placeholders, e.g. "Tab {{index}}" (1-based). */
  readonly placeholderParamsForIndex?: (indexOneBased: number) => Readonly<Record<string, unknown>>;
}

/**
 * The block type's field contract: ORDERED field lists (order drives the
 * translations UI). Lists every editable field, including structural ones
 * (`title.level`, `spacer.size`, `infoCard.highlighted`) declared with
 * `kind: 'structural'` + `translatable: false` so they are skipped by the
 * translations editor but still participate in validation. Non-content props
 * (block `id`s, `tabs.activeIndex` session state) are NOT fields and stay out.
 */
export interface DescriptionFieldContract {
  /** Root-level fields read/written on `block.props`. */
  readonly rootFields: readonly DescriptionFieldSpec[];
  /** Dynamic sub-list (cards / tabs / grid items), when the block has one. */
  readonly items?: {
    /** Props key holding the sub-list, e.g. `'cards'`. Items must carry an `id`. */
    readonly propsKey: string;
    /** Sub-group header key ("Card {{index}}" / "Tab {{index}}"). */
    readonly groupLabelKey: string;
    readonly fields: readonly DescriptionFieldSpec[];
  };
}

const KEY_SEPARATOR = '::';

export function rootFieldKey(blockId: string, field: string): string {
  return `${blockId}${KEY_SEPARATOR}${field}`;
}

export function itemFieldKey(blockId: string, itemId: string, field: string): string {
  return `${blockId}${KEY_SEPARATOR}${itemId}${KEY_SEPARATOR}${field}`;
}

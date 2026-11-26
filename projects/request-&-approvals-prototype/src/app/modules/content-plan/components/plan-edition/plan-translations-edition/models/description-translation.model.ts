import type {
  DescriptionColorConfig,
  DescriptionFieldKind,
} from '@fz-original/app/modules/content-plan/components/plan-edition/description-builder/blocks/_shared/field-contract.types';
import { BlockType } from '@fz-original/app/modules/content-plan/components/plan-edition/description-builder/models/block.model';

export type {
  DescriptionColorConfig,
  DescriptionFieldKind,
} from '@fz-original/app/modules/content-plan/components/plan-edition/description-builder/blocks/_shared/field-contract.types';

/**
 * Translation status of a single field for the active language: `verified` by a
 * user, `outdated` once the base value changed, `machine_translated` by AI, and
 * `null` when no row exists yet or the base language is being viewed.
 */
export type DescriptionTranslationStatus = 'outdated' | 'machine_translated' | 'verified' | null;

/**
 * `code` -> status map for the active language. Only carries codes that have a
 * row; an absent code means missing.
 */
export type DescriptionTranslationStatusMap = Readonly<Record<string, 'outdated' | 'machine_translated' | 'verified'>>;

/**
 * A single translatable field: its base-language value plus the current
 * translation, built from the block's field contract.
 */
export interface DescriptionField {
  readonly baseValue: string;
  /**
   * Backend field code, e.g. `b1.text` or `b1.cards.c1.accent_color`; mirrors the
   * stored `code` exactly.
   */
  readonly code: string;
  /** Stable key: `${blockId}::${field}` (root) or `${blockId}::${itemId}::${field}` (sub-item). */
  readonly key: string;
  readonly kind: DescriptionFieldKind;
  readonly labelKey: string;
  readonly required: boolean;
  /** Translation row status for the active language; `null` = no row yet (missing) or base language. */
  readonly status: DescriptionTranslationStatus;
  readonly translatedValue: string;
  /** Color only: presets + default hex for the accent picker. */
  readonly color?: DescriptionColorConfig;
  /** Rich-text only: i18n key for the expandable editor modal title. */
  readonly editorLabelKey?: string;
  /** Input/textarea only: optional placeholder i18n key. */
  readonly placeholderKey?: string;
  /** Interpolation params for `placeholderKey` (e.g. `{ index }` for "Tab {{index}}"). */
  readonly placeholderParams?: Readonly<Record<string, unknown>>;
}

/**
 * A group of fields inside a section: one root group for flat blocks, or one per
 * sub-item (tabs, cards, image grid) with its own label.
 */
export interface DescriptionFieldGroup {
  readonly fields: readonly DescriptionField[];
  readonly groupId: string;
  readonly isRoot: boolean;
  readonly labelKey: string | null;
  readonly labelParams?: Readonly<Record<string, unknown>>;
}

/** In-memory per-language/channel translation overlay: field key -> translated string. */
export type DescriptionTranslationOverlay = Readonly<Record<string, string>>;

/** One section per block, holding its groups and translation progress counts. */
export interface DescriptionSection {
  readonly blockId: string;
  readonly blockType: BlockType;
  readonly groups: readonly DescriptionFieldGroup[];
  /** 0-based position of the block in the schema (rendered as "Block N"). */
  readonly index: number;
  /** `COMPONENT_TYPES[blockType].labelKey` — the human label for the block type. */
  readonly titleLabelKey: string;
  readonly totalCount: number;
  readonly translatedCount: number;
}

/** Emitted when a single field's translation changes. */
export interface DescriptionFieldChange {
  readonly code: string;
  readonly key: string;
  readonly kind: DescriptionFieldKind;
  readonly value: string;
}

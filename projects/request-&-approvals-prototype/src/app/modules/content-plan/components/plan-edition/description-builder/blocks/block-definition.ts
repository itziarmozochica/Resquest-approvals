import type { BlockTypeDtoOf, DtoPropsOf } from '../models/block.dto';
import type { BlockType, PropsOf } from '../models/block.model';
import type { BlockTextDefaults } from './_shared/block-text-defaults';
import type { DescriptionFieldContract } from './_shared/field-contract.types';

/**
 * The per-type contract of a description-builder block.
 *
 * Every block type owns ONE definition (in `blocks/<type>/<type>.definition.ts`)
 * that colocates everything the generic machinery needs to know about it.
 * The generic side (`block-registry.ts`, `block.utils`, `BlockDefaultsFactory`,
 * adapters) only ever dispatches through the registry — adding a new block type
 * means adding a folder + registering its definition, not editing per-type
 * switches. The published HTML is rendered server-side from the structured
 * schema, so block definitions carry no HTML-export hooks.
 *
 * Keep this file free of per-type imports (and of component classes): the
 * imports above are type-only so the unavoidable type-level cycle with
 * `models/block.model.ts` is erased at runtime.
 */
export interface BlockDefinition<K extends BlockType = BlockType> {
  readonly type: K;

  // ── Palette metadata ────────────────────────────────────────────────────
  /** Material Symbols icon shown in the palette, add-menu and section headers. */
  readonly icon: string;
  /** i18n key of the block's display name. */
  readonly labelKey: string;

  // ── Model lifecycle ─────────────────────────────────────────────────────
  /** Props of a freshly-created block of this type. */
  readonly createDefaultProps: (defaults: BlockTextDefaults) => PropsOf<K>;
  /**
   * Regenerates nested item ids when duplicating a block (tabs, grid items,
   * cards each carry their own `id`). Omit when the props have no nested ids —
   * the caller already deep-clones.
   */
  readonly cloneProps?: (props: PropsOf<K>) => PropsOf<K>;

  // ── DTO codec (camelCase domain ↔ snake_case wire) ──────────────────────
  /** Wire discriminator — matches the backend `BlockType` Python enum. */
  readonly dtoType: BlockTypeDtoOf<K>;
  /**
   * Wire props → domain props. Runtime-defensive: missing scalar fields fall
   * back to neutral defaults and missing nested ids are regenerated (the wire
   * payload is an unvalidated JSONField).
   */
  readonly fromDto: (raw: Record<string, unknown>) => PropsOf<K>;
  /** Domain props → wire props. */
  readonly toDto: (props: PropsOf<K>) => DtoPropsOf<K>;

  // ── Field contract ──────────────────────────────────────────────────────
  /**
   * Declarative, ORDERED list of the block's editable fields. Single source of
   * truth consumed by three features: the translations editor (field building,
   * overlay extract/apply — see
   * `plan-translations-edition/utils/description-translation.adapter.ts`),
   * the mandatory-field validation (`blocks/block-validation.util.ts`) and the
   * properties panel (asterisk + missing highlight). Non-translatable fields
   * are marked `translatable: false` so the translations editor skips them
   * while validation still applies.
   */
  readonly fields: DescriptionFieldContract;
}

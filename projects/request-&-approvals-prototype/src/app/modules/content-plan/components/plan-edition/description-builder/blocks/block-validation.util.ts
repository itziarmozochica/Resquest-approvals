import {
  isHtmlMeaningful,
  isTranslationTextPopulated,
} from '@fz-original/app/modules/content-plan/utils/default-translation-field-catalog';

import { Block, BlockType } from '../models/block.model';
import { DescriptionFieldContract, DescriptionFieldKind, DescriptionFieldSpec } from './_shared/field-contract.types';
import { BLOCK_DEFINITIONS } from './block-registry';

/**
 * Mandatory-field validation over the per-block field contracts.
 * Each block declares which of its fields are `required` in
 * `blocks/<type>/<type>.field-contract.ts`; this util walks those
 * declarations generically, so adding a field to a contract automatically
 * makes it part of the publish validation. Non-translatable fields are
 * validated too (the `translatable` flag only affects the translations UI).
 */

export interface MissingMandatoryField {
  readonly blockId: string;
  /** 0-based position of the block in the schema. */
  readonly blockIndex: number;
  /** i18n key of the component label (palette name), for user-facing listings. */
  readonly blockLabelKey: string;
  readonly blockType: BlockType;
  readonly field: string;
  readonly fieldLabelKey: string;
  /** Sub-item context ("Card {{index}}" / "Tab {{index}}"), when the field belongs to one. */
  readonly groupLabelKey?: string;
  readonly itemIndexOneBased?: number;
}

export function isFieldValuePresent(kind: DescriptionFieldKind, value: unknown): boolean {
  // Colors and structural fields (slider/segmented/toggle) are non-empty by
  // construction — the control always holds a value.
  if (kind === 'color' || kind === 'structural') return true;
  const text = typeof value === 'string' ? value : '';
  return kind === 'rich-text' ? isHtmlMeaningful(text) : isTranslationTextPopulated(text);
}

export function isFieldMissing(spec: DescriptionFieldSpec, value: unknown): boolean {
  return spec.required && !isFieldValuePresent(spec.kind, value);
}

/** Locate a field's spec in a contract, searching root fields then item fields. */
export function findFieldSpec(contract: DescriptionFieldContract, field: string): DescriptionFieldSpec | undefined {
  return contract.rootFields.find(spec => spec.field === field) ?? contract.items?.fields.find(spec => spec.field === field);
}

/** Whether a contract declares the given field (root or item) as mandatory. */
export function isContractFieldRequired(contract: DescriptionFieldContract, field: string): boolean {
  return findFieldSpec(contract, field)?.required === true;
}

/**
 * Whether the given field is mandatory and empty on its holder — the block's
 * `props` for root fields, the sub-item (card/tab/grid item) for item fields.
 */
export function isContractFieldMissing(contract: DescriptionFieldContract, holder: object, field: string): boolean {
  const spec = findFieldSpec(contract, field);
  return spec !== undefined && isFieldMissing(spec, (holder as Record<string, unknown>)[field]);
}

export function collectMissingMandatory(blocks: readonly Block[]): MissingMandatoryField[] {
  const missing: MissingMandatoryField[] = [];
  blocks.forEach((block: Block, blockIndex: number) => {
    const definition = BLOCK_DEFINITIONS[block.type];
    const contract = definition.fields;
    const props = block.props as unknown as Record<string, unknown>;

    for (const spec of contract.rootFields) {
      if (isFieldMissing(spec, props[spec.field])) {
        missing.push({
          blockId: block.id,
          blockIndex,
          blockLabelKey: definition.labelKey,
          blockType: block.type,
          field: spec.field,
          fieldLabelKey: spec.labelKey,
        });
      }
    }

    const items = contract.items;
    if (items === undefined) {
      return;
    }
    const list = props[items.propsKey];
    const itemList = Array.isArray(list) ? (list as ReadonlyArray<Record<string, unknown>>) : [];
    itemList.forEach((item: Record<string, unknown>, itemIndex: number) => {
      for (const spec of items.fields) {
        if (isFieldMissing(spec, item[spec.field])) {
          missing.push({
            blockId: block.id,
            blockIndex,
            blockLabelKey: definition.labelKey,
            blockType: block.type,
            field: spec.field,
            fieldLabelKey: spec.labelKey,
            groupLabelKey: items.groupLabelKey,
            itemIndexOneBased: itemIndex + 1,
          });
        }
      }
    });
  });
  return missing;
}

import { buildFieldCode } from '@fz-original/app/modules/content-plan/components/plan-edition/description-builder/blocks/_shared/field-code.util';
import {
  DescriptionFieldContract,
  DescriptionFieldKind,
  DescriptionFieldSpec,
  itemFieldKey,
  rootFieldKey,
} from '@fz-original/app/modules/content-plan/components/plan-edition/description-builder/blocks/_shared/field-contract.types';
import { COMPONENT_TYPES } from '@fz-original/app/modules/content-plan/components/plan-edition/description-builder/blocks/block-palette';
import { BLOCK_DEFINITIONS } from '@fz-original/app/modules/content-plan/components/plan-edition/description-builder/blocks/block-registry';
import { Block } from '@fz-original/app/modules/content-plan/components/plan-edition/description-builder/models/block.model';
import { isHtmlMeaningful } from '@fz-original/app/modules/content-plan/utils/default-translation-field-catalog';
import { DescriptionComponentCounts } from '@fz-original/app/modules/content-plan/utils/default-translation-field-count.util';

import {
  DescriptionField,
  DescriptionFieldGroup,
  DescriptionSection,
  DescriptionTranslationOverlay,
  DescriptionTranslationStatusMap,
} from '../models/description-translation.model';

export function buildDescriptionTranslationSections(
  schema: readonly Block[],
  overlay: DescriptionTranslationOverlay,
  statusByCode: DescriptionTranslationStatusMap = {},
): DescriptionSection[] {
  return schema
    .map((block: Block, index: number) => buildSection(block, index, overlay, statusByCode))
    .filter((section: DescriptionSection) => section.totalCount > 0);
}

export function extractDescriptionTranslationOverlay(schema: readonly Block[]): DescriptionTranslationOverlay {
  const overlay: Record<string, string> = {};
  for (const block of schema) {
    collectBlockOverlay(block, overlay);
  }
  return overlay;
}

export function applyDescriptionTranslationOverlay(schema: readonly Block[], overlay: DescriptionTranslationOverlay): Block[] {
  return schema.map((block: Block) => applyBlockOverlay(block, overlay));
}

export function applyDescriptionTranslationOverlayWithFallback(schema: readonly Block[], overlay: DescriptionTranslationOverlay): Block[] {
  const nonEmptyOverlay: Record<string, string> = {};
  for (const block of schema) {
    collectMeaningfulBlockOverlay(block, overlay, nonEmptyOverlay);
  }
  return applyDescriptionTranslationOverlay(schema, nonEmptyOverlay);
}

/** An empty rich-text paragraph must not count as a translation: the fallback would stop returning the base value. */
function collectMeaningfulBlockOverlay(block: Block, overlay: DescriptionTranslationOverlay, into: Record<string, string>): void {
  const contract = contractOf(block);
  for (const spec of translatableFields(contract.rootFields)) {
    const key = rootFieldKey(block.id, spec.field);
    const value = overlay[key];
    if (value !== undefined && isValuePresent(spec.kind, value)) {
      into[key] = value;
    }
  }
  const items = contract.items;
  if (items !== undefined) {
    const itemSpecs = translatableFields(items.fields);
    for (const item of contractItems(block, contract)) {
      for (const spec of itemSpecs) {
        const key = itemFieldKey(block.id, item.id, spec.field);
        const value = overlay[key];
        if (value !== undefined && isValuePresent(spec.kind, value)) {
          into[key] = value;
        }
      }
    }
  }
}

function buildSection(
  block: Block,
  index: number,
  overlay: DescriptionTranslationOverlay,
  statusByCode: DescriptionTranslationStatusMap,
): DescriptionSection {
  const groups = buildGroups(block, overlay, statusByCode);
  let totalCount = 0;
  let translatedCount = 0;
  for (const group of groups) {
    for (const field of group.fields) {
      if (!descriptionFieldCountsInTotal(field)) {
        continue;
      }
      totalCount++;
      if (isDescriptionFieldTranslated(field)) {
        translatedCount++;
      }
    }
  }
  return {
    blockId: block.id,
    blockType: block.type,
    groups,
    index,
    titleLabelKey: COMPONENT_TYPES[block.type].labelKey,
    totalCount,
    translatedCount,
  };
}

type ContractItem = Record<string, unknown> & { id: string };

function contractOf(block: Block): DescriptionFieldContract {
  return BLOCK_DEFINITIONS[block.type].fields;
}

export function translatableFields(specs: readonly DescriptionFieldSpec[]): readonly DescriptionFieldSpec[] {
  return specs.filter((spec: DescriptionFieldSpec) => spec.translatable !== false);
}

function blockProps(block: Block): Record<string, unknown> {
  return block.props as unknown as Record<string, unknown>;
}

function contractItems(block: Block, contract: DescriptionFieldContract): readonly ContractItem[] {
  if (contract.items === undefined) return [];
  const list = blockProps(block)[contract.items.propsKey];
  return Array.isArray(list) ? (list as ContractItem[]) : [];
}

interface FieldRefs {
  readonly baseValue: string;
  readonly code: string;
  readonly key: string;
}

function rootFieldRefs(block: Block, spec: DescriptionFieldSpec): FieldRefs {
  return {
    baseValue: (blockProps(block)[spec.field] as string) ?? '',
    code: buildFieldCode(block.id, spec.field),
    key: rootFieldKey(block.id, spec.field),
  };
}

function itemFieldRefs(block: Block, propsKey: string, item: ContractItem, spec: DescriptionFieldSpec): FieldRefs {
  return {
    baseValue: (item[spec.field] as string) ?? '',
    code: buildFieldCode(block.id, spec.field, [{ collection: propsKey, itemId: item.id }]),
    key: itemFieldKey(block.id, item.id, spec.field),
  };
}

function buildGroups(
  block: Block,
  overlay: DescriptionTranslationOverlay,
  statusByCode: DescriptionTranslationStatusMap,
): DescriptionFieldGroup[] {
  const contract = contractOf(block);
  const groups: DescriptionFieldGroup[] = [];

  const rootSpecs = translatableFields(contract.rootFields);
  if (rootSpecs.length > 0 || contract.items === undefined) {
    groups.push(
      rootGroup(
        block.id,
        rootSpecs.map(spec => field(spec, rootFieldRefs(block, spec), undefined, overlay, statusByCode)),
      ),
    );
  }

  const items = contract.items;
  if (items !== undefined) {
    const itemSpecs = translatableFields(items.fields);
    contractItems(block, contract).forEach((item, i) => {
      groups.push(
        itemGroup(
          block.id,
          item.id,
          items.groupLabelKey,
          i + 1,
          itemSpecs.map(spec => field(spec, itemFieldRefs(block, items.propsKey, item, spec), i + 1, overlay, statusByCode)),
        ),
      );
    });
  }

  return groups;
}

function collectBlockOverlay(block: Block, overlay: Record<string, string>): void {
  const contract = contractOf(block);
  const props = blockProps(block);
  for (const spec of translatableFields(contract.rootFields)) {
    overlay[rootFieldKey(block.id, spec.field)] = (props[spec.field] as string) ?? '';
  }
  const items = contract.items;
  if (items !== undefined) {
    const itemSpecs = translatableFields(items.fields);
    for (const item of contractItems(block, contract)) {
      for (const spec of itemSpecs) {
        overlay[itemFieldKey(block.id, item.id, spec.field)] = (item[spec.field] as string) ?? '';
      }
    }
  }
}

export function applyBlockOverlay(block: Block, overlay: DescriptionTranslationOverlay): Block {
  const contract = contractOf(block);
  const rootSpecs = translatableFields(contract.rootFields);
  if (rootSpecs.length === 0 && contract.items === undefined) return block;

  const pick = (key: string, fallback: string): string => overlay[key] ?? fallback;
  const nextProps: Record<string, unknown> = { ...blockProps(block) };

  for (const spec of rootSpecs) {
    nextProps[spec.field] = pick(rootFieldKey(block.id, spec.field), (nextProps[spec.field] as string) ?? '');
  }

  const items = contract.items;
  if (items !== undefined) {
    const itemSpecs = translatableFields(items.fields);
    nextProps[items.propsKey] = contractItems(block, contract).map(item => {
      const nextItem: ContractItem = { ...item };
      for (const spec of itemSpecs) {
        nextItem[spec.field] = pick(itemFieldKey(block.id, item.id, spec.field), (nextItem[spec.field] as string) ?? '');
      }
      return nextItem;
    });
  }

  return { ...block, props: nextProps } as unknown as Block;
}

function field(
  spec: DescriptionFieldSpec,
  refs: FieldRefs,
  itemIndexOneBased: number | undefined,
  overlay: DescriptionTranslationOverlay,
  statusByCode: DescriptionTranslationStatusMap,
): DescriptionField {
  const overlayValue = overlay[refs.key];
  const translatedValue = overlayValue !== undefined ? overlayValue : inheritsOriginalWhenEmpty(spec.kind) ? refs.baseValue : '';
  return {
    baseValue: refs.baseValue,
    code: refs.code,
    color: spec.color,
    editorLabelKey: spec.editorLabelKey,
    key: refs.key,
    kind: spec.kind,
    labelKey: spec.labelKey,
    placeholderKey: spec.placeholderKey,
    placeholderParams: itemIndexOneBased === undefined ? undefined : spec.placeholderParamsForIndex?.(itemIndexOneBased),
    required: spec.required,
    status: statusByCode[refs.code] ?? null,
    translatedValue,
  };
}

function rootGroup(blockId: string, fields: DescriptionField[]): DescriptionFieldGroup {
  return { fields, groupId: blockId, isRoot: true, labelKey: null };
}

function itemGroup(
  blockId: string,
  itemId: string,
  labelKey: string,
  indexOneBased: number,
  fields: DescriptionField[],
): DescriptionFieldGroup {
  return { fields, groupId: `${blockId}::${itemId}`, isRoot: false, labelKey, labelParams: { index: indexOneBased } };
}

type CountableFieldShape = Pick<DescriptionField, 'baseValue' | 'kind' | 'required' | 'status' | 'translatedValue'>;

export function isValuePresent(kind: DescriptionFieldKind, value: string): boolean {
  return kind === 'rich-text' ? isHtmlMeaningful(value) : value.trim().length > 0;
}

function hasTranslatedValue(field: Pick<CountableFieldShape, 'kind' | 'translatedValue'>): boolean {
  return isValuePresent(field.kind, field.translatedValue);
}

function inheritsOriginalWhenEmpty(kind: DescriptionFieldKind): boolean {
  return kind === 'image' || kind === 'video' || kind === 'color';
}

export function canValidateDescriptionField(field: Pick<CountableFieldShape, 'kind' | 'translatedValue'>): boolean {
  return inheritsOriginalWhenEmpty(field.kind) || hasTranslatedValue(field);
}

function hasBaseValue(field: Pick<CountableFieldShape, 'baseValue' | 'kind'>): boolean {
  return isValuePresent(field.kind, field.baseValue);
}

export function descriptionFieldCountsInTotal(field: Pick<CountableFieldShape, 'baseValue' | 'kind' | 'required'>): boolean {
  return field.required || hasBaseValue(field);
}

export function countDescriptionComponentSlots(
  baseSchema: readonly Block[],
  overlay: DescriptionTranslationOverlay,
  statusByCode: DescriptionTranslationStatusMap = {},
): DescriptionComponentCounts {
  let total = 0;
  let translated = 0;
  const tally = (spec: DescriptionFieldSpec, refs: FieldRefs): void => {
    const countable: CountableFieldShape = {
      baseValue: refs.baseValue,
      kind: spec.kind,
      required: spec.required,
      status: statusByCode[refs.code] ?? null,
      translatedValue: overlay[refs.key] ?? '',
    };
    if (!descriptionFieldCountsInTotal(countable)) {
      return;
    }
    total++;
    if (isDescriptionFieldTranslated(countable)) {
      translated++;
    }
  };

  for (const block of baseSchema) {
    const contract = contractOf(block);
    for (const spec of translatableFields(contract.rootFields)) {
      tally(spec, rootFieldRefs(block, spec));
    }
    const items = contract.items;
    if (items !== undefined) {
      const itemSpecs = translatableFields(items.fields);
      for (const item of contractItems(block, contract)) {
        for (const spec of itemSpecs) {
          tally(spec, itemFieldRefs(block, items.propsKey, item, spec));
        }
      }
    }
  }

  return { total, translated };
}

export function isDescriptionFieldTranslated(field: Pick<CountableFieldShape, 'kind' | 'status' | 'translatedValue'>): boolean {
  if (field.status === 'verified') {
    return true;
  }
  if (field.status === null) {
    return inheritsOriginalWhenEmpty(field.kind) || hasTranslatedValue(field);
  }
  return false;
}

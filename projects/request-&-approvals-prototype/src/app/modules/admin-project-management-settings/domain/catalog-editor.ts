import { InformationRequestQuestionType } from '@fz-original/app/modules/ir-approval/information-requests/models/information-request-question.model';

import {
  CustomFieldsByTemplate,
  LayoutsByTemplate,
  MergedTemplate,
  OverridesByTemplate,
  ServiceCatalogCustomField,
  TemplateLayout,
  TemplateLayoutSection,
  TemplateQuestion,
  TemplateQuestionOverride,
} from '../models/service-catalog.model';
import { reorderLayoutFieldsToMatch } from './layout-editing';

export const DEFAULT_SECTION = 'General';

export type CatalogRow =
  | { kind: 'builtin'; templateKey: string; question: TemplateQuestion; section: string; order: number }
  | { kind: 'custom'; templateKey: string; field: ServiceCatalogCustomField; section: string; order: number };

export function buildRowsForTemplate(
  templateKey: string,
  merged: MergedTemplate,
  customFields: ServiceCatalogCustomField[],
  overrides: Record<string, TemplateQuestionOverride>,
): CatalogRow[] {
  // The backend merges saved custom fields into `questions` (downgrading composite types it does not
  // know, e.g. STEPPER_REF, to TEXT). Drop those echoes so the authoritative custom field wins and is
  // not rendered twice.
  const customFieldIds = new Set(customFields.map(f => f.id));
  const builtinRows: CatalogRow[] = merged.questions
    .filter(q => !customFieldIds.has(q.id))
    .map((q, idx) => {
      const ov = overrides[q.id];
      const order = ov?.order ?? (idx + 1) * 10;
      return {
        kind: 'builtin' as const,
        templateKey,
        question: q,
        section: (ov?.section ?? q.section ?? DEFAULT_SECTION) || DEFAULT_SECTION,
        order,
      };
    });
  const customRows: CatalogRow[] = customFields.map(f => ({
    kind: 'custom' as const,
    templateKey,
    field: f,
    section: f.section || DEFAULT_SECTION,
    order: f.order ?? 0,
  }));
  return [...builtinRows, ...customRows].sort((a, b) => a.order - b.order);
}

export function uniqueSections(rows: CatalogRow[]): string[] {
  const set = new Set<string>();
  for (const r of rows) set.add(r.section);
  if (!set.size) set.add(DEFAULT_SECTION);
  return [...set];
}

export function rowFieldId(row: CatalogRow): string {
  return row.kind === 'builtin' ? row.question.id : row.field.id;
}

export function rowLabel(row: CatalogRow, overrides: Record<string, TemplateQuestionOverride>): string {
  if (row.kind === 'custom') return row.field.label;
  return overrides[row.question.id]?.label ?? row.question.label;
}

export function rowEnabled(row: CatalogRow, overrides: Record<string, TemplateQuestionOverride>): boolean {
  if (row.kind === 'custom') return true;
  return overrides[row.question.id]?.enabled ?? row.question.enabled;
}

export function rowRequired(row: CatalogRow, overrides: Record<string, TemplateQuestionOverride>): boolean {
  if (row.kind === 'custom') return row.field.required ?? false;
  return overrides[row.question.id]?.required ?? row.question.required;
}

export function rowOptions(row: CatalogRow, overrides: Record<string, TemplateQuestionOverride>): string[] {
  if (row.kind === 'custom') return row.field.options ?? [];
  return overrides[row.question.id]?.options ?? row.question.options ?? [];
}

export const CATALOG_SELECTABLE_TYPES: InformationRequestQuestionType[] = [
  InformationRequestQuestionType.TEXT,
  InformationRequestQuestionType.TEXTAREA,
  InformationRequestQuestionType.RICH_TEXT,
  InformationRequestQuestionType.NUMBER,
  InformationRequestQuestionType.PERCENTAGE,
  InformationRequestQuestionType.EMAIL,
  InformationRequestQuestionType.NAME,
  InformationRequestQuestionType.PHONE,
  InformationRequestQuestionType.WEBSITE,
  InformationRequestQuestionType.DATE,
  InformationRequestQuestionType.TIME,
  InformationRequestQuestionType.DATETIME,
  InformationRequestQuestionType.PICKLIST,
  InformationRequestQuestionType.DROPDOWN,
  InformationRequestQuestionType.MULTIPICKLIST,
  InformationRequestQuestionType.FILE,
  InformationRequestQuestionType.MULTIFILE,
  InformationRequestQuestionType.TICKET_TYPES,
  InformationRequestQuestionType.CATALOG_GRID,
  InformationRequestQuestionType.FAQ,
  InformationRequestQuestionType.VENUE,
  InformationRequestQuestionType.STEPPER_REF,
];

export function rowTypeSupportsOptions(type: InformationRequestQuestionType): boolean {
  return (
    type === InformationRequestQuestionType.PICKLIST ||
    type === InformationRequestQuestionType.DROPDOWN ||
    type === InformationRequestQuestionType.MULTIPICKLIST
  );
}

export function applyOverridePatch(
  overrides: OverridesByTemplate,
  templateKey: string,
  questionId: string,
  patch: Partial<TemplateQuestionOverride>,
): OverridesByTemplate {
  const next = { ...overrides };
  const tk = { ...(next[templateKey] ?? {}) };
  const current = { ...(tk[questionId] ?? {}) };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined) {
      delete (current as Record<string, unknown>)[k];
    } else {
      (current as Record<string, unknown>)[k] = v;
    }
  }
  if (Object.keys(current).length === 0) {
    delete tk[questionId];
  } else {
    tk[questionId] = current;
  }
  if (Object.keys(tk).length === 0) {
    delete next[templateKey];
  } else {
    next[templateKey] = tk;
  }
  return next;
}

export function applyCustomFieldPatch(
  customFields: CustomFieldsByTemplate,
  templateKey: string,
  fieldId: string,
  patch: Partial<ServiceCatalogCustomField>,
): CustomFieldsByTemplate {
  const list = customFields[templateKey] ?? [];
  const idx = list.findIndex(f => f.id === fieldId);
  if (idx < 0) return customFields;
  const nextList = [...list];
  nextList[idx] = { ...nextList[idx], ...patch };
  return { ...customFields, [templateKey]: nextList };
}

export function addCustomField(
  customFields: CustomFieldsByTemplate,
  templateKey: string,
  field: ServiceCatalogCustomField,
): CustomFieldsByTemplate {
  const list = customFields[templateKey] ?? [];
  return { ...customFields, [templateKey]: [...list, field] };
}

export function removeCustomField(customFields: CustomFieldsByTemplate, templateKey: string, fieldId: string): CustomFieldsByTemplate {
  const list = customFields[templateKey] ?? [];
  const filtered = list.filter(f => f.id !== fieldId);
  if (filtered.length === list.length) return customFields;
  const next = { ...customFields };
  if (filtered.length) next[templateKey] = filtered;
  else delete next[templateKey];
  return next;
}

export function reorderRows(rows: CatalogRow[], fromIndex: number, toIndex: number): CatalogRow[] {
  if (fromIndex === toIndex) return rows;
  if (fromIndex < 0 || fromIndex >= rows.length) return rows;
  if (toIndex < 0 || toIndex >= rows.length) return rows;
  const next = [...rows];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function buildLayoutFromRows(rows: CatalogRow[]): TemplateLayout {
  const bySection = new Map<string, string[]>();
  for (const row of rows) {
    const id = rowFieldId(row);
    const list = bySection.get(row.section) ?? [];
    list.push(id);
    bySection.set(row.section, list);
  }
  const sections: TemplateLayoutSection[] = [];
  for (const [title, ids] of bySection.entries()) {
    sections.push({ title, rows: ids.map(id => ({ columns: [[id]] })) });
  }
  return { version: 1, sections };
}

export function commitFlatOrderForTemplate(
  rows: CatalogRow[],
  templateKey: string,
  overrides: OverridesByTemplate,
  customFields: CustomFieldsByTemplate,
  layouts: LayoutsByTemplate,
): { overrides: OverridesByTemplate; customFields: CustomFieldsByTemplate; layouts: LayoutsByTemplate } {
  let nextOverrides = overrides;
  let nextCustomFields = customFields;
  let nextLayouts = layouts;
  const existingLayout = layouts[templateKey];
  if (existingLayout && existingLayout.sections.length) {
    nextLayouts = { ...layouts, [templateKey]: reorderLayoutFieldsToMatch(existingLayout, rows.map(rowFieldId)) };
  }
  rows.forEach((row, idx) => {
    const order = (idx + 1) * 10;
    if (row.kind === 'builtin') {
      const original = row.question;
      const patch: Partial<TemplateQuestionOverride> = { order };
      const desiredSection = row.section || DEFAULT_SECTION;
      if (desiredSection !== (original.section ?? DEFAULT_SECTION)) {
        patch.section = desiredSection;
      } else {
        patch.section = null;
      }
      nextOverrides = applyOverridePatch(nextOverrides, templateKey, original.id, patch);
    } else {
      nextCustomFields = applyCustomFieldPatch(nextCustomFields, templateKey, row.field.id, {
        order,
        section: row.section || DEFAULT_SECTION,
      });
    }
  });
  return {
    overrides: nextOverrides,
    customFields: nextCustomFields,
    layouts: nextLayouts,
  };
}

export function newCustomFieldId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `ccf-${crypto.randomUUID()}`;
  }
  return `ccf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function nextOrderForNewCustomField(rows: CatalogRow[], section: string): number {
  let max = 0;
  for (const r of rows) {
    if (r.section === section) max = Math.max(max, r.order);
  }
  return max + 10;
}

import { CatalogGridColumnSpec } from '../models/service-catalog.model';

/** Column input types allowed inside a catalog grid / ticket / FAQ table. */
export const TABLE_COLUMN_INPUT_TYPES = [
  'text',
  'textarea',
  'number',
  'percentage',
  'date',
  'datetime',
  'time',
  'email',
  'name',
  'phone',
  'website',
  'picklist',
  'dropdown',
] as const;

export type TableColumnInputType = (typeof TABLE_COLUMN_INPUT_TYPES)[number];

/** FAQ / ticket / grid columns store their options in `tableColumnPicklists`. */
export function tableColumnUsesPicklistOptions(type: string | null | undefined): boolean {
  const t = String(type ?? '');
  return t === 'picklist' || t === 'dropdown';
}

export function newGridColumnId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `gc-${crypto.randomUUID()}`;
  }
  return `gc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Sanitises a grid column list: drops id-less columns, clamps strings, validates
 * the type, and guarantees at least one row-placement column exists.
 */
export function normalizeGridColumns(cols: CatalogGridColumnSpec[] | null | undefined): CatalogGridColumnSpec[] {
  const list = Array.isArray(cols) ? cols : [];
  const out: CatalogGridColumnSpec[] = [];
  for (const col of list) {
    if (!col || typeof col !== 'object') continue;
    const id = typeof col.id === 'string' ? col.id.trim().slice(0, 64) : '';
    if (!id) continue;
    const labelRaw = typeof col.label === 'string' ? col.label.trim().slice(0, 200) : '';
    const typeStr = String(col.type ?? 'text');
    const type = (TABLE_COLUMN_INPUT_TYPES as readonly string[]).includes(typeStr) ? typeStr : 'text';
    const placement = col.placement === 'table_header' ? 'table_header' : 'row';
    const helpRaw = typeof col.helpText === 'string' ? col.helpText : '';
    const helpText = helpRaw.trim().slice(0, 500) || undefined;
    out.push({
      id,
      label: labelRaw || id,
      type,
      ...(helpText ? { helpText } : {}),
      defaultRequired: col.defaultRequired === true ? true : undefined,
      requiredLocked: col.requiredLocked === true ? true : undefined,
      ...(placement === 'table_header' ? { placement: 'table_header' as const } : {}),
    });
  }
  if (!out.length) {
    return [{ id: 'col-1', label: 'Column 1', type: 'text', defaultRequired: true }];
  }
  const hasRow = out.some(c => c.placement !== 'table_header');
  if (!hasRow) {
    out[0] = { ...out[0], placement: undefined };
  }
  return out;
}

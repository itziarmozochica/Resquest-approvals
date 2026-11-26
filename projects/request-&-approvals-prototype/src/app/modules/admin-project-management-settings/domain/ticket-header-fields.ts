import { TicketTableHeaderFieldSpec } from '../models/service-catalog.model';
import { TABLE_COLUMN_INPUT_TYPES, tableColumnUsesPicklistOptions } from './grid-columns';

export function newTicketHeaderFieldId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `th-${crypto.randomUUID()}`;
  }
  return `th-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Sanitises ticket-table header fields: drops id-less rows, clamps strings,
 * validates the type, and keeps picklist options/helpers only for picklist types.
 */
export function normalizeTicketHeaderFields(raw: TicketTableHeaderFieldSpec[] | null | undefined): TicketTableHeaderFieldSpec[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: TicketTableHeaderFieldSpec[] = [];
  for (const field of list) {
    if (!field || typeof field !== 'object') continue;
    const id = typeof field.id === 'string' ? field.id.trim().slice(0, 64) : '';
    if (!id) continue;
    const labelRaw = typeof field.label === 'string' ? field.label.trim().slice(0, 200) : '';
    const typeStr = String(field.type ?? 'text');
    const type = (TABLE_COLUMN_INPUT_TYPES as readonly string[]).includes(typeStr) ? typeStr : 'text';
    const helpRaw = typeof field.helpText === 'string' ? field.helpText : '';
    const helpText = helpRaw.trim().slice(0, 500) || undefined;
    const required = field.required === false ? false : undefined;

    let options: string[] | undefined;
    if (tableColumnUsesPicklistOptions(type) && Array.isArray(field.options)) {
      const opts = field.options.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map(v => v.trim().slice(0, 500));
      if (opts.length) options = opts;
    }

    let picklistOptionHelpers: string[] | undefined;
    if (tableColumnUsesPicklistOptions(type) && Array.isArray(field.picklistOptionHelpers)) {
      const helpers = field.picklistOptionHelpers.filter((v): v is string => typeof v === 'string').map(v => v.trim().slice(0, 500));
      if (helpers.some(s => s.length > 0)) picklistOptionHelpers = helpers;
    }

    out.push({
      id,
      label: labelRaw || id,
      type,
      ...(helpText ? { helpText } : {}),
      ...(required === false ? { required: false } : {}),
      ...(options ? { options } : {}),
      ...(picklistOptionHelpers ? { picklistOptionHelpers } : {}),
    });
  }
  return out;
}

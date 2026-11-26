import { TemplateLayout } from '../models/service-catalog.model';

function cloneLayout(layout: TemplateLayout): TemplateLayout {
  return {
    version: layout.version,
    ...(layout.eventScheduleCapture != null ? { eventScheduleCapture: layout.eventScheduleCapture } : {}),
    sections: layout.sections.map(s => ({
      title: s.title,
      rows: s.rows.map(r => ({ columns: r.columns.map(c => [...c]) })),
    })),
  };
}

export function allFieldIdsInLayout(layout: TemplateLayout): string[] {
  const out: string[] = [];
  for (const section of layout.sections) {
    for (const row of section.rows) {
      for (const column of row.columns) {
        out.push(...column);
      }
    }
  }
  return out;
}

export function unusedFieldIds(layout: TemplateLayout, allFieldIds: string[]): string[] {
  const placed = new Set(allFieldIdsInLayout(layout));
  return allFieldIds.filter(id => !placed.has(id));
}

export function addColumnToRow(layout: TemplateLayout, sectionIndex: number, rowIndex: number): TemplateLayout {
  const next = cloneLayout(layout);
  const row = next.sections[sectionIndex]?.rows[rowIndex];
  if (!row) return next;
  row.columns.push([]);
  return next;
}

export function addRowToSection(layout: TemplateLayout, sectionIndex: number): TemplateLayout {
  const next = cloneLayout(layout);
  const section = next.sections[sectionIndex];
  if (!section) return next;
  section.rows.push({ columns: [[]] });
  return next;
}

export function removeColumnAt(layout: TemplateLayout, sectionIndex: number, rowIndex: number, columnIndex: number): TemplateLayout {
  const next = cloneLayout(layout);
  const row = next.sections[sectionIndex]?.rows[rowIndex];
  if (!row || columnIndex < 0 || columnIndex >= row.columns.length) return next;
  const removed = row.columns[columnIndex];
  const rest = row.columns.filter((_, i) => i !== columnIndex);
  if (rest.length === 0) {
    row.columns = [removed];
    return next;
  }
  if (columnIndex === 0) {
    rest[0] = [...removed, ...rest[0]];
  } else {
    rest[columnIndex - 1] = [...rest[columnIndex - 1], ...removed];
  }
  row.columns = rest;
  return next;
}

export function addFieldToLayout(layout: TemplateLayout, fieldId: string, sectionTitle: string): TemplateLayout {
  const next = cloneLayout(layout);
  if (allFieldIdsInLayout(next).includes(fieldId)) return next;
  const title = sectionTitle || 'General';
  const section = next.sections.find(s => s.title === title);
  if (!section) {
    next.sections.push({ title, rows: [{ columns: [[fieldId]] }] });
    return next;
  }
  if (!section.rows.length) {
    section.rows.push({ columns: [[fieldId]] });
    return next;
  }
  const lastRow = section.rows[section.rows.length - 1];
  if (!lastRow.columns.length) {
    lastRow.columns.push([fieldId]);
    return next;
  }
  lastRow.columns[lastRow.columns.length - 1].push(fieldId);
  return next;
}

export function removeFieldFromLayout(layout: TemplateLayout, fieldId: string): TemplateLayout {
  const next = cloneLayout(layout);
  for (const section of next.sections) {
    for (const row of section.rows) {
      row.columns = row.columns.map(column => column.filter(id => id !== fieldId));
    }
  }
  return next;
}

export function reorderLayoutFieldsToMatch(layout: TemplateLayout, orderedFieldIds: string[]): TemplateLayout {
  const rank = new Map(orderedFieldIds.map((id, index) => [id, index]));
  const next = cloneLayout(layout);
  for (const section of next.sections) {
    const ids: string[] = [];
    for (const row of section.rows) {
      for (const column of row.columns) ids.push(...column);
    }
    ids.sort((a, b) => (rank.get(a) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b) ?? Number.MAX_SAFE_INTEGER));
    let cursor = 0;
    for (const row of section.rows) {
      row.columns = row.columns.map(column => ids.slice(cursor, (cursor += column.length)));
    }
  }
  return next;
}

export function moveFieldToColumn(
  layout: TemplateLayout,
  fieldId: string,
  sectionIndex: number,
  rowIndex: number,
  columnIndex: number,
  position: number | null,
): TemplateLayout {
  const target = layout.sections[sectionIndex]?.rows[rowIndex]?.columns[columnIndex];
  if (!target) return cloneLayout(layout);
  const next = removeFieldFromLayout(layout, fieldId);
  const column = next.sections[sectionIndex].rows[rowIndex].columns[columnIndex];
  const insertAt = position == null ? column.length : Math.max(0, Math.min(position, column.length));
  column.splice(insertAt, 0, fieldId);
  return next;
}

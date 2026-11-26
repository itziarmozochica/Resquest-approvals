import type { TemplateRef } from '@angular/core';

import { getExpandedRowModel } from '@tanstack/angular-table';
import type { Cell, ColumnDef, ExpandedState, Row, TableOptions, Updater } from '@tanstack/table-core';

import type {
  IgntTableDesktopCellView,
  IgntTableDesktopRowView,
  IgntTableParentCellView,
  IgntTableParentRowContext,
  IgntTableRowData,
} from '../models';
import type { IgntTableParentCellComponent } from '../parent-row/table-parent-cell.component';
import { getIgntTableColumnMeta } from './table-card-cells.util';

/** Child rows held under a runtime-named key, which no static type can describe. */
function subRowsOf<TData extends IgntTableRowData>(item: TData, subRowsKey: string): TData[] | undefined {
  const subRows = (item as Record<string, unknown>)[subRowsKey];

  return Array.isArray(subRows) ? (subRows as TData[]) : undefined;
}

/**
 * True when a child in `data` holds children of its own. Only one level of nesting renders: a
 * grandchild comes out as a sibling of its parent, with no toggle of its own, so the caller warns
 * rather than letting the table draw a hierarchy that is not there.
 */
export function igntTableHasUnsupportedNesting(params: { data: readonly IgntTableRowData[]; subRowsKey: string }): boolean {
  const { data, subRowsKey } = params;

  return data.some(item => subRowsOf(item, subRowsKey)?.some(child => (subRowsOf(child, subRowsKey)?.length ?? 0) > 0) ?? false);
}

/** Column id → parent cell template, resolved from each parent cell's key or columnType. A cell naming no resolvable target is dropped. */
export function resolveIgntTableParentCellTemplates<TData extends IgntTableRowData>(params: {
  cells: readonly IgntTableParentCellComponent[];
  columnDefs: ColumnDef<TData>[];
}): Map<string, TemplateRef<IgntTableParentRowContext<TData>>> {
  const { cells, columnDefs } = params;
  const templates = new Map<string, TemplateRef<IgntTableParentRowContext<TData>>>();

  for (const cell of cells) {
    // The parent cell is not generic, so its template is declared against the base row type.
    const template = cell.cellTemplate() as TemplateRef<IgntTableParentRowContext<TData>> | undefined;
    const key = cell.key();
    const columnType = cell.columnType();
    const hasKey = key !== undefined && key !== '';
    const target = hasKey
      ? columnDefs.find(def => def.id === key)
      : columnDefs.find(def => columnType !== undefined && getIgntTableColumnMeta({ columnDef: def })?.columnType === columnType);

    if (template !== undefined && target?.id !== undefined) {
      templates.set(target.id, template);
    }
  }

  return templates;
}

/** Column filled by the parent row's own template: the primary column, or the first one when none is primary. */
export function igntTableParentLabelColumnId<TData extends IgntTableRowData>(columnDefs: ColumnDef<TData>[]): string | undefined {
  const primary = columnDefs.find(def => getIgntTableColumnMeta({ columnDef: def })?.columnType === 'primary');

  return (primary ?? columnDefs.at(0))?.id;
}

/**
 * Text of the built-in parent row label: the parent's own value in the label column.
 *
 * Only primitives are rendered — an object-valued column yields an empty label rather than
 * `[object Object]`, since a parent whose label column holds a structure needs a projected template.
 */
export function igntTableParentRowLabel<TData extends IgntTableRowData>(params: {
  labelColumnId: string | undefined;
  row: Row<TData>;
}): string {
  const { labelColumnId, row } = params;
  if (labelColumnId === undefined) return '';
  const value: unknown = row.getValue(labelColumnId);
  if (typeof value === 'string') return value;

  return typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';
}

/** One view per column of a parent row, so the parent row lines up with the column grid. */
export function buildIgntTableParentCellViews<TData extends IgntTableRowData>(params: {
  labelColumnId: string | undefined;
  labelTemplate: TemplateRef<IgntTableParentRowContext<TData>> | undefined;
  row: Row<TData>;
  templates: Map<string, TemplateRef<IgntTableParentRowContext<TData>>>;
  widthStyleFromColumnSize: (size: number | undefined) => string | null;
}): IgntTableParentCellView<TData>[] {
  const { labelColumnId, labelTemplate, row, templates, widthStyleFromColumnSize } = params;

  return row.getVisibleCells().map(cell => {
    const meta = getIgntTableColumnMeta(cell.column);
    const columnId = cell.column.id;

    return {
      align: meta?.align,
      columnId,
      isAction: meta?.columnType === 'action',
      isLabel: columnId === labelColumnId,
      isPrimary: meta?.columnType === 'primary',
      template: templates.get(columnId) ?? (columnId === labelColumnId ? labelTemplate : undefined),
      widthStyle: widthStyleFromColumnSize(cell.column.columnDef.size),
    };
  });
}

/**
 * Expands or collapses a parent, ignoring parents that cannot expand so the emitted state always has
 * something in the DOM reflecting it. The only toggle path: the parent row and the context `toggle()`
 * both route through here.
 */
export function toggleIgntTableParentRow<TData extends IgntTableRowData>(row: Row<TData>): void {
  if (!row.getCanExpand()) return;

  row.toggleExpanded();
}

/** Template context handed to the parent row template and to every parent cell. */
export function buildIgntTableParentRowContext<TData extends IgntTableRowData>(params: {
  label: string;
  row: Row<TData>;
}): IgntTableParentRowContext<TData> {
  const { label, row } = params;

  return {
    $implicit: row.original,
    index: row.index,
    isExpandable: row.getCanExpand(),
    isExpanded: row.getIsExpanded(),
    item: row.original,
    label,
    subRowCount: row.subRows.length,
    toggle: () => {
      toggleIgntTableParentRow(row);
    },
  };
}

/**
 * Row views for the desktop body. A nested table's top-level rows render through the parent row
 * template with no cells of their own; every other row carries its cells and its rendered position.
 */
export function buildIgntTableDesktopRowViews<TData extends IgntTableRowData>(params: {
  hasParentCells: boolean;
  nested: boolean;
  rows: Row<TData>[];
  buildCellView: (cell: Cell<TData, unknown>) => IgntTableDesktopCellView<TData>;
  buildParentCellViews: (row: Row<TData>) => IgntTableParentCellView<TData>[];
  parentLabelOf: (row: Row<TData>) => string;
}): IgntTableDesktopRowView<TData>[] {
  const { buildCellView, buildParentCellViews, hasParentCells, nested, parentLabelOf, rows } = params;
  let renderedDataRows = 0;

  return rows.map(row => {
    if (nested && row.depth === 0) {
      return {
        isParent: true,
        ...(hasParentCells && { parentCells: buildParentCellViews(row) }),
        parentContext: buildIgntTableParentRowContext({ label: parentLabelOf(row), row }),
        row,
      };
    }
    const dataRowIndex = nested ? renderedDataRows : row.index;
    renderedDataRows += 1;

    return {
      cells: row.getVisibleCells().map(cell => buildCellView(cell)),
      dataRowIndex,
      isParent: false,
      isSubRow: nested && row.depth > 0,
      row,
    };
  });
}

/**
 * TanStack options that turn `subRows` into expandable parents. With client-side pagination a page
 * holds whole parents (`paginateExpandedRows: false`) and the total counts parents, not rendered rows.
 *
 * `getRowId` names top-level rows only: a child's id stays its position under its parent, since only
 * parents carry an expanded state. What can expand only ever widens: a parent holding children always
 * can, `getRowCanExpand` adds the ones whose children are not loaded yet, and a parent the host keeps in
 * `expandedRowIds` stays expandable while childless, so it never loses its focus stop, chevron or
 * `aria-expanded` mid-load or once it loads empty, and the user can still collapse it.
 */
export function igntTableNestedRowsOptions<TData extends IgntTableRowData>(params: {
  clientSidePagination: boolean;
  expandedRowIds: ReadonlySet<string> | undefined;
  getRowCanExpand: ((item: TData) => boolean) | undefined;
  getRowId: ((item: TData, index: number) => string) | undefined;
  parentCount: number;
  subRowsKey: string;
  onExpandedChange: (updater: Updater<ExpandedState>) => void;
}): Partial<TableOptions<TData>> {
  const { clientSidePagination, expandedRowIds, getRowCanExpand, getRowId, onExpandedChange, parentCount, subRowsKey } = params;

  return {
    getExpandedRowModel: getExpandedRowModel(),
    onExpandedChange,
    getSubRows: (row: TData) => subRowsOf(row, subRowsKey),
    ...(getRowId !== undefined && {
      getRowId: (item: TData, index: number, parent?: Row<TData>) =>
        parent === undefined ? getRowId(item, index) : `${parent.id}.${index}`,
    }),
    ...((getRowCanExpand !== undefined || expandedRowIds !== undefined) && {
      getRowCanExpand: (row: Row<TData>) =>
        row.subRows.length > 0 ||
        (row.depth === 0 && ((getRowCanExpand?.(row.original) ?? false) || (expandedRowIds?.has(row.id) ?? false))),
    }),
    ...(clientSidePagination && { paginateExpandedRows: false, rowCount: parentCount }),
  };
}

/** Where each parent's children start once `data`'s sub rows are flattened. */
export function igntTableFlattenedSubRowOffsets(params: { data: readonly IgntTableRowData[]; subRowsKey: string }): number[] {
  const { data, subRowsKey } = params;
  const offsets: number[] = [];
  let flattenedCount = 0;

  for (const item of data) {
    offsets.push(flattenedCount);
    flattenedCount += subRowsOf(item, subRowsKey)?.length ?? 0;
  }

  return offsets;
}

/**
 * Position of a row among `data`'s rows, flattening parents. Unaffected by sorting, paging and
 * expansion, unlike the rendered position, so a consumer can use it to identify the row.
 */
export function igntTableFlattenedRowIndex<TData extends IgntTableRowData>(params: {
  offsets: number[] | undefined;
  row: Row<TData>;
}): number {
  const { offsets, row } = params;
  if (offsets === undefined || row.depth !== 1) return row.index;
  const parentIndex = row.getParentRow()?.index;
  if (parentIndex === undefined) return row.index;

  return (offsets[parentIndex] ?? 0) + row.index;
}

/** TanStack expanded state for a host-owned set of expanded parent ids. */
export function igntTableExpandedStateFromIds(ids: ReadonlySet<string>): Record<string, boolean> {
  return Object.fromEntries([...ids].map(id => [id, true]));
}

/**
 * Expanded parent ids TanStack's next state describes. A controlled table always hands TanStack a
 * record and never expands every row at once, so `true` cannot arrive; it keeps the current ids.
 */
export function igntTableExpandedIdsFromState(params: { current: ReadonlySet<string>; state: ExpandedState }): ReadonlySet<string> {
  const { current, state } = params;
  if (state === true) return current;

  return new Set(Object.keys(state).filter(id => state[id]));
}

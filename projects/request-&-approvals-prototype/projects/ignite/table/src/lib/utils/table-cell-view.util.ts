import type { FlexRenderContent } from '@tanstack/angular-table';

import type { IgntTableCellContext, IgntTableDesktopCellView, IgntTableRowData } from '../models';
import { getIgntTableColumnMeta, type IgntTableCardCell } from './table-card-cells.util';

type IgntTableSizedCell<TData extends IgntTableRowData> = IgntTableDesktopCellView<TData>['cell'];

/**
 * Inline width for a column: its explicit `width` input, or null (browser-sized) when unset.
 * Reads the raw def rather than `getSize()` — the latter falls back to TanStack's default size,
 * which is indistinguishable from an explicit width of the same value (e.g. `[width]="150"`).
 */
export function igntTableWidthStyleForColumnSize(size: number | undefined): string | null {
  return size === undefined ? null : `${size}px`;
}

/** Rendered content of a cell: the column's own `cell` definition when it has one, else the raw value. */
export function igntTableCellContent<TData extends IgntTableRowData>(cell: IgntTableCardCell<TData>): FlexRenderContent<object> {
  const cellDef = cell.column.columnDef.cell;
  const content = (typeof cellDef === 'function' ? cellDef(cell.getContext()) : cellDef) as FlexRenderContent<object>;

  return (content ?? cell.getValue()) as FlexRenderContent<object>;
}

/**
 * Template context handed to a projected column cell template. `index` is the caller's flattened
 * position rather than `row.index`, which TanStack numbers per nesting level and so repeats across
 * the children of different parents.
 */
export function buildIgntTableCellContext<TData extends IgntTableRowData>(params: {
  index: number;
  item: TData;
  getValue: () => unknown;
}): IgntTableCellContext<TData> {
  const { getValue, index, item } = params;

  return { $implicit: item, index, item, value: getValue() };
}

/** View for one cell of the desktop table body. */
export function buildIgntTableDesktopCellView<TData extends IgntTableRowData>(
  cell: IgntTableSizedCell<TData>,
): IgntTableDesktopCellView<TData> {
  const meta = getIgntTableColumnMeta(cell.column);
  const cellContent = igntTableCellContent<TData>(cell);

  return {
    align: meta?.align,
    cell,
    cellContent,
    flexRenderContent: cellContent as string | number | ((props: object) => FlexRenderContent<object>) | null | undefined,
    flexRenderProps: meta?.cellTemplateRef ? {} : cell.getContext(),
    isAction: meta?.columnType === 'action',
    isCustom: Boolean(meta?.cellTemplateRef),
    isPrimary: meta?.columnType === 'primary',
    widthStyle: igntTableWidthStyleForColumnSize(cell.column.columnDef.size),
  };
}

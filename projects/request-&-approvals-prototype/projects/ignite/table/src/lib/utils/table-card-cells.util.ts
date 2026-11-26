import type { CellContext, ColumnDef } from '@tanstack/table-core';

import type { IgntTableColumnMeta, IgntTableRowData } from '../models';

/** Cell shape the card view reads from a TanStack row. */
export interface IgntTableCardCell<TData extends IgntTableRowData> {
  column: { columnDef: ColumnDef<TData> };
  id: string;
  getContext: () => CellContext<TData, unknown>;
  getValue: () => unknown;
}

/** Row shape the card view reads from a TanStack row. */
export interface IgntTableCardRow<TData extends IgntTableRowData> {
  getVisibleCells: () => IgntTableCardCell<TData>[];
}

export function getIgntTableColumnMeta<TData extends IgntTableRowData>(column: {
  columnDef: ColumnDef<TData>;
}): IgntTableColumnMeta<TData> | undefined {
  return column.columnDef.meta as IgntTableColumnMeta<TData> | undefined;
}

export function getIgntTableCardActionCell<TData extends IgntTableRowData>(
  row: IgntTableCardRow<TData>,
): IgntTableCardCell<TData> | undefined {
  return row.getVisibleCells().find(cell => getIgntTableColumnMeta(cell.column)?.columnType === 'action');
}

/** Content cells (neither primary nor action) for card view; used to split into visible vs more. */
export function getIgntTableCardContentCells<TData extends IgntTableRowData>(row: IgntTableCardRow<TData>): IgntTableCardCell<TData>[] {
  return row
    .getVisibleCells()
    .filter(
      cell => getIgntTableColumnMeta(cell.column)?.columnType !== 'primary' && getIgntTableColumnMeta(cell.column)?.columnType !== 'action',
    );
}

export function getIgntTableCardPrimaryCell<TData extends IgntTableRowData>(
  row: IgntTableCardRow<TData>,
): IgntTableCardCell<TData> | undefined {
  return row.getVisibleCells().find(cell => getIgntTableColumnMeta(cell.column)?.columnType === 'primary');
}

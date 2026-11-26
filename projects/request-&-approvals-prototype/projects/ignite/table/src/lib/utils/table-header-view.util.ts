import type { Header } from '@tanstack/table-core';

import type { IgntTableColumnMeta, IgntTableHeaderView, IgntTableRowData, IgntTableSortIconName } from '../models';
import { ariaSortForState, sortDirectionForState, sortIconForState } from './table-sorting.util';

export function buildIgntTableHeaderView<TData extends IgntTableRowData>(params: {
  header: Header<TData, unknown>;
  sortColumnAriaLabel: (params: { column: string; direction: 'asc' | 'desc' | 'none' }) => string;
  widthStyleFromColumnSize: (size: number | undefined) => string | null;
}): IgntTableHeaderView<TData> {
  const { header, sortColumnAriaLabel, widthStyleFromColumnSize } = params;
  const meta = header.column.columnDef.meta as IgntTableColumnMeta<TData> | undefined;
  const headerDef = header.column.columnDef.header;
  const isString = typeof headerDef === 'string';
  const label = (headerDef as string | undefined) ?? '';
  const widthStyle = widthStyleFromColumnSize(header.column.columnDef.size);
  const align = meta?.align;
  const isPrimary = meta?.columnType === 'primary';
  const canSort = header.column.getCanSort();
  const sorted = header.column.getIsSorted() as false | 'asc' | 'desc';
  const isSortActive = sorted === 'asc' || sorted === 'desc';
  const sortIcon: IgntTableSortIconName = sortIconForState(sorted);
  const ariaSort = canSort ? ariaSortForState(sorted) : null;
  const sortDirection = sortDirectionForState(sorted);
  const sortAriaLabel = canSort ? sortColumnAriaLabel({ column: label, direction: sortDirection }) : null;
  const toggleSortingHandler = header.column.getToggleSortingHandler() as ((event: unknown) => void) | undefined;
  const headerTemplateRef = meta?.headerTemplateRef ?? null;
  const headerAriaLabel = headerTemplateRef !== null && !canSort ? label : null;

  return {
    align,
    ariaSort,
    canSort,
    colSpan: header.colSpan,
    columnId: header.column.id,
    header: { column: header.column, getContext: header.getContext, id: header.id },
    headerAriaLabel,
    headerTemplateRef,
    isPrimary,
    isSortActive,
    isString,
    label,
    sortAriaLabel,
    sortIcon,
    toggleSorting: canSort && toggleSortingHandler ? toggleSortingHandler : null,
    widthStyle,
  };
}

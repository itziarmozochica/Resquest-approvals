import { getCoreRowModel, getPaginationRowModel, getSortedRowModel } from '@tanstack/angular-table';
import type { ColumnDef, ExpandedState, PaginationState, SortingState, TableOptions, Updater } from '@tanstack/table-core';

import type { IgntTableRowData } from '../models';
import { igntTableNestedRowsOptions } from './table-parent-row-view.util';

/** Which TanStack features the current inputs turn on, and the values each of them reads. */
export interface IgntTableOptionsParams<TData extends IgntTableRowData> {
  clientPageIndex: number;
  columns: ColumnDef<TData>[];
  data: TData[];
  expanded: ExpandedState;
  expandedRowIds: ReadonlySet<string> | undefined;
  getRowCanExpand: ((item: TData) => boolean) | undefined;
  getRowId: ((item: TData, index: number) => string) | undefined;
  nested: boolean;
  pageIndex: number;
  pageSize: number;
  pagination: boolean;
  serverSidePageCount: number;
  serverSidePagination: boolean;
  serverSideSorting: boolean;
  sorting: SortingState;
  sortingEnabled: boolean;
  subRowsKey: string | undefined;
  onClientPaginationChange: (updater: Updater<PaginationState>) => void;
  onExpandedChange: (updater: Updater<ExpandedState>) => void;
  onServerPaginationChange: (updater: Updater<PaginationState>) => void;
  onSortingChange: (updater: Updater<SortingState>) => void;
}

/** Controlled state TanStack should read, holding only the slices the enabled features own. */
function igntTableControlledState<TData extends IgntTableRowData>(
  params: IgntTableOptionsParams<TData>,
): { expanded?: ExpandedState; pagination?: PaginationState; sorting?: SortingState } | undefined {
  const { clientPageIndex, expanded, nested, pageIndex, pageSize, pagination, serverSidePagination, sorting, sortingEnabled } = params;
  const state: { expanded?: ExpandedState; pagination?: PaginationState; sorting?: SortingState } = {};

  if (nested) state.expanded = expanded;
  if (serverSidePagination) state.pagination = { pageIndex, pageSize };
  else if (pagination) state.pagination = { pageIndex: clientPageIndex, pageSize };
  if (sortingEnabled) state.sorting = sorting;

  return Object.keys(state).length > 0 ? state : undefined;
}

/** TanStack options assembled from the table's inputs: every feature contributes only while its input turns it on. */
export function buildIgntTableOptions<TData extends IgntTableRowData>(params: IgntTableOptionsParams<TData>): TableOptions<TData> {
  const { columns, data, nested, pagination, serverSidePagination, serverSideSorting, sortingEnabled, subRowsKey } = params;
  const clientSidePagination = pagination && !serverSidePagination;
  const state = igntTableControlledState(params);

  return {
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    ...(sortingEnabled && !serverSideSorting && { getSortedRowModel: getSortedRowModel() }),
    ...(clientSidePagination && { getPaginationRowModel: getPaginationRowModel() }),
    ...(nested &&
      subRowsKey !== undefined &&
      igntTableNestedRowsOptions<TData>({
        clientSidePagination,
        expandedRowIds: params.expandedRowIds,
        getRowCanExpand: params.getRowCanExpand,
        getRowId: params.getRowId,
        onExpandedChange: params.onExpandedChange,
        parentCount: data.length,
        subRowsKey,
      })),
    ...(sortingEnabled && { enableMultiSort: false, ...(serverSideSorting && { manualSorting: true }) }),
    ...(state !== undefined && { state }),
    ...(serverSidePagination && {
      manualPagination: true,
      onPaginationChange: params.onServerPaginationChange,
      pageCount: params.serverSidePageCount,
    }),
    ...(clientSidePagination && { onPaginationChange: params.onClientPaginationChange }),
    ...(sortingEnabled && { onSortingChange: params.onSortingChange }),
  };
}

import type { TemplateRef } from '@angular/core';

import type { FlexRenderContent } from '@tanstack/angular-table';
import type { CellContext, ColumnDef, Row } from '@tanstack/table-core';

import type { IgntTableColumnAlign } from './ignt-table-column-align';
import type { IgntTableParentRowContext } from './ignt-table-parent-row-context';

/** Sort icon names used in sortable column headers. */
export type IgntTableSortIconName = 'sort-alt' | 'sort-amount-down-alt' | 'sort-amount-up-alt';

/** Pre-computed view for a single cell in card layout (avoids method calls in template). */
export interface IgntTableCardCellView<TData> {
  cell: {
    column: { columnDef: ColumnDef<TData> };
    id: string;
    getContext: () => CellContext<TData, unknown>;
    getValue: () => unknown;
  };
  cellContent: FlexRenderContent<object>;
  flexRenderContent: string | number | ((props: object) => FlexRenderContent<object>) | null | undefined;
  flexRenderProps: unknown;
  headerLabel: string;
  isCustom: boolean;
}

/** Pre-computed view for a card row (avoids method calls in template). */
export interface IgntTableCardRowView<TData> {
  actionCellView: IgntTableCardCellView<TData> | undefined;
  /** Rendered position of the card, for the announced row number. Not a row identity: it moves with paging and expansion. */
  dataRowIndex: number;
  hasMore: boolean;
  isExpanded: boolean;
  moreContentViews: IgntTableCardCellView<TData>[];
  primaryCellView: IgntTableCardCellView<TData> | undefined;
  row: Row<TData>;
  visibleContentViews: IgntTableCardCellView<TData>[];
  moreButtonLabel?: string;
}

/** Pre-computed view for a header cell in desktop table (avoids method calls in template). */
export interface IgntTableHeaderView<TData> {
  align: IgntTableColumnAlign | undefined;
  ariaSort: 'ascending' | 'descending' | 'none' | null;
  canSort: boolean;
  colSpan: number;
  columnId: string;
  header: { column: { columnDef: ColumnDef<TData> }; id: string; getContext: () => unknown };
  headerAriaLabel: string | null;
  headerTemplateRef: TemplateRef<void> | null;
  isPrimary: boolean;
  isSortActive: boolean;
  isString: boolean;
  label: string;
  sortAriaLabel: string | null;
  sortIcon: IgntTableSortIconName;
  toggleSorting: ((event: unknown) => void) | null;
  widthStyle: string | null;
}

/** Pre-computed view for a header group in desktop table. */
export interface IgntTableHeaderGroupView<TData> {
  headers: IgntTableHeaderView<TData>[];
  id: string;
}

/** Pre-computed view for a single cell in desktop table body (avoids method calls in template). */
export interface IgntTableDesktopCellView<TData> {
  align: IgntTableColumnAlign | undefined;
  cell: {
    column: { columnDef: ColumnDef<TData>; getSize: () => number };
    id: string;
    getContext: () => CellContext<TData, unknown>;
    getValue: () => unknown;
  };
  cellContent: FlexRenderContent<object>;
  flexRenderContent: string | number | ((props: object) => FlexRenderContent<object>) | null | undefined;
  flexRenderProps: unknown;
  isAction: boolean;
  isCustom: boolean;
  isPrimary: boolean;
  widthStyle: string | null;
}

/** Pre-computed view for one column of a parent row, when the parent row is aligned to the column grid. */
export interface IgntTableParentCellView<TData> {
  align: IgntTableColumnAlign | undefined;
  columnId: string;
  isAction: boolean;
  /** True for the column the parent row's own label fills; renders the default label when no template is projected. */
  isLabel: boolean;
  isPrimary: boolean;
  /** Template filling this column, or undefined when no parent cell targets it. */
  template: TemplateRef<IgntTableParentRowContext<TData>> | undefined;
  widthStyle: string | null;
}

/** Pre-computed view for a nested table's top-level row, which renders through the parent row template and has no cells of its own. */
export interface IgntTableDesktopParentRowView<TData> {
  isParent: true;
  parentContext: IgntTableParentRowContext<TData>;
  row: Row<TData>;
  /** Set only on parent rows that declare `ignt-table-parent-cell` children; when absent the parent row template spans every column. */
  parentCells?: IgntTableParentCellView<TData>[];
}

/** Pre-computed view for a row that renders through the columns: every row of a flat table, and every child row of a nested one. */
export interface IgntTableDesktopDataRowView<TData> {
  cells: IgntTableDesktopCellView<TData>[];
  /** Rendered position of the row, skipping parent rows, for the announced row number. Not a row identity: it moves with paging and expansion. */
  dataRowIndex: number;
  isParent: false;
  /** True for child rows of a parent; drives their indentation. */
  isSubRow: boolean;
  row: Row<TData>;
}

/** Pre-computed view for a row in desktop table body. `isParent` picks the variant: the two carry disjoint fields. */
export type IgntTableDesktopRowView<TData> = IgntTableDesktopDataRowView<TData> | IgntTableDesktopParentRowView<TData>;

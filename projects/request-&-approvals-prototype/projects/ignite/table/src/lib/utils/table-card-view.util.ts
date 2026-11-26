import type { FlexRenderContent } from '@tanstack/angular-table';
import type { Row } from '@tanstack/table-core';

import type { IgntTableCardCellView, IgntTableCardRowView, IgntTableRowData } from '../models';
import {
  getIgntTableCardActionCell,
  getIgntTableCardContentCells,
  getIgntTableCardPrimaryCell,
  getIgntTableColumnMeta,
  type IgntTableCardCell,
} from './table-card-cells.util';

function buildCardCellView<TData extends IgntTableRowData>(params: {
  cell: IgntTableCardCell<TData>;
  getCellContent: (cell: IgntTableCardCell<TData>) => FlexRenderContent<object>;
}): IgntTableCardCellView<TData> {
  const { cell, getCellContent } = params;
  const meta = getIgntTableColumnMeta(cell.column);
  const header = cell.column.columnDef.header;
  const cellContent = getCellContent(cell);

  return {
    cell,
    cellContent,
    flexRenderContent: cellContent as string | number | ((props: object) => FlexRenderContent<object>) | null | undefined,
    flexRenderProps: meta?.cellTemplateRef ? {} : cell.getContext(),
    headerLabel: typeof header === 'string' ? header : '',
    isCustom: Boolean(meta?.cellTemplateRef),
  };
}

/**
 * View for one card: the primary cell titles it, the action cell sits in its header, and the
 * remaining cells split into the always-visible secondary ones and the rest, behind the see-more toggle.
 */
export function buildIgntTableCardRowView<TData extends IgntTableRowData>(params: {
  dataRowIndex: number;
  expandedRowIds: ReadonlySet<string>;
  row: Row<TData>;
  translations: { seeLess: string; seeMore: string };
  getCellContent: (cell: IgntTableCardCell<TData>) => FlexRenderContent<object>;
}): IgntTableCardRowView<TData> {
  const { dataRowIndex, expandedRowIds, getCellContent, row, translations } = params;
  const toView = (cell: IgntTableCardCell<TData>): IgntTableCardCellView<TData> => buildCardCellView({ cell, getCellContent });
  const primaryCell = getIgntTableCardPrimaryCell(row);
  const actionCell = getIgntTableCardActionCell(row);
  const contentCells = getIgntTableCardContentCells(row);
  const visibleContentViews = contentCells.filter(cell => getIgntTableColumnMeta(cell.column)?.columnType === 'secondary').map(toView);
  const moreContentViews = contentCells.filter(cell => getIgntTableColumnMeta(cell.column)?.columnType !== 'secondary').map(toView);
  const isExpanded = expandedRowIds.has(row.id);
  const hasMore = moreContentViews.length > 0;

  return {
    actionCellView: actionCell ? toView(actionCell) : undefined,
    dataRowIndex,
    hasMore,
    isExpanded,
    moreContentViews,
    primaryCellView: primaryCell ? toView(primaryCell) : undefined,
    row,
    visibleContentViews,
    ...(hasMore && { moreButtonLabel: isExpanded ? translations.seeLess : translations.seeMore }),
  };
}

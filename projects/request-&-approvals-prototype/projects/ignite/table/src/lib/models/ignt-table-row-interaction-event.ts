import type { IgntTableRowData } from './ignt-table-row-data';

/** Payload when the user activates a data row (pointer or keyboard). */
export interface IgntTableRowInteractionEvent<TData extends IgntTableRowData> {
  /** Position of the row in `data`, flattening parents. Stable across sorting, paging and expansion, so it identifies the row. */
  index: number;
  item: TData;
  originalEvent: KeyboardEvent | MouseEvent;
}

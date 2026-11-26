import type { TemplateRef } from '@angular/core';

import type { IgntTableCellContext } from './ignt-table-cell-context';
import type { IgntTableColumnAlign } from './ignt-table-column-align';
import type { IgntTableColumnType } from './ignt-table-column-type';

export interface IgntTableColumnMeta<TData> {
  align?: IgntTableColumnAlign;
  cellTemplateRef?: TemplateRef<IgntTableCellContext<TData>>;
  columnType?: IgntTableColumnType;
  headerTemplateRef?: TemplateRef<void>;
}

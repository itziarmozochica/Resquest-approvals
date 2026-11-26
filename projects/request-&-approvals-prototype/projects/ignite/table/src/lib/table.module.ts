import { IgntTableColumnTemplateDirective } from './column/table-column-template.directive';
import { IgntTableColumnComponent } from './column/table-column.component';
import { IgntTableHeaderTemplateDirective } from './column/table-header-template.directive';
import { IgntTableParentCellComponent } from './parent-row/table-parent-cell.component';
import { IgntTableParentRowLabelComponent } from './parent-row/table-parent-row-label.component';
import { IgntTableParentRowTemplateDirective } from './parent-row/table-parent-row-template.directive';
import { IgntTableParentRowComponent } from './parent-row/table-parent-row.component';
import { IgntTableComponent } from './table.component';

export const TABLE = [
  IgntTableComponent,
  IgntTableColumnComponent,
  IgntTableColumnTemplateDirective,
  IgntTableHeaderTemplateDirective,
  IgntTableParentRowComponent,
  IgntTableParentCellComponent,
  IgntTableParentRowLabelComponent,
  IgntTableParentRowTemplateDirective,
];

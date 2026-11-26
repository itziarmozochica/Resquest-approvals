import { Directive, input } from '@angular/core';

import type { IgntTableCellContext, IgntTableRowData } from '../models';

/**
 * Marks the ng-template as the custom cell template for this column.
 * Add to the template and bind [igntTableColumnTemplateType] with a row sample (e.g. data()[0]) for typed context.
 */
@Directive({
  selector: 'ng-template[igntTableColumnTemplateType]',
  standalone: true,
})
export class IgntTableColumnTemplateDirective<TData extends IgntTableRowData = object> {
  /** Row sample for type inference (e.g. [igntTableColumnTemplateType]="data()[0]"). Enables typed let-item / let-value. */
  readonly igntTableColumnTemplateType = input<TData>();

  static ngTemplateContextGuard<TData extends IgntTableRowData>(
    _dir: IgntTableColumnTemplateDirective<TData>,
    ctx: unknown,
  ): ctx is IgntTableCellContext<TData, TData[keyof TData]> {
    return true;
  }
}

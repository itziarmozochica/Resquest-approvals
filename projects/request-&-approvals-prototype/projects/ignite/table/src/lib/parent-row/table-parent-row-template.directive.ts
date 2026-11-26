import { Directive, input } from '@angular/core';

import type { IgntTableParentRowContext, IgntTableRowData } from '../models';

/**
 * Marks the ng-template as the parent row template for `ignt-table-parent-row`.
 * Bind [igntTableParentRowTemplateType] with a parent sample (e.g. data()[0]) for typed context.
 */
@Directive({
  selector: 'ng-template[igntTableParentRowTemplateType]',
  standalone: true,
})
export class IgntTableParentRowTemplateDirective<TData extends IgntTableRowData = object> {
  /** Parent sample for type inference (e.g. [igntTableParentRowTemplateType]="data()[0]"). Enables typed let-item. */
  readonly igntTableParentRowTemplateType = input<TData>();

  static ngTemplateContextGuard<TData extends IgntTableRowData>(
    _dir: IgntTableParentRowTemplateDirective<TData>,
    ctx: unknown,
  ): ctx is IgntTableParentRowContext<TData> {
    return true;
  }
}

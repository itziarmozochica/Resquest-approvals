import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, TemplateRef } from '@angular/core';

import type { IgntTableCellContext } from './models';

/** Renders a custom cell template with context (item, value, index). Used by ignt-table. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  selector: 'ignt-table-cell-outlet',
  standalone: true,
  // eslint-disable-next-line @angular-eslint/component-max-inline-declarations
  template: `@if (context(); as ctx) {
    <ng-container
      [ngTemplateOutlet]="templateRef() ?? null"
      [ngTemplateOutletContext]="{ $implicit: ctx.item, item: ctx.item, value: ctx.value, index: ctx.index }"
    />
  }`,
})
export class IgntTableCellOutletComponent<TItem, TValue = unknown> {
  readonly context = input.required<IgntTableCellContext<TItem, TValue>>();
  readonly templateRef = input.required<TemplateRef<IgntTableCellContext<TItem, TValue>> | null>();
}

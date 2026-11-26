import { Directive } from '@angular/core';

/**
 * Marks the ng-template as the custom header template for this column.
 * Use it when a header needs markup a string cannot carry, e.g. an info icon with `igntTooltip`.
 */
@Directive({
  selector: 'ng-template[igntTableHeaderTemplate]',
  standalone: true,
})
export class IgntTableHeaderTemplateDirective {}

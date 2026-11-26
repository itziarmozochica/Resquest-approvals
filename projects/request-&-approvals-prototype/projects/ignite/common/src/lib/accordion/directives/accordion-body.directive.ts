import { Directive, inject, TemplateRef } from '@angular/core';

/**
 * Marks an `ng-template` as the lazily-rendered body of an `ignt-accordion-item`.
 *
 * The template is instantiated when the item expands and destroyed when it collapses, so
 * heavy content (forms, rich-text editors) only exists while visible.
 */
@Directive({
  selector: 'ng-template[igntAccordionBody]',
  standalone: true,
})
export class IgntAccordionBodyDirective {
  readonly templateRef: TemplateRef<unknown> = inject(TemplateRef);
}

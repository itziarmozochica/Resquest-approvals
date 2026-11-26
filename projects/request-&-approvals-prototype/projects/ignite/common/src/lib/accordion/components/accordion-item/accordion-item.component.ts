import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, contentChild, inject, input, model, type Signal } from '@angular/core';

import { IgntIconComponent, type IgntIconName } from '@ignite/icon';

import { IgntUUIDDirective } from '../../../core/directives/uuid.directive';
import { IgntAccordionBodyDirective } from '../../directives/accordion-body.directive';
import type { IgntAccordionChevron, IgntAccordionVariant } from '../../models/accordion.model';
import { IGNT_ACCORDION, type IgntAccordionContext } from '../../tokens/accordion.token';
import { requireIgntAccordionContext } from '../../utils/accordion-context.util';

/**
 * A single collapsible row inside an `ignt-accordion`: a native-button header (chevron,
 * label, optional leading and trailing content) that shows or hides its body. Must be used
 * inside an `ignt-accordion`, which supplies the visual variant.
 *
 * The default `<ng-content>` body is instantiated eagerly even while collapsed — only its
 * DOM attachment is deferred. Wrap heavy content (forms, rich-text editors) in
 * `<ng-template igntAccordionBody>` so it is created on expand and destroyed on collapse.
 * Using both at once renders both.
 *
 * Items expand independently; opening one never closes another.
 *
 * ### When to use
 * - One collapsible section, alone or as one row of a group
 * - Controlled sections where the parent tracks open state via `[expanded]`/`(expandedChange)`
 *
 * ### When NOT to use
 * - Outside an `ignt-accordion` — the item throws, because the frame lives on the group
 * - Switching between mutually exclusive views → use Tabs
 *
 * ### Testing
 * The header exposes a fixed `data-testid="ignt-accordion-item-header"`. To target one row
 * among several, put your own `data-testid` on the `<ignt-accordion-item>` element and scope
 * the query from it.
 *
 * ### Related
 * - [Accordion](?path=/docs/components-layout-accordion--docs) — the group that owns `variant`
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The chevron angle rides a custom property so `chevronByVariant` stays the single source
  // of truth; custom properties inherit, so the chevron rule resolves it from here.
  host: { '[style.--ignt-accordion-item-chevron-rotation]': 'chevron().rotation' },
  hostDirectives: [IgntUUIDDirective],
  imports: [IgntIconComponent, NgTemplateOutlet],
  selector: 'ignt-accordion-item',
  standalone: true,
  styleUrl: './accordion-item.component.scss',
  templateUrl: './accordion-item.component.html',
})
export class IgntAccordionItemComponent {
  /**
   * Chevron affordance per variant. The four native variants share `chevron-right` + 90°, so
   * differentiating one is a single-line change here: the rotation reaches CSS through the
   * `--ignt-accordion-item-chevron-rotation` custom property, so no template or stylesheet
   * edit is needed.
   *
   * `list` sizes its chevron at `base` rather than `caption`: it is the row surface the
   * translation screens migrate onto, whose hand-rolled chevron inherited the ambient 16px.
   *
   * `panel` is the odd one out on purpose — it swaps `chevron-down`/`chevron-up` at 16px
   * instead of rotating, because that is what the legacy expansion panel does.
   *
   * Both of those rely on a `font-size` in the stylesheet, because `size: 'base'` does not
   * carry one on its own — see the shared rule in accordion-item.component.scss.
   */
  static readonly chevronByVariant: Readonly<Record<IgntAccordionVariant, IgntAccordionChevron>> = {
    band: { name: 'chevron-right', rotation: '90deg', size: 'caption', variant: 'solid' },
    card: { name: 'chevron-right', rotation: '90deg', size: 'caption', variant: 'solid' },
    list: { name: 'chevron-right', rotation: '90deg', size: 'base', variant: 'solid' },
    panel: { expandedName: 'chevron-up', name: 'chevron-down', rotation: '0deg', size: 'base', variant: 'solid' },
    plain: { name: 'chevron-right', rotation: '90deg', size: 'caption', variant: 'solid' },
  };

  /**
   * Whether the body is shown. Two-way bindable (`[(expanded)]`). Bind `[expanded]` +
   * `(expandedChange)` when the parent owns the state; leave unbound (or set a static
   * initial value) to let the item manage itself. Named after `aria-expanded`, matching
   * `checked` / `disabled` / `selected` elsewhere in Ignite.
   */
  readonly expanded = model(false);

  /**
   * Header title text. For rich titles, project content with the `igntAccordionTitle`
   * attribute instead (or in addition).
   */
  readonly label = input<string | undefined>(undefined);

  readonly #accordion: IgntAccordionContext = requireIgntAccordionContext(inject(IGNT_ACCORDION, { optional: true }));

  readonly #uuidDirective = inject(IgntUUIDDirective);

  protected readonly bodyId = `ignt-accordion-item-body-${this.#uuidDirective.uuid}`;

  /**
   * Default query depth: a nested accordion's body template is declared later, so the first
   * match is always this item's own template.
   */
  protected readonly bodyTemplate: Signal<IgntAccordionBodyDirective | undefined> = contentChild(IgntAccordionBodyDirective);

  protected readonly headerId = `ignt-accordion-item-header-${this.#uuidDirective.uuid}`;

  protected readonly variant: Signal<IgntAccordionVariant> = this.#accordion.variant;

  protected readonly chevron: Signal<IgntAccordionChevron> = computed(() => IgntAccordionItemComponent.chevronByVariant[this.variant()]);

  /** Resolves the glyph swap for variants that declare `expandedName`; identity for the rest. */
  protected readonly chevronName: Signal<IgntIconName> = computed(() => {
    const chevron: IgntAccordionChevron = this.chevron();
    return this.expanded() ? (chevron.expandedName ?? chevron.name) : chevron.name;
  });

  protected toggle(): void {
    this.expanded.update((expanded: boolean) => !expanded);
  }
}

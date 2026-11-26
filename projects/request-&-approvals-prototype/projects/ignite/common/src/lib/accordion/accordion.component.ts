import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { IgntAccordionVariant } from './models/accordion.model';
import { IGNT_ACCORDION, type IgntAccordionContext } from './tokens/accordion.token';

/**
 * Groups one or more `ignt-accordion-item`s and owns the visual treatment they share.
 *
 * Items expand independently — there is no single-open mode. With several items the group
 * renders "glued": flush rows inside a single outer border and radius, separated by
 * hairlines and with no gaps between them. For a visually separated list, render one
 * `ignt-accordion` per item inside your own flex column with a `gap`; the design system
 * never adds gaps itself.
 *
 * ### When to use
 * - Progressive disclosure of inline content sections (settings groups, per-item detail)
 * - A stack of related collapsible rows that should read as one surface
 * - Nested disclosure: an item's body may contain another `ignt-accordion`
 *
 * ### When NOT to use
 * - Switching between mutually exclusive views → use Tabs
 * - Temporary content over the page → use Dialog
 * - A dropdown trigger for actions or filters → use Menu
 *
 * ### Related
 * - [Expansion panel](?path=/docs/components-containment-expansion-panel--docs) — the legacy panel; still the
 *   option for its `menu` variant, `chevronPosition`, always-visible content and `elevation`, none of which
 *   this component covers
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  providers: [{ provide: IGNT_ACCORDION, useExisting: IgntAccordionComponent }],
  selector: 'ignt-accordion',
  standalone: true,
  styleUrl: './accordion.component.scss',
  templateUrl: './accordion.component.html',
})
export class IgntAccordionComponent implements IgntAccordionContext {
  /**
   * Visual treatment shared by every item in the group; also drives item title typography
   * and the chevron affordance.
   * - `card` — bordered, padded panel; each item's background lifts when expanded.
   * - `plain` — chrome-less transparent rows for top-level page sections.
   * - `band` — bordered panel whose item headers are full-width tinted bands.
   * - `list` — flush rows framed by the group, for list surfaces.
   * - `panel` — visual parity with the legacy `ignt-expansion-panel`, for screens migrating
   *   off it without a visual diff. Prefer `card` for new work; this variant exists to be
   *   deleted once those screens are redesigned. One item per group reproduces a single
   *   legacy panel; stacking several glues them like the other framed variants.
   */
  readonly variant = input<IgntAccordionVariant>('card');
}

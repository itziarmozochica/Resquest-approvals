import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import type { IgntBreadcrumbActionItem, IgntBreadcrumbItem } from '../../models/ignt-breadcrumb-item.model';
import { buildBreadcrumbSlots, trackBreadcrumbSlot } from '../../utils/ignt-breadcrumb-collapse.util';

const FIRST_COLLAPSIBLE_INDEX = 1;

/**
 * Navigation trail for hierarchical pages. The last item is always rendered as the current page
 * (non-interactive, `aria-current="page"`). Long trails can collapse to first + … + last via `maxVisibleItems`.
 *
 * ### When to use
 * - The user is deep in a nested hierarchy and needs to see and jump back up the path.
 * - The page has a clear single-parent chain (dashboard → section → subsection → current).
 *
 * ### When NOT to use
 * - Flat navigation between sibling views → use [Tabs](?path=/docs/components-navigation-tabs--docs) instead.
 * - Step-by-step linear flows (checkout, wizard) → use [Progress Stepper](?path=/docs/components-navigation-progress-stepper--docs)
 *
 * ### Related
 * - [Progress Stepper](?path=/docs/components-navigation-progress-stepper--docs) — linear wizard flows
 * - [Tabs](?path=/docs/components-navigation-tabs--docs) — unordered sibling views
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  selector: 'ignt-breadcrumb',
  standalone: true,
  styleUrl: './ignt-breadcrumb.component.scss',
  templateUrl: './ignt-breadcrumb.component.html',
})
export class IgntBreadcrumbComponent {
  /** Ordered breadcrumb trail, root first. The last item is rendered as the current page. */
  readonly items = input.required<IgntBreadcrumbItem[]>();
  /** Accessible label for the `<nav>` landmark, announced by screen readers. */
  readonly ariaLabel = input<string>('Breadcrumb');
  /**
   * Switches to the high-contrast colour set for placement on a coloured, tinted, or dark surface.
   * Leave `false` for the default neutral background.
   */
  readonly contrast = input<boolean>(false);
  /**
   * When set and the trail exceeds it, collapses to first + … + last items (clamped to a minimum of 3).
   * Leave unset to always show the full trail.
   */
  readonly maxVisibleItems = input<number>();

  /** Emitted when an `action`-type item is activated, so the host can run custom navigation. */
  readonly itemActivate = output<{ index: number; item: IgntBreadcrumbActionItem }>();

  protected readonly expanded = signal(false);

  private readonly itemElements = viewChildren<ElementRef<HTMLElement>>('breadcrumbItem');

  constructor() {
    effect(() => {
      this.items();
      this.maxVisibleItems();
      untracked(() => {
        this.expanded.set(false);
      });
    });

    effect(() => {
      if (!this.expanded()) {
        return;
      }

      const elements = this.itemElements();
      // Wait until the DOM reflects the fully expanded trail before moving focus.
      if (elements.length !== this.items().length) {
        return;
      }

      untracked(() => {
        elements[FIRST_COLLAPSIBLE_INDEX]?.nativeElement.focus();
      });
    });
  }

  protected readonly lastItemIndex = computed(() => Math.max(this.items().length - 1, 0));
  protected readonly slots = computed(() => {
    if (this.expanded()) {
      return this.items().map((item, index) => ({ index, item, kind: 'item' as const }));
    }
    return buildBreadcrumbSlots(this.items(), this.maxVisibleItems());
  });
  protected readonly trackBreadcrumbSlot = trackBreadcrumbSlot;

  protected expandTrail(): void {
    this.expanded.set(true);
  }

  protected getRouterLink(routerLink: string | readonly string[]): string | string[] {
    if (typeof routerLink === 'string') {
      return routerLink;
    }

    return routerLink.slice();
  }

  protected isCurrentPage(index: number): boolean {
    return index === this.lastItemIndex();
  }

  protected onActionItemClick(index: number, item: IgntBreadcrumbActionItem): void {
    if (this.isCurrentPage(index)) {
      return;
    }

    this.itemActivate.emit({ index, item });
  }
}

import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconButtonComponent, IgntTagComponent],
  selector: 'app-order-section-tile',
  styleUrl: './order-section-tile.component.scss',
  templateUrl: './order-section-tile.component.html',
})
export class OrderSectionTileComponent {
  readonly title = input.required<string>();
  readonly collapsed = input(true);
  readonly count = input<number | null>(null);

  readonly #isCollapsed = linkedSignal(() => this.collapsed());
  protected readonly isCollapsed = this.#isCollapsed.asReadonly();
  protected readonly chevronIcon = computed<IconProp>(() => (this.#isCollapsed() ? ['fas', 'chevron-down'] : ['fas', 'chevron-up']));

  protected toggle(): void {
    this.#isCollapsed.update(collapsed => !collapsed);
  }
}

import { booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';

import { IgntRippleDirective } from '../../actions/ripple/ripple.directive';
import { IGNT_TAG_CONTEXT, type IgntTagContext } from '../../communication/tag/models/context';
import type { IgntPillButtonIcon } from './models/pill-button.model';

/**
 * Is an interactive, toggleable element that usually represents a filter option. It may
 * include an action to remove it.
 *
 * ### When to use
 * - A group of filter options that lets users apply, combine, and remove filters from a
 *   data set or content list, toggling each one's `checked` state.
 * - An option that also needs its own removable state via `showCloseButton`.
 *
 * ### When NOT to use
 * - A single action → use [Button](?path=/docs/components-actions-button--docs) instead.
 * - An already-applied filter/selection shown for removal only, with no toggle state → use [Pill](?path=/docs/components-selection-pill--docs) instead.
 * - A non-interactive label or status indicator → use [Tag](?path=/docs/components-communication-tag--docs) instead.
 *
 * ### Related
 * - [Pill](?path=/docs/components-selection-pill--docs) — non-toggleable, removable-only chip for an already-applied selection.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconButtonComponent, IgntIconComponent, IgntRippleDirective],
  providers: [
    {
      provide: IGNT_TAG_CONTEXT,
      useFactory: (): IgntTagContext => {
        const pill = inject(IgntPillButtonComponent);
        return {
          sentiment: computed(() => (pill.disabled() ? 'disable' : 'sharp')),
        };
      },
    },
  ],
  selector: 'ignt-pill-button',
  standalone: true,
  styleUrl: './pill-button.component.scss',
  templateUrl: './pill-button.component.html',
})
export class IgntPillButtonComponent {
  /**
   * Text label displayed inside the pill button.
   */
  label = input.required<string>();

  /**
   * Value associated with this pill button.
   */
  value = input.required<string | number>();

  /**
   * Whether the pill button uses the checked visual state.
   */
  checked = input(false, { transform: booleanAttribute });

  /**
   * Whether the pill button is disabled and cannot be interacted with.
   */
  disabled = input(false, { transform: booleanAttribute });

  /**
   * Icon rendered before the label when provided.
   */
  icon = input<IgntPillButtonIcon | undefined>();

  /**
   * Shows the trailing close (×) icon.
   */
  showCloseButton = input(false, { transform: booleanAttribute });

  /**
   * Emitted with the next checked value when the user activates the pill button.
   */
  readonly checkedChange = output<boolean>();

  /**
   * Emitted when the user activates the close (×) icon.
   */
  readonly closed = output();

  protected onClose(): void {
    if (this.disabled()) {
      return;
    }
    this.closed.emit();
  }

  protected onToggle(): void {
    if (this.disabled()) {
      return;
    }
    this.checkedChange.emit(!this.checked());
  }
}

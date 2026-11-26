import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';

import type { IgntPillIcon, IgntPillType } from './models/pill.model';

const DEFAULT_ICON: IgntPillIcon = {
  name: 'times-circle',
  variant: 'regular',
};

/**
 * Selectable pill component for showing contextual options with primary and secondary variants.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent],
  selector: 'ignt-pill',
  standalone: true,
  styleUrl: './pill.component.scss',
  templateUrl: './pill.component.html',
})
export class IgntPillComponent {
  /**
   * Text label displayed inside the pill.
   */
  label = input.required<string>();

  /**
   * Whether the pill is disabled and cannot be interacted with.
   */
  disabled = input(false, { transform: booleanAttribute });

  /**
   * Built-in trailing icon shown on the right side of the pill.
   */
  protected readonly defaultIcon: IgntPillIcon = DEFAULT_ICON;

  /**
   * Visual variant for the pill.
   */
  type = input<IgntPillType>('primary');

  /**
   * Emitted when the user clicks the pill.
   */
  readonly clicked = output<MouseEvent>();

  protected onClick(event: MouseEvent): void {
    if (this.disabled()) {
      return;
    }
    this.clicked.emit(event);
  }
}

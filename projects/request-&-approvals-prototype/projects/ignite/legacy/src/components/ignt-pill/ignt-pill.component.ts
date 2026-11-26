import { NgClass, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';

type PillValues = {
  value: string | number;
};

/**
 * @deprecated Replace with `IgntPillComponent` (dismiss/tag use cases) or `IgntPillButtonComponent` (selectable filter use cases) — both from `@ignite/common`.
 */
@Component({
  selector: 'ignt-pill',
  standalone: true,
  imports: [NgClass, IconsModule, NgIf],
  templateUrl: './ignt-pill.component.html',
  styleUrls: ['./ignt-pill.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IgntPillComponent {
  /**
   * Indicates whether the pill is disabled.
   * @type {boolean}
   * @default false
   * @memberof IgntPillComponent
   */
  @Input() disabled = false;

  /**
   * Indicates whether the pill is fluid.
   * @type {boolean}
   * @default false
   * @memberof IgntPillComponent
   */
  @Input() fluid = false;

  /**
   * Indicates whether the pill is active.
   * @type {boolean}
   * @default false
   * @memberof IgntPillComponent
   */
  @Input({ required: true }) isActive!: boolean;

  /**
   * The label of the pill.
   * @type {string}
   * @required
   * @memberof IgntPillComponent
   */
  @Input({ required: true }) label!: string;

  /**
   * The icon displayed at the leading end of the pill.
   * @type {IconProp}
   * @memberof IgntPillComponent
   * @optional
   */
  @Input() leadingIcon?: IconProp;

  /**
   * The pill size.
   * @type { 'small' | 'medium' }
   * @memberof IgntPillComponent
   * @optional
   */
  @Input() size: 'small' | 'medium' = 'medium';

  /**
   * Event emitted when the status of the pill changes.
   * @type {EventEmitter<PillValues>}
   * @memberof IgntPillComponent
   */
  @Output() statusChange = new EventEmitter<PillValues>();

  /**
   * The icon displayed at the trailing end of the pill.
   * @type {IconProp}
   * @memberof IgntPillComponent
   * @optional
   */
  @Input() trailingIcon?: IconProp;

  /**
   * The value associated with the pill.
   * @type {string | number}
   * @required
   * @memberof IgntPillComponent
   */
  @Input({ required: true }) value!: string | number;

  /**
   * Handles the status change event of the pill.
   * @param {Event} [event] - The event triggered by the status change.
   * @memberof IgntPillComponent
   */
  onStatusChange(event?: Event) {
    this.statusChange.emit({ value: this.value });
  }
}

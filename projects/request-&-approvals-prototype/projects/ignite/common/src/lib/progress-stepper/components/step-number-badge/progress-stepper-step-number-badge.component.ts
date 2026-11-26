import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';

import type { IgntProgressStepperItemState } from '../../models/progress-stepper.model';

/**
 * Circular badge showing the current step's ordinal number, with a status treatment.
 *
 * Internal to `IgntProgressStepperComponent` — not part of the public API.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent],
  selector: 'ignt-progress-stepper-step-number-badge',
  standalone: true,
  styleUrl: './progress-stepper-step-number-badge.component.scss',
  templateUrl: './progress-stepper-step-number-badge.component.html',
})
export class IgntProgressStepperStepNumberBadgeComponent {
  /**
   * Visual status of the current step.
   * - `upcoming` — grey fill and border.
   * - `active` — primary weak fill and primary border.
   * - `completed` — same as active, plus a green check accent.
   * - `error` — same as active, plus a red exclamation accent.
   */
  readonly state = input.required<IgntProgressStepperItemState>();

  /**
   * 1-based ordinal displayed inside the badge. Always visible.
   */
  readonly stepNumber = input.required<number>();
}

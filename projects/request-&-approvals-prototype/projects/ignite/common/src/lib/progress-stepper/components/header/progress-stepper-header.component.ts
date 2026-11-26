import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { IgntProgressStepperViewItem } from '../../models/progress-stepper.model';
import { IgntProgressStepperStepNumberBadgeComponent } from '../step-number-badge/progress-stepper-step-number-badge.component';

/**
 * Current-step header: number badge, optional "Step X of Y" count, title and description.
 *
 * Internal to `IgntProgressStepperComponent` — not part of the public API. Split out so the
 * stepper template stays under the cyclomatic-complexity budget; it owns the breakpoint-specific
 * description placement.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntProgressStepperStepNumberBadgeComponent],
  selector: 'ignt-progress-stepper-header',
  standalone: true,
  styleUrl: './progress-stepper-header.component.scss',
  templateUrl: './progress-stepper-header.component.html',
})
export class IgntProgressStepperHeaderComponent {
  /**
   * View model of the step being displayed.
   */
  readonly current = input.required<IgntProgressStepperViewItem>();

  /**
   * Whether the "Step X of Y" count is rendered. It is the mobile stand-in for the step track,
   * so the stepper passes its `showStepTrack` here and the count follows the track's visibility.
   */
  readonly showStepCount = input.required<boolean>();

  /**
   * Already formatted "Step X of Y" text.
   */
  readonly stepCountText = input.required<string>();
}

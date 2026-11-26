import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, output, type Signal } from '@angular/core';

import type { IgntProgressStepperItemState } from '../../models/progress-stepper.model';

/**
 * Clickable progress-track item (dot + optional connector). Upcoming steps render as a
 * non-interactive marker; completed, active, and error steps are native buttons. Disabled
 * does not change that split — those buttons keep their visual state and do not activate.
 *
 * Internal to `IgntProgressStepperComponent` — not part of the public API.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'ignt-progress-stepper-track-dot',
  standalone: true,
  styleUrl: './progress-stepper-track-dot.component.scss',
  templateUrl: './progress-stepper-track-dot.component.html',
})
export class IgntProgressStepperTrackDotComponent {
  /**
   * Accessible name for the clickable dot. Ignored when the step is upcoming.
   */
  readonly ariaLabel = input.required<string>();

  /**
   * Visual status of this track item.
   * - `upcoming` — hollow grey; not interactive.
   * - `active` — solid primary; clickable.
   * - `completed` — solid primary; clickable.
   * - `error` — solid danger; clickable.
   */
  readonly state = input.required<IgntProgressStepperItemState>();

  /**
   * Whether the connector to the next dot is drawn as walked. The stepper sets it from position
   * (this step sits before the current one), not from `state`: an active or errored step ahead of
   * the user must not light the segment after it.
   */
  readonly connectorReached = input(false, { transform: booleanAttribute });

  /**
   * Whether the whole stepper is disabled. Blocks activation without changing the marker treatment.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Whether this dot is the current step. Independent of visual `state` so a current step that
   * is in error still exposes `aria-current="step"`, and a past error step does not.
   */
  readonly isCurrent = input(false, { transform: booleanAttribute });

  /**
   * Whether to render the connector line to the next dot. Hide on the last visible step.
   */
  readonly showConnector = input(true, { transform: booleanAttribute });

  /**
   * Emitted when a clickable (completed, active, or error) dot is activated.
   */
  readonly clicked = output();

  protected readonly isInteractive: Signal<boolean> = computed(() => this.state() !== 'upcoming');

  protected onActivate(): void {
    if (this.isInteractive() === false || this.disabled()) {
      return;
    }
    this.clicked.emit();
  }
}

import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { IconName, IconPrefix } from '@fortawesome/fontawesome-svg-core';
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';

import { Step } from './ignt.stepper.model';

/**
 * A stepper component that displays a sequence of steps with their current status.
 * Each step can show a number, label, title and description, and can be in different states
 * like completed, active, disabled or inactive.
 *
 * @example
 * <ignt-stepper
 *   [steps]="steps"
 *   [currentStep]="0"
 *   [allowStepSelection]="true"
 *   [hideStepNumber]="false"
 *   (selectStep)="onStepSelect($event)">
 * </ignt-stepper>
 *
 * @input allowStepSelection - Whether steps can be clicked to navigate between them
 * @input currentStep - The index of the currently active step
 * @input hideStepNumber - Whether to hide the step numbers
 * @input isDisabled - Whether the entire stepper is disabled
 * @input steps - Array of step configurations
 * @output selectStep - Event emitted when a step is selected, emits the step index
 */
@Component({
  selector: 'ignt-stepper',
  templateUrl: './ignt-stepper.component.html',
  styleUrls: ['./ignt-stepper.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgFor, NgIf, IconsModule],
})
export class IgntStepperComponent {
  @Input() allowStepSelection = false;
  @Input() currentStep = 0;
  @Input() hideContent = false;
  @Input() hideStepNumber = false;
  @Input() isDisabled = false;
  @Output() selectStep = new EventEmitter<number>();
  @Input() steps: Step[] = [];

  protected iconNameByStep: Record<Step['status'], [IconPrefix, IconName] | null> = {
    completed: ['fas', 'check'],
    active: ['fas', 'circle'],
    started: ['fas', 'circle'],
    disabled: ['fas', 'circle'],
    inactive: null,
  };

  onClickStep(step: number) {
    if (this.allowStepSelection && this.steps[step].status !== 'disabled') {
      this.selectStep.emit(step);
    }
  }

  trackByFn(index: number): number {
    return index;
  }
}

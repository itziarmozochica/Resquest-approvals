import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { WizardStepView } from '../../models/fz-wizard-stepper.model';

/** Card-based wizard stepper mirroring the ops-hub "Step-by-step setup" layout. Purely presentational. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, IgntIconComponent],
  selector: 'app-fz-wizard-stepper',
  standalone: true,
  styleUrl: './fz-wizard-stepper.component.scss',
  templateUrl: './fz-wizard-stepper.component.html',
})
export class FzWizardStepperComponent {
  @Input({ required: true }) steps: WizardStepView[] = [];
  @Input() currentIndex = 0;
  @Input() title?: string;
  @Input() allowStepSelect = false;
  @Input() showProgress = true;
  @Output() stepSelect = new EventEmitter<number>();

  get total(): number {
    return this.steps.length;
  }

  get progressPercent(): number {
    if (!this.total) {
      return 0;
    }
    return Math.round(((this.currentIndex + 1) / this.total) * 100);
  }

  onSelect(index: number): void {
    if (this.allowStepSelect && index !== this.currentIndex) {
      this.stepSelect.emit(index);
    }
  }

  trackById(_: number, step: WizardStepView): string {
    return step.id;
  }
}

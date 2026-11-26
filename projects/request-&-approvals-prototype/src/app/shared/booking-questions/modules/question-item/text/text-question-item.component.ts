import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';

import { faExclamationCircle, IconDefinition } from '@fortawesome/pro-light-svg-icons';

import { BookingQuestion } from '../../../models';
import { QuestionItemComponent } from '../question-item.component';

@Component({
  selector: 'fv-text-question-item',
  standalone: false,
  templateUrl: './text-question-item.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextQuestionItemComponent extends QuestionItemComponent {
  @Input() override formGroup!: UntypedFormGroup;
  @Input() override question!: BookingQuestion;
  @Input() override controlId!: string;

  readonly icons: Record<string, IconDefinition> = {
    faExclamationCircle,
  };
}

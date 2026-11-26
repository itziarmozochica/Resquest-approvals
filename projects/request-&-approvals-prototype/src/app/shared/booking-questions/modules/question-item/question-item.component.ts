import { UntypedFormGroup } from '@angular/forms';

import { BookingQuestion } from '../../models';

export abstract class QuestionItemComponent {
  formGroup!: UntypedFormGroup;
  question!: BookingQuestion;
  controlId!: string;
}

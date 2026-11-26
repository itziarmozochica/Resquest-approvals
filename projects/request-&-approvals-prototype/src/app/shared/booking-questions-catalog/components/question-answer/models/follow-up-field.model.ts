import { FormControl } from '@angular/forms';

export interface FollowUpField {
  answer: string;
  choice: string;
  control: FormControl<string>;
  message: string;
}

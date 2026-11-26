import { ChangeDetectionStrategy, Component, ContentChild, Input } from '@angular/core';
import { NgControl } from '@angular/forms';

import { BookingQuestion } from '../../models';

@Component({
  selector: 'app-booking-question-form-control',
  standalone: false,
  templateUrl: './form-control.component.html',
  styleUrls: ['./form-control.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormControlComponent {
  @ContentChild(NgControl, { static: true }) control?: NgControl;

  @Input() question?: BookingQuestion;
  @Input() error?: boolean;
}

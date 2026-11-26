import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { AppendOptionalRequiredPipe } from '../../pipes/append-optional-required.pipe';
import { BuildBookingQuestionIdPipe } from '../../pipes/build-booking-question-id.pipe';
import { FormControlComponent } from './form-control.component';

@NgModule({
  imports: [CommonModule, TranslateModule, BuildBookingQuestionIdPipe],
  declarations: [FormControlComponent, AppendOptionalRequiredPipe],
  exports: [FormControlComponent],
})
export class FormControlModule {}

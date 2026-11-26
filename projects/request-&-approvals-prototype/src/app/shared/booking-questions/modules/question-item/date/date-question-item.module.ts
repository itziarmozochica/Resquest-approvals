import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IgntDatePickerInputComponent } from '@ignite/legacy/components/ignt-date-picker-input/ignt-date-picker-input.component';
import { IgntFieldErrorComponent } from '@ignite/legacy/components/ignt-field-error/ignt-field-error.component';
import { TranslateModule } from '@ngx-translate/core';

import { PipesModule } from '../../../../pipes/pipes.module';
import { BuildBookingQuestionIdPipe } from '../../../pipes/build-booking-question-id.pipe';
import { QUESTION_ITEM_COMPONENTS } from '../question-item-factory.token';
import { DateQuestionItemComponent } from './date-question-item.component';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    FontAwesomeModule,
    PipesModule,
    IgntFieldErrorComponent,
    IgntDatePickerInputComponent,
    BuildBookingQuestionIdPipe,
  ],
  declarations: [DateQuestionItemComponent],
  exports: [DateQuestionItemComponent],
  providers: [
    {
      provide: QUESTION_ITEM_COMPONENTS,
      useValue: {
        questionType: 'date',
        componentType: DateQuestionItemComponent,
      },
      multi: true,
    },
  ],
})
export class DateQuestionItemModule {}

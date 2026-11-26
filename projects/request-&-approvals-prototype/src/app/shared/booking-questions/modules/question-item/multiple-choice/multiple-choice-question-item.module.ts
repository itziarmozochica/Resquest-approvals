import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';

import { BuildBookingQuestionIdPipe } from '../../../pipes/build-booking-question-id.pipe';
import { QUESTION_ITEM_COMPONENTS } from '../question-item-factory.token';
import { MultipleChoiceQuestionItemComponent } from './multiple-choice-question-item.component';

@NgModule({
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, FontAwesomeModule, BuildBookingQuestionIdPipe],
  declarations: [MultipleChoiceQuestionItemComponent],
  exports: [MultipleChoiceQuestionItemComponent],
  providers: [
    {
      provide: QUESTION_ITEM_COMPONENTS,
      useValue: {
        questionType: 'multiple_choice',
        componentType: MultipleChoiceQuestionItemComponent,
      },
      multi: true,
    },
  ],
})
export class MultipleChoiceQuestionItemModule {}

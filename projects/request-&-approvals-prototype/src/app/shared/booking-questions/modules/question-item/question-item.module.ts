import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { CheckBoxQuestionItemModule } from './checkbox/checkbox-question-item.module';
import { DateQuestionItemModule } from './date';
import { EmailQuestionItemModule } from './email/email-question-item.module';
import { MultipleChoiceQuestionItemModule } from './multiple-choice';
import { QuestionItemDirective } from './question-item.directive';
import { SingleChoiceQuestionItemModule } from './single-choice';
import { TelQuestionItemModule } from './tel';
import { TextQuestionItemModule } from './text/text-question-item.module';

@NgModule({
  imports: [
    CommonModule,
    TextQuestionItemModule,
    EmailQuestionItemModule,
    TelQuestionItemModule,
    DateQuestionItemModule,
    SingleChoiceQuestionItemModule,
    MultipleChoiceQuestionItemModule,
    CheckBoxQuestionItemModule,
  ],
  declarations: [QuestionItemDirective],
  exports: [QuestionItemDirective],
})
export class QuestionItemModule {}

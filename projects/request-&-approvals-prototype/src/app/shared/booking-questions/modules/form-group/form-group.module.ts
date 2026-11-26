import { CommonModule } from '@angular/common';
import { EnvironmentProviders, ModuleWithProviders, NgModule, Provider } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { TranslateModule } from '@ngx-translate/core';

import { BuildBookingQuestionIdPipe } from '../../pipes/build-booking-question-id.pipe';
import { ConditionalQuestionPipe } from '../../pipes/conditional-question.pipe';
import { SortBookingQuestionsPipe } from '../../pipes/sort-booking-questions.pipe';
import { FormControlModule } from '../form-control/form-control.module';
import { QuestionItemModule } from '../question-item';
import { CompositeQuestionItemModule } from '../question-item/composite-question-item/composite-question-item.module';
import { CheckboxTypeModule } from './checkbox-type/checkbox-type.module';
import { DateTypeModule } from './date-type/date-type.module';
import { EmailTypeModule } from './email-type/email-type.module';
import { BookingQuestionsFormGroupComponent } from './form-group.component';
import { BookingQuestionsFormGroupService } from './form-group.service';
import { NumberTypeModule } from './number-type/number-type.module';
import { SingleChoiceTypeModule } from './single-choice-type/single-choice-type.module';
import { TelTypePhoneService } from './tel-type/tel-type-phone.service';
import { TelTypeModule } from './tel-type/tel-type.module';
import { TextTypeModule } from './text-type/text-type.module';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    FormControlModule,
    TextTypeModule,
    EmailTypeModule,
    NumberTypeModule,
    TelTypeModule,
    DateTypeModule,
    CheckboxTypeModule,
    SingleChoiceTypeModule,
    QuestionItemModule,
    BuildBookingQuestionIdPipe,
    SortBookingQuestionsPipe,
    CompositeQuestionItemModule,
    ConditionalQuestionPipe,
    IgntCheckboxComponent,
  ],
  declarations: [BookingQuestionsFormGroupComponent],
  exports: [BookingQuestionsFormGroupComponent],
})
export class BookingQuestionsFormGroupModule {
  static configure(): ModuleWithProviders<BookingQuestionsFormGroupModule> {
    const providers: (Provider | EnvironmentProviders)[] = [BookingQuestionsFormGroupService, TelTypePhoneService];

    return {
      ngModule: BookingQuestionsFormGroupModule,
      providers,
    };
  }
}

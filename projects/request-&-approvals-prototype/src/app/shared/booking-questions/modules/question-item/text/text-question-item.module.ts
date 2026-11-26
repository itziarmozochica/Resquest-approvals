import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';

import { IconsModule } from '../../../../icons/icons.module';
import { BuildBookingQuestionIdPipe } from '../../../pipes/build-booking-question-id.pipe';
import { QUESTION_ITEM_COMPONENTS } from '../question-item-factory.token';
import { TextQuestionItemComponent } from './text-question-item.component';

@NgModule({
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, IconsModule, IgntInputFieldComponent, BuildBookingQuestionIdPipe],
  declarations: [TextQuestionItemComponent],
  exports: [TextQuestionItemComponent],
  providers: [
    {
      provide: QUESTION_ITEM_COMPONENTS,
      useValue: {
        questionType: 'text',
        componentType: TextQuestionItemComponent,
      },
      multi: true,
    },
  ],
})
export class TextQuestionItemModule {}

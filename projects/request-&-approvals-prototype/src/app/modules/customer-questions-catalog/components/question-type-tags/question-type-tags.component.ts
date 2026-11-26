import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { CustomerQuestionType } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question-type.enum';
import { IgntPillButtonComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import { getCustomerQuestionTypeIcon, getCustomerQuestionTypeLabelKey } from '../../utils/customer-question-type.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntPillButtonComponent, TranslateModule],
  selector: 'app-question-type-tags',
  standalone: true,
  styleUrl: './question-type-tags.component.scss',
  templateUrl: './question-type-tags.component.html',
})
export class QuestionTypeTagsComponent {
  readonly type = input.required<CustomerQuestionType>();
  readonly checkable = input(false, { transform: booleanAttribute });
  readonly checked = input(false, { transform: booleanAttribute });

  readonly checkedChange = output<boolean>();

  protected readonly icon = computed<string>(() => getCustomerQuestionTypeIcon(this.type()));
  protected readonly labelKey = computed<string>(() => getCustomerQuestionTypeLabelKey(this.type()));
}

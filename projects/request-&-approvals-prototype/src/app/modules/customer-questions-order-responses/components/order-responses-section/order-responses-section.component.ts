import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { QuestionAnswerComponent } from '@fz-original/app/shared/booking-questions-catalog/components/question-answer/question-answer.component';
import { QuestionAnswerValue } from '@fz-original/app/shared/booking-questions-catalog/models/question-answer-value.model';
import { QuestionFrequency } from '@fz-original/app/shared/main-plan-questions/models/question-frequency.enum';
import {
  getFrequencyDescriptionKey,
  getFrequencyIcon,
  getFrequencyLabelKey,
  getWhenFormTitleKey,
  getWhenSubtitleKey,
} from '@fz-original/app/shared/main-plan-questions/utils/main-plan-question-labels.util';
import { IgntButtonComponent, IgntButtonIcon } from '@ignite/common';
import { IgntExpansionPanelComponent } from '@ignite/legacy/components/ignt-expansion-panel/ignt-expansion-panel.component';
import { IgntListItemComponent } from '@ignite/legacy/components/ignt-list-item/ignt-list-item.component';
import { TranslateModule } from '@ngx-translate/core';

import { OrderResponseEntry, OrderResponseSection } from '../../models/order-responses-view.model';
import { isClearable, OrderResponseControls, toAnswerValue } from '../../utils/order-responses-form.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntButtonComponent,
    IgntExpansionPanelComponent,
    IgntListItemComponent,
    NgTemplateOutlet,
    QuestionAnswerComponent,
    ReactiveFormsModule,
    TranslateModule,
  ],
  selector: 'app-order-responses-section',
  styleUrl: './order-responses-section.component.scss',
  templateUrl: './order-responses-section.component.html',
})
export class OrderResponsesSectionComponent {
  readonly anchorTickets = input(false, { transform: booleanAttribute });
  readonly section = input.required<OrderResponseSection>();
  readonly controls = input<OrderResponseControls | null>(null);
  readonly editable = input(false, { transform: booleanAttribute });
  readonly editDisabled = input(false, { transform: booleanAttribute });
  readonly editing = input(false, { transform: booleanAttribute });
  readonly edit = output<void>();

  protected readonly editIcon: IgntButtonIcon = { name: 'pen-to-square', variant: 'solid' };
  protected readonly frequencies = QuestionFrequency;

  protected answerValue(entry: OrderResponseEntry): QuestionAnswerValue {
    return toAnswerValue(entry);
  }

  protected canClear(entry: OrderResponseEntry): boolean {
    return isClearable(entry);
  }

  /** A photo or an accepted terms box has no control: the endpoint does not take one back. */
  protected controlFor(entry: OrderResponseEntry): FormControl<QuestionAnswerValue> | null {
    return this.controls()?.get(entry.key) ?? null;
  }

  protected frequencyDescriptionKey(frequency: QuestionFrequency): string {
    return getFrequencyDescriptionKey(frequency);
  }

  protected frequencyIcon(frequency: QuestionFrequency): [string, string] {
    return ['fal', getFrequencyIcon(frequency)];
  }

  protected frequencyLabelKey(frequency: QuestionFrequency): string {
    return getFrequencyLabelKey(frequency);
  }

  protected onEdit(event: Event): void {
    event.stopPropagation();
    this.edit.emit();
  }

  protected get subtitleKey(): string {
    return getWhenSubtitleKey(this.section().when);
  }

  protected get titleKey(): string {
    return getWhenFormTitleKey(this.section().when);
  }
}

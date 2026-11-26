import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { CustomerQuestionChoiceInput } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question-input.model';
import { CustomerQuestionType } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question-type.enum';
import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { MultiSelectModule } from '@fz-original/app/shared/layout/filters/multi-select/multi-select.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { AutoAnswerFrom } from '@fz-original/app/shared/main-plan-questions/models/auto-answer-from.enum';
import { MainPlanQuestionInput } from '@fz-original/app/shared/main-plan-questions/models/main-plan-question-input.model';
import { QuestionAnswersAttachment } from '@fz-original/app/shared/main-plan-questions/models/question-answers-attachment.enum';
import { QuestionFrequency } from '@fz-original/app/shared/main-plan-questions/models/question-frequency.enum';
import { QuestionWhen } from '@fz-original/app/shared/main-plan-questions/models/question-when.enum';
import {
  AUTO_ANSWER_FROM_VALUES,
  getAutoAnswerFromLabelKey,
} from '@fz-original/app/shared/main-plan-questions/utils/main-plan-question-labels.util';
import { optionalForWhen } from '@fz-original/app/shared/main-plan-questions/utils/main-plan-question-rules.util';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntToggleComponent } from '@ignite/legacy/components/ignt-toggle/ignt-toggle.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { MainPlanQuestionSidepanelInfo } from '../../models/question-sidepanel.model';
import { isChoiceQuestionType } from '../../utils/customer-question-type.util';

type DefaultValuesMode = 'input' | 'multi' | 'single' | 'toggle';

interface MpqView {
  answersAttachedToCodes: boolean;
  autoAnswerFromOptions: SelectOption[];
  channelOptions: SelectOption[];
  defaultValueChecked: boolean;
  defaultValueOptions: SelectOption[];
  defaultValuesMode: DefaultValuesMode;
  optional: boolean;
  selectedAutoAnswerFrom: SelectOption | undefined;
  selectedChannels: SelectOption[];
  selectedDefaultValue: SelectOption | undefined;
  selectedDefaultValues: SelectOption[];
  selectedSessionType: SelectOption | undefined;
  sessionTypeOptions: SelectOption[];
}

const TERMS_CHECKED_VALUE = 'checked';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntInputFieldComponent, IgntToggleComponent, IgntTypeaheadModule, MultiSelectModule, ReactiveFormsModule, TranslateModule],
  selector: 'app-main-plan-question-fields',
  standalone: true,
  styleUrl: './main-plan-question-fields.component.scss',
  templateUrl: './main-plan-question-fields.component.html',
})
export class MainPlanQuestionFieldsComponent implements OnInit {
  readonly info = input.required<MainPlanQuestionSidepanelInfo>();
  readonly type = input.required<CustomerQuestionType>();
  readonly choices = input<CustomerQuestionChoiceInput[] | null>(null);
  readonly editable = input<boolean>(false);

  readonly #translate = inject(TranslateService);

  protected readonly showOptional = computed<boolean>(() => this.info().when === QuestionWhen.PRE_BOOKING);
  protected readonly showAutoAnswerFrom = computed<boolean>(
    () => this.info().frequency === QuestionFrequency.PER_ORDER && this.info().when !== QuestionWhen.CHECK_IN,
  );
  protected readonly showAnswersAttachedToCodes = computed<boolean>(() => this.info().frequency === QuestionFrequency.PER_TICKET);

  readonly #mpqOptional = signal<boolean>(false);
  readonly #mpqAnswersAttachedToCodes = signal<boolean>(false);
  readonly #mpqAutoAnswerFrom = signal<AutoAnswerFrom | null>(null);
  readonly #mpqSessionTypeId = signal<number | null>(null);
  readonly #mpqChannelIds = signal<string[]>([]);
  readonly #mpqDefaultValue = signal<string | null>(null);
  readonly #mpqDefaultValues = signal<string[]>([]);
  readonly #mpqDefaultValueChecked = signal<boolean>(false);

  protected readonly mpqDefaultValueControl = new FormControl<string>('', { nonNullable: true });

  protected readonly mpqView = computed<MpqView>(() => this.#buildMpqView());

  ngOnInit(): void {
    const info = this.info();
    this.#mpqOptional.set(info.optional);
    this.#mpqAnswersAttachedToCodes.set(info.answersAttachedTo === QuestionAnswersAttachment.CODES);
    this.#mpqAutoAnswerFrom.set(info.autoAnswerFrom ?? null);
    this.#mpqSessionTypeId.set(info.sessionTypeId ?? null);
    this.#mpqChannelIds.set(info.selectedChannelIds ?? []);
    this.#mpqDefaultValue.set(info.defaultValues?.[0] ?? null);
    this.#mpqDefaultValues.set(info.defaultValues ?? []);
    this.#mpqDefaultValueChecked.set(info.defaultValues?.includes(TERMS_CHECKED_VALUE) ?? false);
    this.mpqDefaultValueControl.setValue(info.defaultValues?.[0] ?? '');
  }

  value(): MainPlanQuestionInput {
    return this.#buildMpqInput(this.info());
  }

  protected onMpqAnswersAttachedChange(event: Event): void {
    this.#mpqAnswersAttachedToCodes.set((event.target as HTMLInputElement).checked);
  }

  protected onMpqAutoAnswerFromSelected(option: SelectOption): void {
    this.#mpqAutoAnswerFrom.set(option.id ? (option.id as AutoAnswerFrom) : null);
  }

  protected onMpqChannelsSelected(options: SelectOption[]): void {
    this.#mpqChannelIds.set(options.map(option => String(option.id)));
  }

  protected onMpqDefaultValueCheckedChange(event: Event): void {
    this.#mpqDefaultValueChecked.set((event.target as HTMLInputElement).checked);
  }

  protected onMpqDefaultValueSelected(option: SelectOption | undefined): void {
    this.#mpqDefaultValue.set(option?.id ? String(option.id) : null);
  }

  protected onMpqDefaultValuesSelected(options: SelectOption[]): void {
    this.#mpqDefaultValues.set(options.map(option => option.title));
  }

  protected onMpqOptionalChange(event: Event): void {
    this.#mpqOptional.set((event.target as HTMLInputElement).checked);
  }

  protected onMpqSessionTypeSelected(option: SelectOption | undefined): void {
    this.#mpqSessionTypeId.set(option?.id ? Number(option.id) : null);
  }

  #buildDefaultValuesView(): { mode: DefaultValuesMode; options: SelectOption[]; selected: SelectOption[] } {
    const type = this.type();
    if (type === CustomerQuestionType.CHECKBOX_WITH_TERMS) {
      return { mode: 'toggle', options: [], selected: [] };
    }

    if (!isChoiceQuestionType(type)) {
      return { mode: 'input', options: [], selected: [] };
    }

    const choiceOptions: SelectOption[] = (this.choices() ?? []).map(choice => ({ id: choice.label, title: choice.label }));

    if (type === CustomerQuestionType.MULTIPLE_CHOICE) {
      const values = new Set(this.#mpqDefaultValues());

      return {
        mode: 'multi',
        options: choiceOptions,
        selected: choiceOptions.filter(option => values.has(String(option.id))),
      };
    }

    const noneOption: SelectOption = { id: '', title: String(this.#translate.instant('mainPlanQuestions.fields.defaultValueNone')) };
    const singleValue = this.#mpqDefaultValue();
    const selectedOption = (singleValue ? choiceOptions.find(option => option.id === singleValue) : undefined) ?? noneOption;

    return {
      mode: 'single',
      options: [noneOption, ...choiceOptions],
      selected: [selectedOption],
    };
  }

  #buildMpqDefaultValues(): string[] | null {
    const mode = this.mpqView().defaultValuesMode;
    if (mode === 'toggle') {
      return this.#mpqDefaultValueChecked() ? [TERMS_CHECKED_VALUE] : null;
    }

    const choiceLabels = new Set((this.choices() ?? []).map(choice => choice.label));

    if (mode === 'multi') {
      const values = this.#mpqDefaultValues().filter(value => choiceLabels.has(value));

      return values.length > 0 ? values : null;
    }

    if (mode === 'single') {
      const value = this.#mpqDefaultValue();

      return value && choiceLabels.has(value) ? [value] : null;
    }

    const text = this.mpqDefaultValueControl.value.trim();

    return text ? [text] : null;
  }

  #buildMpqInput(info: MainPlanQuestionSidepanelInfo): MainPlanQuestionInput {
    return {
      answersAttachedTo: this.showAnswersAttachedToCodes() && this.#mpqAnswersAttachedToCodes() ? QuestionAnswersAttachment.CODES : null,
      autoAnswerFrom: this.showAutoAnswerFrom() ? this.#mpqAutoAnswerFrom() : null,
      channelIds: this.#mpqChannelIds(),
      defaultValues: this.#buildMpqDefaultValues(),
      frequency: info.frequency,
      optional: optionalForWhen(info.when, this.#mpqOptional()),
      order: info.order,
      sessionTypeId: this.#mpqSessionTypeId(),
      when: info.when,
    };
  }

  #buildMpqView(): MpqView {
    const info = this.info();
    const selectedChannelIds = new Set(this.#mpqChannelIds());
    const autoAnswerFrom = this.#mpqAutoAnswerFrom();
    const sessionTypeId = this.#mpqSessionTypeId();
    const noneOption: SelectOption = { id: '', title: String(this.#translate.instant('mainPlanQuestions.autoAnswerFrom.none')) };
    const autoAnswerFromOptions: SelectOption[] = [
      noneOption,
      ...AUTO_ANSWER_FROM_VALUES.map(value => ({ id: value, title: String(this.#translate.instant(getAutoAnswerFromLabelKey(value))) })),
    ];
    const defaultValues = this.#buildDefaultValuesView();

    return {
      answersAttachedToCodes: this.#mpqAnswersAttachedToCodes(),
      autoAnswerFromOptions,
      channelOptions: info.channelOptions,
      defaultValueChecked: this.#mpqDefaultValueChecked(),
      defaultValueOptions: defaultValues.options,
      defaultValuesMode: defaultValues.mode,
      optional: this.#mpqOptional(),
      selectedAutoAnswerFrom: autoAnswerFrom === null ? noneOption : autoAnswerFromOptions.find(option => option.id === autoAnswerFrom),
      selectedChannels: info.channelOptions.filter(option => selectedChannelIds.has(String(option.id))),
      selectedDefaultValue: defaultValues.selected[0],
      selectedDefaultValues: defaultValues.selected,
      selectedSessionType: sessionTypeId !== null ? info.sessionTypeOptions.find(option => option.id === sessionTypeId) : undefined,
      sessionTypeOptions: info.sessionTypeOptions,
    };
  }
}

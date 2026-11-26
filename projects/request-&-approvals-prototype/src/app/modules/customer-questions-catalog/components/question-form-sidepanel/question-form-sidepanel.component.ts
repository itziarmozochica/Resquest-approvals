import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CustomerQuestionInput } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question-input.model';
import { CustomerQuestionType } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question-type.enum';
import { MainPlanQuestionsService } from '@fz-original/app/shared/main-plan-questions/main-plan-questions.service';
import { MainPlanQuestionInput } from '@fz-original/app/shared/main-plan-questions/models/main-plan-question-input.model';
import { getFrequencyLabelKey, getWhenLabelKey } from '@fz-original/app/shared/main-plan-questions/utils/main-plan-question-labels.util';
import { getHiddenQuestionTypes } from '@fz-original/app/shared/main-plan-questions/utils/question-form-types.util';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntButtonComponent, IgntDialogModule } from '@ignite/common';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map, Observable, of, switchMap, tap, throwError } from 'rxjs';

import { CustomerQuestionSidepanelData, QuestionAdditionalValue, QuestionBaseValue } from '../../models/question-sidepanel.model';
import { CustomerQuestionsCatalogFacade } from '../../services/customer-questions-catalog.facade';
import { CUSTOMER_QUESTION_TYPE_FILTER_OPTIONS } from '../../utils/customer-question-type.util';
import { MainPlanQuestionFieldsComponent } from '../main-plan-question-fields/main-plan-question-fields.component';
import { QuestionAdditionalSettingsComponent } from '../question-additional-settings/question-additional-settings.component';
import { QuestionBaseFieldsComponent } from '../question-base-fields/question-base-fields.component';

export type {
  CustomerQuestionSidepanelData,
  MainPlanQuestionSidepanelInfo,
  QuestionSidepanelInfo,
  QuestionSidepanelMode,
} from '../../models/question-sidepanel.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntButtonComponent,
    IgntDialogModule,
    MainPlanQuestionFieldsComponent,
    QuestionAdditionalSettingsComponent,
    QuestionBaseFieldsComponent,
    TranslateModule,
  ],
  selector: 'app-question-form-sidepanel',
  standalone: true,
  styleUrl: './question-form-sidepanel.component.scss',
  templateUrl: './question-form-sidepanel.component.html',
})
export class QuestionFormSidepanelComponent {
  readonly #data = inject<CustomerQuestionSidepanelData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject(IGNT_DIALOG_REF);
  readonly #facade = inject(CustomerQuestionsCatalogFacade);
  readonly #mpqService = inject(MainPlanQuestionsService);
  readonly #toast = inject(ToastService);
  readonly #translate = inject(TranslateService);
  readonly #destroyRef = inject(DestroyRef);

  readonly #questionInfo = this.#data.question;
  readonly #mpqInfo = this.#data.mainPlanQuestion;

  protected readonly questionMode = this.#questionInfo.mode;
  protected readonly mpqMode = this.#mpqInfo?.mode;
  protected readonly isMainPlanQuestion = !!this.#mpqInfo;
  protected readonly questionEditable = this.questionMode !== 'view';
  protected readonly mpqEditable = this.mpqMode === 'create' || this.mpqMode === 'edit';
  protected readonly questionCreate = this.questionMode === 'create';
  protected readonly canSubmit = this.questionEditable || this.mpqEditable;

  protected readonly question = this.#questionInfo.customerQuestion;
  protected readonly type = this.#questionInfo.type;
  protected readonly mpqInfo = this.#mpqInfo;
  protected readonly availableTypes = this.#buildAvailableTypeOptions();
  protected readonly headerTitle: string = this.#buildHeaderTitle();

  protected readonly mpqFields = viewChild(MainPlanQuestionFieldsComponent);

  readonly #questionId = signal<string | null>(this.#questionInfo.customerQuestion?.id ?? null);

  protected readonly saving = signal<boolean>(false);

  protected get confirmLabelKey(): string {
    return this.questionCreate || this.mpqMode === 'create'
      ? 'customerQuestionsCatalog.sidepanel.create'
      : 'customerQuestionsCatalog.sidepanel.save';
  }

  protected onSubmit(base: QuestionBaseValue, additional: QuestionAdditionalValue, mpq: MainPlanQuestionInput | null): void {
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    const questionInput: CustomerQuestionInput = {
      choices: base.choices,
      description: base.description,
      title: base.title,
      type: base.type,
      validationRegex: additional.validationRegex,
    };
    const save$ = this.isMainPlanQuestion
      ? this.#saveMainPlanQuestion(questionInput, additional, mpq)
      : this.#saveCatalogQuestion(questionInput, additional);
    save$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      error: () => {
        this.saving.set(false);
        this.#toast.add({
          autoHide: true,
          delay: 5000,
          message: this.#translate.instant(this.#saveErrorToastKey()),
          sentiment: AlertSentiment.danger,
        });
      },
      next: () => {
        this.#toast.add({
          autoHide: true,
          delay: 5000,
          message: this.#translate.instant(this.#successToastKey()),
          sentiment: AlertSentiment.positive,
        });
        this.#dialogRef.close(true);
      },
    });
  }

  protected get questionHeaderTitleKey(): string {
    if (this.questionMode === 'create') {
      return 'customerQuestionsCatalog.sidepanel.newTitle';
    }

    return this.questionMode === 'edit' ? 'customerQuestionsCatalog.sidepanel.editTitle' : 'customerQuestionsCatalog.sidepanel.title';
  }

  #buildAvailableTypeOptions(): CustomerQuestionType[] {
    if (!this.mpqInfo) {
      return CUSTOMER_QUESTION_TYPE_FILTER_OPTIONS;
    }

    const hidden = new Set(getHiddenQuestionTypes({ frequency: this.mpqInfo.frequency, when: this.mpqInfo.when }));

    return CUSTOMER_QUESTION_TYPE_FILTER_OPTIONS.filter(type => !hidden.has(type));
  }

  #buildHeaderTitle(): string {
    if (this.mpqInfo) {
      return String(
        this.#translate.instant('mainPlanQuestions.sidepanelTitle', {
          frequency: this.#translate.instant(getFrequencyLabelKey(this.mpqInfo.frequency)),
          prefix: this.#translate.instant(this.#mpqTitlePrefixKey()),
          when: this.#translate.instant(getWhenLabelKey(this.mpqInfo.when)),
        }),
      );
    }

    return String(this.#translate.instant(this.questionHeaderTitleKey));
  }

  #mpqTitlePrefixKey(): string {
    if (this.mpqMode === 'create') {
      return 'mainPlanQuestions.sidepanelTitlePrefix.create';
    }

    return this.mpqMode === 'edit' ? 'mainPlanQuestions.sidepanelTitlePrefix.edit' : 'mainPlanQuestions.sidepanelTitlePrefix.readonly';
  }

  #saveCatalogQuestion(questionInput: CustomerQuestionInput, additional: QuestionAdditionalValue): Observable<unknown> {
    return this.#facade.writeQuestion(this.#questionId(), questionInput).pipe(
      tap(questionId => this.#questionId.set(questionId)),
      switchMap(questionId =>
        this.#facade
          .saveCapabilities(questionId, additional.partnerAccessLevel, additional.originalPartnerAccessLevel)
          .pipe(map(() => questionId)),
      ),
    );
  }

  #saveErrorToastKey(): string {
    const createdButNotAssigned =
      this.isMainPlanQuestion && this.questionEditable && this.mpqInfo?.mainPlanQuestionId == null && this.#questionId() != null;

    return createdButNotAssigned ? 'customerQuestionsCatalog.toasts.assignAfterCreateError' : 'customerQuestionsCatalog.toasts.saveError';
  }

  #saveMainPlanQuestion(
    questionInput: CustomerQuestionInput,
    additional: QuestionAdditionalValue,
    mpq: MainPlanQuestionInput | null,
  ): Observable<unknown> {
    const info = this.mpqInfo;
    if (!info || !mpq) {
      return throwError(() => new Error('Missing main plan question context'));
    }

    if (info.mainPlanQuestionId != null) {
      return this.#mpqService.updateMainPlanQuestion(info.partnerId, info.mainPlanId, info.mainPlanQuestionId, mpq);
    }

    const prepare$ = this.questionEditable ? this.#saveCatalogQuestion(questionInput, additional) : of(null);

    return prepare$.pipe(
      switchMap(() => {
        const questionId = this.#questionId();

        return questionId
          ? this.#mpqService.assignQuestion(info.partnerId, info.mainPlanId, questionId, mpq)
          : throwError(() => new Error('Missing booking question to assign'));
      }),
    );
  }

  #successToastKey(): string {
    if (this.isMainPlanQuestion) {
      return this.mpqMode === 'create' ? 'mainPlanQuestions.toasts.assigned' : 'mainPlanQuestions.toasts.updated';
    }

    return this.questionMode === 'create' ? 'customerQuestionsCatalog.toasts.created' : 'customerQuestionsCatalog.toasts.updated';
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { CustomerQuestionType } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question-type.enum';
import { CustomerQuestion } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question.model';
import { InfiniteScrollLoaderDirective } from '@fz-original/app/shared/directives/infinite-scroll-loader/infinite-scroll-loader.directive';
import { IGNT_DIALOG_DATA, IgntButtonComponent, IgntDialogCloseDirective, IgntDialogModule, IgntOptionTileComponent } from '@ignite/common';
import { IgntListItemComponent } from '@ignite/legacy/components/ignt-list-item/ignt-list-item.component';
import { IgntSkeletonComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton/ignt-skeleton.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, catchError, filter, finalize, map, Observable, of } from 'rxjs';

import { CustomerQuestionsCatalogFacade } from '../../services/customer-questions-catalog.facade';
import {
  CUSTOMER_QUESTION_TYPE_FILTER_OPTIONS,
  getCustomerQuestionTypeIcon,
  getCustomerQuestionTypeLabelKey,
  isChoiceQuestionType,
} from '../../utils/customer-question-type.util';

export interface QuestionTypePickerData {
  canCreateFromScratch?: boolean;
  hiddenTypes?: CustomerQuestionType[];
  withSimilarQuestions?: boolean;
}

export interface QuestionTypePickerResult {
  type: CustomerQuestionType;
  createFromScratch?: boolean;
  question?: CustomerQuestion;
}

const SIMILAR_PAGE_SIZE = 20;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntButtonComponent,
    IgntDialogCloseDirective,
    IgntDialogModule,
    IgntListItemComponent,
    IgntOptionTileComponent,
    IgntSkeletonComponent,
    IgntTagComponent,
    InfiniteScrollLoaderDirective,
    TranslateModule,
  ],
  selector: 'app-question-type-picker-modal',
  standalone: true,
  styleUrl: './question-type-picker-modal.component.scss',
  templateUrl: './question-type-picker-modal.component.html',
})
export class QuestionTypePickerModalComponent {
  readonly #data = inject<QuestionTypePickerData | null>(IGNT_DIALOG_DATA, { optional: true });
  readonly #facade = inject(CustomerQuestionsCatalogFacade);

  protected readonly withSimilarQuestions = this.#data?.withSimilarQuestions ?? false;
  protected readonly canCreateFromScratch = this.#data?.canCreateFromScratch ?? false;

  protected readonly typeOptions = CUSTOMER_QUESTION_TYPE_FILTER_OPTIONS.filter(type => !this.#data?.hiddenTypes?.includes(type));
  protected readonly selectedType = signal<CustomerQuestionType | null>(null);
  protected readonly selectedQuestion = signal<CustomerQuestion | null>(null);
  protected readonly similarQuestions = signal<CustomerQuestion[]>([]);
  protected readonly loadingSimilar = signal<boolean>(false);

  protected readonly getTypeIcon = getCustomerQuestionTypeIcon;
  protected readonly getTypeLabelKey = getCustomerQuestionTypeLabelKey;
  protected readonly isChoiceQuestion = (question: CustomerQuestion): boolean => isChoiceQuestionType(question.type);

  readonly #similarActive = new BehaviorSubject<boolean>(false);
  protected readonly similarActive$ = this.#similarActive.asObservable();
  #totalCount = 0;

  protected readonly result = computed<QuestionTypePickerResult | null>(() => {
    const type = this.selectedType();
    if (!type) {
      return null;
    }

    const question = this.selectedQuestion();

    return question ? { question, type } : { type };
  });

  protected readonly createFromScratchResult = computed<QuestionTypePickerResult | null>(() => {
    const type = this.selectedType();

    return type ? { createFromScratch: true, type } : null;
  });

  protected readonly confirmDisabled = computed<boolean>(() => {
    if (!this.selectedType()) {
      return true;
    }

    return this.withSimilarQuestions ? !this.selectedQuestion() : false;
  });

  protected readonly loadSimilarPage = (page: number): Observable<boolean> => {
    const type = this.selectedType();
    if (!type) {
      this.loadingSimilar.set(false);

      return of(false);
    }

    this.loadingSimilar.set(true);

    return this.#facade.loadCatalog({ assignableOnly: true, page, pageSize: SIMILAR_PAGE_SIZE, questionType: type }).pipe(
      filter(() => this.selectedType() === type),
      map(result => {
        this.#totalCount = result.totalCount;
        this.similarQuestions.update(current => (page === 1 ? result.items : [...current, ...result.items]));

        return this.similarQuestions().length < this.#totalCount;
      }),
      catchError(() => of(false)),
      finalize(() => {
        if (this.selectedType() === type) {
          this.loadingSimilar.set(false);
        }
      }),
    );
  };

  protected selectQuestion(question: CustomerQuestion): void {
    this.selectedQuestion.set(this.selectedQuestion()?.id === question.id ? null : question);
  }

  protected selectType(type: CustomerQuestionType): void {
    this.selectedType.set(type);
    this.selectedQuestion.set(null);
    this.similarQuestions.set([]);
    this.#totalCount = 0;

    if (this.withSimilarQuestions) {
      this.loadingSimilar.set(true);
      this.#similarActive.next(true);
    }
  }
}

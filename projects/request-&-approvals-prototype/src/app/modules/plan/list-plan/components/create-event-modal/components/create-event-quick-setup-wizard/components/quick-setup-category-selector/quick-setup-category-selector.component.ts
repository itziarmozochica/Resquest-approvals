import { ChangeDetectionStrategy, Component, computed, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator } from '@angular/forms';

import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ContentQuestionsCatalogService } from '../../../../models/content-questions-catalog/content-questions-catalog.service';
import { ContentCategoryId, ContentVerticalId } from '../../../../models/content-questions.model';
import { quickSetupCategoryIds } from '../../../../models/quick-setup-category.model';
import { QuickSetupPlanCategoryId } from '../../../../models/quick-setup-form.model';
import { QuickSetupContentCategoryOption } from '../../create-event-quick-setup-wizard.model';

type OnChangeFn = (value: QuickSetupPlanCategoryId | null) => void;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntTypeaheadModule, TranslateModule],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => QuickSetupCategorySelectorComponent),
    },
    {
      multi: true,
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => QuickSetupCategorySelectorComponent),
    },
  ],
  selector: 'app-quick-setup-category-selector',
  styleUrl: './quick-setup-category-selector.component.scss',
  templateUrl: './quick-setup-category-selector.component.html',
})
export class QuickSetupCategorySelectorComponent implements ControlValueAccessor, Validator {
  readonly #catalogService = inject(ContentQuestionsCatalogService);
  readonly #translate = inject(TranslateService);

  readonly contentQuestionsEnabled = input(false);

  readonly #category = signal<QuickSetupPlanCategoryId | null>(null);
  /** UI-only filter; the parent resolves the vertical from the catalog once a category is chosen. */
  readonly #selectedVerticalId = signal<ContentVerticalId | null>(null);
  readonly #legacyCategoryOptions = signal<SelectOption[]>([]);
  readonly #contentCategoryOptions = signal<QuickSetupContentCategoryOption[]>([]);
  readonly #verticalOptions = signal<SelectOption[]>([]);
  #onChange: OnChangeFn | undefined;
  #onTouched: (() => void) | undefined;
  #onValidatorChange: (() => void) | undefined;

  protected readonly categoryOptions = computed<SelectOption[]>(() => {
    if (!this.contentQuestionsEnabled()) {
      return this.#legacyCategoryOptions();
    }

    const verticalId = this.#selectedVerticalId();

    return this.#contentCategoryOptions()
      .filter(option => verticalId === null || option.verticalId === verticalId)
      .map(option => ({ id: option.id, title: option.title }));
  });
  protected readonly selectedCategoryOption = computed(() => this.#findCategoryOption(this.#category()));
  protected readonly selectedVerticalOption = computed(() => this.#findVerticalOption(this.#selectedVerticalId()));
  protected readonly verticalOptions = computed(() => this.#verticalOptions());

  constructor() {
    this.#buildCategoryOptions();
  }

  registerOnChange(fn: OnChangeFn): void {
    this.#onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.#onTouched = fn;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.#onValidatorChange = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    void isDisabled;
  }

  validate(): ValidationErrors | null {
    return this.#category() === null ? { required: true } : null;
  }

  writeValue(category: QuickSetupPlanCategoryId | null): void {
    this.#category.set(category);

    if (!this.contentQuestionsEnabled()) {
      this.#selectedVerticalId.set(null);
      return;
    }

    this.#selectedVerticalId.set(category === null ? null : this.#verticalIdForCategory(category as ContentCategoryId));
  }

  protected onCategorySelect(category: SelectOption | undefined): void {
    if (!category) {
      this.#emitCategory(null);
      return;
    }

    const categoryId = String(category.id) as QuickSetupPlanCategoryId;

    if (this.contentQuestionsEnabled()) {
      this.#selectedVerticalId.set(this.#verticalIdForCategory(categoryId as ContentCategoryId));
    }

    this.#emitCategory(categoryId);
  }

  protected onVerticalSelect(vertical: SelectOption | undefined): void {
    const verticalId = vertical === undefined ? null : (String(vertical.id) as ContentVerticalId);
    const currentCategory = this.#category();
    const isCategoryInVertical =
      currentCategory === null ||
      this.#contentCategoryOptions().some(
        option => option.id === currentCategory && (verticalId === null || option.verticalId === verticalId),
      );

    this.#selectedVerticalId.set(verticalId);
    this.#emitCategory(isCategoryInVertical ? currentCategory : null);
  }

  #buildCategoryOptions(): void {
    this.#legacyCategoryOptions.set(
      quickSetupCategoryIds.map(categoryId => ({
        id: categoryId,
        title: this.#translate.instant(`createEvent.quickSetupWizard.step1.categories.${categoryId}`),
      })),
    );

    this.#contentCategoryOptions.set(
      this.#catalogService.catalog.map(category => ({
        id: category.id,
        title: this.#translate.instant(`createEvent.quickSetupWizard.step1.contentQuestions.categories.${category.labelKey}`),
        verticalId: category.verticalId,
      })),
    );
    this.#verticalOptions.set(
      [...new Set(this.#catalogService.catalog.map(category => category.verticalId))].map(verticalId => ({
        id: verticalId,
        title: this.#translate.instant(`createEvent.quickSetupWizard.step1.contentQuestions.verticals.${verticalId}`),
      })),
    );
  }

  #emitCategory(category: QuickSetupPlanCategoryId | null): void {
    this.#category.set(category);
    this.#onTouched?.();
    this.#onValidatorChange?.();
    this.#onChange?.(category);
  }

  #findCategoryOption(categoryId: QuickSetupPlanCategoryId | null): SelectOption | undefined {
    if (categoryId === null) {
      return undefined;
    }

    return (
      this.categoryOptions().find(option => option.id === categoryId) ??
      this.#legacyCategoryOptions().find(option => option.id === categoryId) ??
      this.#contentCategoryOptions().find(option => option.id === categoryId)
    );
  }

  #findVerticalOption(verticalId: ContentVerticalId | null): SelectOption | undefined {
    if (verticalId === null) {
      return undefined;
    }

    return this.#verticalOptions().find(option => option.id === verticalId);
  }

  #verticalIdForCategory(categoryId: ContentCategoryId): ContentVerticalId | null {
    return this.#contentCategoryOptions().find(option => option.id === categoryId)?.verticalId ?? null;
  }
}

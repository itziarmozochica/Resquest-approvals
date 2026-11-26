import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { CatalogCategory } from '@fz-original/app/shared/booking-questions-catalog/models/catalog-category.enum';
import { CustomerQuestionType } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question-type.enum';
import { CustomerQuestion } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question.model';
import { IgntDividerComponent } from '@ignite/legacy/components/ignt-divider/ignt-divider.component';
import { IgntExpansionPanelComponent } from '@ignite/legacy/components/ignt-expansion-panel/ignt-expansion-panel.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntListItemComponent } from '@ignite/legacy/components/ignt-list-item/ignt-list-item.component';
import { IgntRadioComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio.component';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, EMPTY } from 'rxjs';

import { AnswerFormat } from '../../models/answer-format.enum';
import { PartnerAccessLevel } from '../../models/partner-access-level.enum';
import { QuestionAdditionalValue } from '../../models/question-sidepanel.model';
import { CustomerQuestionsCatalogFacade } from '../../services/customer-questions-catalog.facade';
import { getAnswerFormatExampleKeys, supportsAnswerFormat } from '../../utils/customer-question-type.util';
import { DEFAULT_PARTNER_ACCESS_LEVEL, partnerAccessLevelFromCapabilities } from '../../utils/partner-access-level.util';

interface AnswerFormatOption {
  descriptionKey: string;
  format: AnswerFormat;
  labelKey: string;
}

interface PartnerAccessOption {
  descriptionKey: string;
  icon: IconProp;
  labelKey: string;
  level: PartnerAccessLevel;
}

const ANSWER_FORMAT_OPTIONS: AnswerFormatOption[] = [
  {
    descriptionKey: 'customerQuestionsCatalog.sidepanel.answerFormat.noRestriction.description',
    format: AnswerFormat.NO_RESTRICTION,
    labelKey: 'customerQuestionsCatalog.sidepanel.answerFormat.noRestriction.label',
  },
  {
    descriptionKey: 'customerQuestionsCatalog.sidepanel.answerFormat.customPattern.description',
    format: AnswerFormat.CUSTOM_PATTERN,
    labelKey: 'customerQuestionsCatalog.sidepanel.answerFormat.customPattern.label',
  },
];

const PARTNER_ACCESS_OPTIONS: PartnerAccessOption[] = [
  {
    descriptionKey: 'customerQuestionsCatalog.sidepanel.partnerPermissions.levels.fullAccess.description',
    icon: ['fal', 'check-circle'],
    labelKey: 'customerQuestionsCatalog.sidepanel.partnerPermissions.levels.fullAccess.label',
    level: PartnerAccessLevel.FULL_ACCESS,
  },
  {
    descriptionKey: 'customerQuestionsCatalog.sidepanel.partnerPermissions.levels.editAccess.description',
    icon: ['fal', 'edit'],
    labelKey: 'customerQuestionsCatalog.sidepanel.partnerPermissions.levels.editAccess.label',
    level: PartnerAccessLevel.EDIT_ACCESS,
  },
  {
    descriptionKey: 'customerQuestionsCatalog.sidepanel.partnerPermissions.levels.assignAccess.description',
    icon: ['fal', 'clipboard-list'],
    labelKey: 'customerQuestionsCatalog.sidepanel.partnerPermissions.levels.assignAccess.label',
    level: PartnerAccessLevel.ASSIGN_ACCESS,
  },
  {
    descriptionKey: 'customerQuestionsCatalog.sidepanel.partnerPermissions.levels.viewAccess.description',
    icon: ['fal', 'eye'],
    labelKey: 'customerQuestionsCatalog.sidepanel.partnerPermissions.levels.viewAccess.label',
    level: PartnerAccessLevel.VIEW_ACCESS,
  },
];

const SELECTED_OPTION_BACKGROUND = 'var(--question-additional-settings-selected-background)';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntDividerComponent,
    IgntExpansionPanelComponent,
    IgntInputFieldComponent,
    IgntListItemComponent,
    IgntRadioComponent,
    ReactiveFormsModule,
    TranslateModule,
  ],
  selector: 'app-question-additional-settings',
  standalone: true,
  styleUrl: './question-additional-settings.component.scss',
  templateUrl: './question-additional-settings.component.html',
})
export class QuestionAdditionalSettingsComponent implements OnInit {
  readonly type = input.required<CustomerQuestionType>();
  readonly editable = input<boolean>(false);
  readonly question = input<CustomerQuestion | undefined>(undefined);

  readonly #facade = inject(CustomerQuestionsCatalogFacade);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly accessOptions = PARTNER_ACCESS_OPTIONS;
  protected readonly answerFormatOptions = ANSWER_FORMAT_OPTIONS;
  protected readonly customPattern = AnswerFormat.CUSTOM_PATTERN;

  protected readonly patternControl = new FormControl<string>('', { nonNullable: true });

  protected readonly selectedAnswerFormat = signal<AnswerFormat>(AnswerFormat.NO_RESTRICTION);
  protected readonly selectedLevel = signal<PartnerAccessLevel | null>(null);
  readonly #originalLevel = signal<PartnerAccessLevel>(DEFAULT_PARTNER_ACCESS_LEVEL);
  readonly #capabilitiesLoaded = signal<boolean>(false);

  protected readonly answerFormatSupported = computed<boolean>(() => supportsAnswerFormat(this.type()));
  protected readonly exampleKeys = computed(() => getAnswerFormatExampleKeys(this.type()));
  protected readonly answerFormatSubtitleKey = computed<string>(() =>
    this.answerFormatSupported()
      ? 'customerQuestionsCatalog.sidepanel.answerFormat.subtitle'
      : 'customerQuestionsCatalog.sidepanel.answerFormat.notAvailable',
  );

  readonly #canEditPermissions = computed<boolean>(
    () =>
      (this.question()?.catalogCategory ?? CatalogCategory.PARTNER_OWNED) === CatalogCategory.PARTNER_OWNED &&
      this.#facade.canEditCapabilities,
  );

  protected readonly showPartnerPermissions = computed<boolean>(
    () => this.#canEditPermissions() && (!this.question() || this.#capabilitiesLoaded()),
  );
  protected readonly permissionsEditable = computed<boolean>(() => this.editable() && this.showPartnerPermissions());

  ngOnInit(): void {
    const question = this.question();
    const validationRegex = question?.validationRegex ?? '';
    this.patternControl.setValue(validationRegex);
    if (validationRegex) {
      this.selectedAnswerFormat.set(AnswerFormat.CUSTOM_PATTERN);
      this.patternControl.setValidators(Validators.required);
    }
    this.selectedLevel.set(question ? null : DEFAULT_PARTNER_ACCESS_LEVEL);

    if (question && this.#canEditPermissions()) {
      this.#facade
        .loadAllowedCapabilities(question.id)
        .pipe(
          catchError(() => EMPTY),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe(capabilities => {
          const level = partnerAccessLevelFromCapabilities(capabilities);
          this.selectedLevel.set(level);
          this.#originalLevel.set(level);
          this.#capabilitiesLoaded.set(true);
        });
    }
  }

  valid(): boolean {
    return this.selectedAnswerFormat() !== AnswerFormat.CUSTOM_PATTERN || !this.answerFormatSupported() || this.#trimmedPattern() !== '';
  }

  value(): QuestionAdditionalValue {
    return {
      originalPartnerAccessLevel: this.#originalLevel(),
      partnerAccessLevel: this.showPartnerPermissions() ? this.selectedLevel() : null,
      validationRegex: this.#resolveValidationRegex(),
    };
  }

  protected answerFormatBackground(format: AnswerFormat): string {
    return this.selectedAnswerFormat() === format ? SELECTED_OPTION_BACKGROUND : '';
  }

  protected levelBackground(level: PartnerAccessLevel): string {
    return this.selectedLevel() === level ? SELECTED_OPTION_BACKGROUND : '';
  }

  protected selectAnswerFormat(format: AnswerFormat): void {
    if (!this.editable() || this.selectedAnswerFormat() === format) {
      return;
    }

    this.selectedAnswerFormat.set(format);

    if (format === AnswerFormat.CUSTOM_PATTERN) {
      this.patternControl.setValidators(Validators.required);
    } else {
      this.patternControl.clearValidators();
    }

    this.patternControl.updateValueAndValidity();
  }

  protected selectLevel(level: PartnerAccessLevel): void {
    if (this.permissionsEditable()) {
      this.selectedLevel.set(level);
    }
  }

  /**
   * A type with no answer format offers no control, so its stored pattern is carried over
   * untouched instead of being cleared by a save the user never made.
   */
  #resolveValidationRegex(): string | null {
    if (!this.answerFormatSupported()) {
      return this.question()?.validationRegex ?? null;
    }

    return this.selectedAnswerFormat() === AnswerFormat.CUSTOM_PATTERN ? this.#trimmedPattern() || null : null;
  }

  #trimmedPattern(): string {
    return this.patternControl.value.trim();
  }
}

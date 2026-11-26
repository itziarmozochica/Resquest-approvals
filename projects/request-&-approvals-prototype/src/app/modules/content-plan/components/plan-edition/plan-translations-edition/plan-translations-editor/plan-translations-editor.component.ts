import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
  signal,
  Signal,
  untracked,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import { Block } from '@fz-original/app/modules/content-plan/components/plan-edition/description-builder/models/block.model';
import { DescriptionTranslationComponent } from '@fz-original/app/modules/content-plan/components/plan-edition/plan-translations-edition/components/description-translation/description-translation.component';
import { TranslationFieldCountBadgeComponent } from '@fz-original/app/modules/content-plan/components/plan-edition/plan-translations-edition/components/translation-field-count-badge/translation-field-count-badge.component';
import {
  DescriptionField,
  DescriptionFieldChange,
  DescriptionTranslationOverlay,
  DescriptionTranslationStatusMap,
} from '@fz-original/app/modules/content-plan/components/plan-edition/plan-translations-edition/models/description-translation.model';
import { SessionTypeTranslationItem } from '@fz-original/app/modules/content-plan/components/plan-edition/plan-translations-edition/translation-content/translation-content.component';
import {
  applyDescriptionTranslationOverlayWithFallback,
  countDescriptionComponentSlots,
  extractDescriptionTranslationOverlay,
  isValuePresent,
} from '@fz-original/app/modules/content-plan/components/plan-edition/plan-translations-edition/utils/description-translation.adapter';
import {
  AiSessionTypeFieldKey,
  AiSessionTypeFieldView,
  AiSessionTypeTarget,
  AiSessionTypeTranslatedValue,
  AiSessionTypeTranslation,
  AiTranslationFieldKey,
  AiTranslationFields,
  AiTranslationRating,
  AiTranslationRequest,
  AiTranslationResult,
  AiTranslationScope,
  AiTranslationTargetKey,
  AiTranslationTrackedFieldType,
} from '@fz-original/app/modules/content-plan/models/ai-translation.model';
import { PartnerChannel } from '@fz-original/app/modules/content-plan/models/partner-channels.model';
import { PlanSessionType } from '@fz-original/app/modules/content-plan/models/plan-session-types.model';
import { PlanTranslation } from '@fz-original/app/modules/content-plan/models/plan-translation.model';
import { SessionTypeTranslation } from '@fz-original/app/modules/content-plan/models/session-type-translation.model';
import { TranslationsContextData } from '@fz-original/app/modules/content-plan/models/translations-tracking.model';
import { AiPlanTranslationSession } from '@fz-original/app/modules/content-plan/services/ai-translation/ai-plan-translation-session.service';
import { EditingPlanService } from '@fz-original/app/modules/content-plan/services/editing-plan/editing-plan.service';
import { PlanTranslationsStorageService } from '@fz-original/app/modules/content-plan/services/plan-translations-storage/plan-translations-storage.service';
import { PlanTranslationsService } from '@fz-original/app/modules/content-plan/services/plan-translations/plan-translations.service';
import { UploadPlanImageService } from '@fz-original/app/modules/content-plan/services/upload-plan-image/upload-plan-image.service';
import { aiTranslateGenerate } from '@fz-original/app/modules/content-plan/tracking/events/ai-translate-generate.event';
import { aiTranslateRate } from '@fz-original/app/modules/content-plan/tracking/events/ai-translate-rate.event';
import { aiTranslateRequest } from '@fz-original/app/modules/content-plan/tracking/events/ai-translate-request.event';
import { saveTranslations } from '@fz-original/app/modules/content-plan/tracking/events/save-translations.event';
import {
  aiSessionTypeTargetKey,
  aiSessionTypeTargetsByKey,
  aiSessionTypeTrackedFieldType,
  isAiTranslationFieldKey,
  isAiTranslationSourceMeaningful,
  pickMeaningfulAiSessionTypes,
  pickMeaningfulAiTranslationFields,
  requestedAiTranslationFieldKeys,
  requestedAiTranslationTargetKeys,
  usableAiSessionTypeValues,
} from '@fz-original/app/modules/content-plan/utils/ai-translation-fields.util';
import {
  applyInstructionsToAllTicketTypesExceptOrigin,
  countTicketTypesWithNonEmptyInstructionsExceptOrigin,
} from '@fz-original/app/modules/content-plan/utils/apply-session-type-field-to-all.util';
import {
  countPlanTranslationSlots,
  countSessionTypeTranslationSlots,
  isHtmlMeaningful,
  isPlanFieldPopulated,
  isSessionTypeFieldPopulated,
  isSessionTypeRichTextField,
  isTranslationTextPopulated,
  resolveTermsAndConditionsDisplayHtml,
} from '@fz-original/app/modules/content-plan/utils/default-translation-field-catalog';
import {
  buildTermsAndConditionsKey,
  DescriptionComponentCounts,
  TermsAndConditionsChangePayload,
} from '@fz-original/app/modules/content-plan/utils/default-translation-field-count.util';
import { openConfirmModalWithLabels } from '@fz-original/app/modules/content-plan/utils/open-confirm-modal-with-labels.util';
import {
  findPlanTranslationRowForLanguageScope,
  findPlanTranslationRowIndexForLanguageScope,
  planTranslationDisplayNameFromAvailableLanguage,
  planTranslationLanguageKeysEqual,
  PlanTranslationWireHintSource,
  planTranslationWireLanguageCodeForTracking,
} from '@fz-original/app/modules/content-plan/utils/plan-translation-locale.util';
import {
  areAllEditedSessionTypesValidForSave,
  buildEditedSessionTypeHydrationBaseline,
  findSessionTypeDeleteWireLanguageCodes,
  findSessionTypeTranslationForEditor,
  resolveSessionTypeOptionalFieldForSave,
  shouldDeleteEditedSessionTypeForScope,
  shouldSaveEditedSessionType,
} from '@fz-original/app/modules/content-plan/utils/session-type-translation.util';
import { trackTranslationsError } from '@fz-original/app/modules/content-plan/utils/translations-error-tracking.util';
import { buildTranslationsTrackingContext } from '@fz-original/app/modules/content-plan/utils/translations-tracking.util';
import {
  centerTagToRichTextHtml,
  normalizeRichTextHtmlForSave,
} from '@fz-original/app/shared/components/rich-text-editor/rich-text-editor-content.utils';
import { transformQuillText } from '@fz-original/app/shared/components/rich-text-editor/rich-text-editor-legacy-content.utils';
import {
  FieldStatus,
  TranslationTextFieldComponent,
} from '@fz-original/app/shared/components/translation-text-field/translation-text-field.component';
import {
  UnsavedChangesDialogComponent,
  UnsavedChangesDialogData,
} from '@fz-original/app/shared/components/unsaved-changes-dialog/unsaved-changes-dialog.component';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ToastService, ToastType } from '@fz-original/app/shared/services/toast/toast.service';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { AvailableLanguage } from '@fz-original/app/shared/translations/models/available-language.model';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import {
  IgntAccordionBodyDirective,
  IgntAccordionComponent,
  IgntAccordionItemComponent,
  IgntAlertComponent,
  IgntButtonComponent,
  IgntDialogService,
  IgntTooltipDirective,
} from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import {
  IgntButtonDropdownComponent,
  IgntButtonDropdownOption,
} from '@ignite/legacy/components/ignt-button-dropdown/ignt-button-dropdown.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EMPTY, finalize, forkJoin, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

const NULL_CHANNEL_SCOPE_SENTINEL = '__null_channel__';

interface EditedSessionType {
  details: string;
  displayName: string;
  entityId: number;
  instructions: string;
  isExpanded: boolean;
  label: string;
  sourceDetails: string;
  sourceInstructions: string;
  sourceLabel: string;
}

const SOURCE_OPTION_SEPARATOR = '|';

const encodeSourceOptionValue = (languageCode: string, channelId: string | null): string =>
  `${languageCode}${SOURCE_OPTION_SEPARATOR}${channelId ?? ''}`;

const decodeSourceOptionValue = (value: string): { channelId: string | null; languageCode: string } | null => {
  const separatorIndex = value.indexOf(SOURCE_OPTION_SEPARATOR);
  if (separatorIndex < 0) {
    return null;
  }
  const languageCode = value.slice(0, separatorIndex);
  const channelPart = value.slice(separatorIndex + 1);
  if (languageCode === '') {
    return null;
  }
  return { channelId: channelPart === '' ? null : channelPart, languageCode };
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DescriptionTranslationComponent,
    IgntAccordionBodyDirective,
    IgntAccordionComponent,
    IgntAccordionItemComponent,
    IgntAlertComponent,
    IgntButtonComponent,
    IgntButtonDropdownComponent,
    IgntIconComponent,
    IgntTagComponent,
    IgntTooltipDirective,
    TranslateModule,
    TranslationFieldCountBadgeComponent,
    TranslationTextFieldComponent,
  ],
  providers: [AiPlanTranslationSession],
  selector: 'app-plan-translations-editor',
  standalone: true,
  styleUrl: './plan-translations-editor.component.scss',
  templateUrl: './plan-translations-editor.component.html',
})
export class PlanTranslationsEditorComponent {
  readonly #aiSession = inject(AiPlanTranslationSession);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #injector = inject(Injector);
  readonly #editingPlanService = inject(EditingPlanService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #partnerService = inject(PartnerService);
  readonly #planTranslationsService = inject(PlanTranslationsService);
  readonly #planTranslationsStorageService = inject(PlanTranslationsStorageService);
  readonly #toastService = inject(ToastService);
  readonly #userService = inject(UserService);
  readonly #translateService = inject(TranslateService);
  readonly #uploadPlanImageService = inject(UploadPlanImageService);
  readonly #fzTracking = inject(FzTrackingService);

  readonly availableChannels: InputSignal<readonly PartnerChannel[]> = input<readonly PartnerChannel[]>([]);
  readonly availableLanguages: InputSignal<readonly AvailableLanguage[]> = input<readonly AvailableLanguage[]>([]);
  readonly canEditDefaultTranslations: InputSignal<boolean> = input<boolean>(false);
  readonly canManageChannelTranslations: InputSignal<boolean> = input<boolean>(false);
  readonly contentSchema: InputSignal<readonly Block[]> = input<readonly Block[]>([]);
  readonly defaultLanguage: InputSignal<AvailableLanguage | null> = input<AvailableLanguage | null>(null);
  readonly descriptionInherited: InputSignal<boolean> = input<boolean>(false);
  readonly descriptionSchemaId: InputSignal<string | null> = input<string | null>(null);
  readonly descriptionStatusByCode: InputSignal<DescriptionTranslationStatusMap> = input<DescriptionTranslationStatusMap>({});
  readonly hasComponentsDescription: InputSignal<boolean> = input<boolean>(false);
  readonly isDescriptionSchemaLoading: InputSignal<boolean> = input<boolean>(false);
  readonly originalLabelFormat: InputSignal<string> = input<string>('');
  readonly originalShortDescription: InputSignal<string> = input<string>('');
  readonly planSessionTypes: InputSignal<readonly PlanSessionType[]> = input<readonly PlanSessionType[]>([]);
  readonly previewContentSchema: InputSignal<readonly Block[]> = input<readonly Block[]>([]);
  readonly requiredPurchaseTermsSourceHtml: InputSignal<string> = input<string>('');
  readonly selectedChannelId: InputSignal<string | null> = input<string | null>(null);
  readonly selectedChannelName: InputSignal<string> = input<string>('');
  readonly selectedLanguage: InputSignal<AvailableLanguage | null> = input<AvailableLanguage | null>(null);
  readonly sessionTypes: InputSignal<readonly SessionTypeTranslationItem[]> = input<readonly SessionTypeTranslationItem[]>([]);
  readonly sessionTypeTranslationsByEntityId: InputSignal<ReadonlyMap<number, readonly SessionTypeTranslation[]>> = input<
    ReadonlyMap<number, readonly SessionTypeTranslation[]>
  >(new Map());
  readonly showTermsAndConditionsSection: InputSignal<boolean> = input<boolean>(false);
  readonly termsAndConditionsDraftsByKey: InputSignal<ReadonlyMap<string, string>> = input<ReadonlyMap<string, string>>(new Map());
  readonly termsAndConditionsTranslatedHtml: InputSignal<string> = input<string>('');
  readonly translations: InputSignal<readonly PlanTranslation[]> = input<readonly PlanTranslation[]>([]);
  readonly translationLanguageCatalog: InputSignal<ReadonlyArray<{ code: string }>> = input<ReadonlyArray<{ code: string }>>([]);
  readonly planTranslationLocales: InputSignal<readonly string[]> = input<readonly string[]>([]);

  readonly backToTranslations: OutputEmitterRef<void> = output<void>();
  readonly goToContent: OutputEmitterRef<void> = output<void>();
  readonly termsAndConditionsChanged: OutputEmitterRef<TermsAndConditionsChangePayload> = output<TermsAndConditionsChangePayload>();
  readonly translationChanged: OutputEmitterRef<PlanTranslation> = output<PlanTranslation>();
  readonly translationSaved: OutputEmitterRef<void> = output<void>();
  readonly saveFailed: OutputEmitterRef<void> = output<void>();

  readonly editedName: WritableSignal<string> = signal<string>('');
  readonly editedDescription: WritableSignal<string> = signal<string>('');
  readonly editedLabelFormat: WritableSignal<string> = signal<string>('');
  readonly editedShortDescription: WritableSignal<string> = signal<string>('');
  readonly editedSessionTypes: WritableSignal<EditedSessionType[]> = signal<EditedSessionType[]>([]);
  readonly editedTermsAndConditionsHtml: WritableSignal<string> = signal<string>('');

  readonly #descriptionUserEdits: WritableSignal<DescriptionTranslationOverlay> = signal<DescriptionTranslationOverlay>({});

  readonly #descriptionSavedEdits: WritableSignal<DescriptionTranslationOverlay> = signal<DescriptionTranslationOverlay>({});

  readonly #descriptionStatusOverrides: WritableSignal<Record<string, 'verified'>> = signal<Record<string, 'verified'>>({});

  readonly #seededOverlay: Signal<DescriptionTranslationOverlay> = computed<DescriptionTranslationOverlay>(() => {
    const schema = this.previewContentSchema();
    return schema.length === 0 ? {} : extractDescriptionTranslationOverlay(schema);
  });

  readonly descriptionOverlay: Signal<DescriptionTranslationOverlay> = computed<DescriptionTranslationOverlay>(() => ({
    ...this.#seededOverlay(),
    ...this.#descriptionSavedEdits(),
    ...this.#descriptionUserEdits(),
  }));

  readonly effectiveDescriptionStatusByCode: Signal<DescriptionTranslationStatusMap> = computed<DescriptionTranslationStatusMap>(() => ({
    ...this.descriptionStatusByCode(),
    ...this.#descriptionStatusOverrides(),
  }));
  readonly hasDescriptionBlocks: Signal<boolean> = computed<boolean>(
    () => this.hasComponentsDescription() && this.contentSchema().length > 0,
  );

  readonly selectedLanguageIsBase: Signal<boolean> = computed<boolean>(() => {
    const target = this.selectedLanguage()?.code;
    const base = this.defaultLanguage()?.code;
    if (target === undefined || base === undefined) {
      return false;
    }
    return planTranslationLanguageKeysEqual(target, base);
  });

  readonly isOriginalScope: Signal<boolean> = computed<boolean>(() => this.selectedLanguageIsBase() && this.selectedChannelId() === null);

  readonly hasChanges: WritableSignal<boolean> = signal<boolean>(false);
  readonly isSavePending: WritableSignal<boolean> = signal<boolean>(false);

  readonly isContentExpanded: WritableSignal<boolean> = signal<boolean>(true);
  readonly isTicketTypesExpanded: WritableSignal<boolean> = signal<boolean>(false);
  readonly isTermsAndConditionsExpanded: WritableSignal<boolean> = signal<boolean>(false);

  readonly selectedSourceLanguage: WritableSignal<AvailableLanguage | null> = signal<AvailableLanguage | null>(null);
  readonly selectedSourceChannelId: WritableSignal<string | null> = signal<string | null>(null);

  readonly uploadFileCallback = (file: File): Observable<string> => this.#uploadImage(file);

  #originalName = '';
  #originalDescription = '';
  #originalLabelFormat = '';
  #originalShortDescription = '';
  #originalSessionTypes: EditedSessionType[] = [];
  #sessionTypeHydrationBaseline: EditedSessionType[] = [];
  #lastHydratedChannel: string | null = null;
  #originalTermsAndConditionsHtml = '';
  #originalTermsAndConditionsDraft = '';
  #lastHydratedLang: string | null = null;

  readonly canEditPlan: Signal<boolean> = toSignal(this.#editingPlanService.observeCanEditPlan$(), { initialValue: false });

  readonly sourceTranslation: Signal<PlanTranslation | null> = computed<PlanTranslation | null>(() => {
    const source = this.selectedSourceLanguage();
    if (!source) {
      return null;
    }
    const sourceChannelId = this.selectedSourceChannelId();
    return findPlanTranslationRowForLanguageScope(this.translations(), source.code, sourceChannelId) ?? null;
  });
  readonly sourceName: Signal<string> = computed<string>(() => this.sourceTranslation()?.name ?? '');
  readonly sourceDescription: Signal<string> = computed<string>(() => this.sourceTranslation()?.description ?? '');
  readonly canManageLabelFormatTranslations: Signal<boolean> = computed<boolean>(() =>
    this.#userService.hasPermission(Permissions.CAN_MANAGE_LABEL_FORMAT_TRANSLATIONS),
  );
  readonly sourceLabelFormat: Signal<string> = computed<string>(() => {
    const fromTranslation = this.sourceTranslation()?.labelFormat ?? '';
    if (isPlanFieldPopulated('labelFormat', fromTranslation)) {
      return fromTranslation;
    }
    const source = this.selectedSourceLanguage();
    const defaultLang = this.defaultLanguage();
    if (
      source &&
      defaultLang &&
      planTranslationLanguageKeysEqual(source.code, defaultLang.code) &&
      this.selectedSourceChannelId() === null
    ) {
      return this.originalLabelFormat();
    }
    return '';
  });
  readonly sourceShortDescription: Signal<string> = computed<string>(() => {
    const fromTranslation = this.sourceTranslation()?.shortDescription ?? '';
    if (isPlanFieldPopulated('shortDescription', fromTranslation)) {
      return fromTranslation;
    }
    const source = this.selectedSourceLanguage();
    const defaultLang = this.defaultLanguage();
    if (
      source &&
      defaultLang &&
      planTranslationLanguageKeysEqual(source.code, defaultLang.code) &&
      this.selectedSourceChannelId() === null
    ) {
      return this.originalShortDescription();
    }
    return '';
  });

  readonly #isLabelFormatPopulatedInBase: Signal<boolean> = computed<boolean>(() =>
    isPlanFieldPopulated('labelFormat', this.originalLabelFormat()),
  );
  readonly #isShortDescriptionPopulatedInBase: Signal<boolean> = computed<boolean>(() =>
    isPlanFieldPopulated('shortDescription', this.originalShortDescription()),
  );

  readonly nameFieldStatus: Signal<FieldStatus> = computed<FieldStatus>(() =>
    isPlanFieldPopulated('name', this.editedName()) ? 'complete' : 'warning',
  );
  readonly descriptionFieldStatus: Signal<FieldStatus> = computed<FieldStatus>(() =>
    isPlanFieldPopulated('description', this.editedDescription()) ? 'complete' : 'warning',
  );
  readonly labelFormatFieldStatus: Signal<FieldStatus> = computed<FieldStatus>(() => {
    if (!this.#isLabelFormatPopulatedInBase()) {
      return 'none';
    }
    return isPlanFieldPopulated('labelFormat', this.editedLabelFormat()) ? 'complete' : 'warning';
  });
  readonly shortDescriptionFieldStatus: Signal<FieldStatus> = computed<FieldStatus>(() => {
    if (!this.#isShortDescriptionPopulatedInBase()) {
      return 'none';
    }
    return isPlanFieldPopulated('shortDescription', this.editedShortDescription()) ? 'complete' : 'warning';
  });

  readonly descriptionComponentCounts: Signal<DescriptionComponentCounts> = computed<DescriptionComponentCounts>(() => {
    if (!this.hasDescriptionBlocks()) {
      return { total: 0, translated: 0 };
    }
    if (this.isOriginalScope()) {
      return { total: 0, translated: 0 };
    }
    return countDescriptionComponentSlots(this.contentSchema(), this.descriptionOverlay(), this.effectiveDescriptionStatusByCode());
  });

  readonly eventPlanSlotCounts: Signal<ReturnType<typeof countPlanTranslationSlots>> = computed(() => {
    const usesDescriptionBlocks = this.hasDescriptionBlocks();
    const base = countPlanTranslationSlots(
      {
        description: usesDescriptionBlocks ? '' : this.editedDescription(),
        labelFormat: this.editedLabelFormat(),
        name: this.editedName(),
        shortDescription: this.editedShortDescription(),
      },
      {
        excludeDescription: usesDescriptionBlocks,
        originalLabelFormat: this.originalLabelFormat(),
        originalShortDescription: this.originalShortDescription(),
      },
    );
    if (!usesDescriptionBlocks) {
      return base;
    }
    const components = this.descriptionComponentCounts();
    return { total: base.total + components.total, translated: base.translated + components.translated };
  });
  readonly eventTotalCount: Signal<number> = computed<number>(() => this.eventPlanSlotCounts().total);
  readonly eventTranslatedCount: Signal<number> = computed<number>(() => this.eventPlanSlotCounts().translated);

  readonly #baseSessionTypesByEntityId: Signal<ReadonlyMap<number, { details: string; instructions: string }>> = computed<
    ReadonlyMap<number, { details: string; instructions: string }>
  >(() => {
    const result = new Map<number, { details: string; instructions: string }>();
    for (const planSessionType of this.planSessionTypes()) {
      result.set(planSessionType.id, {
        details: planSessionType.details ?? '',
        instructions: planSessionType.instructions ?? '',
      });
    }
    return result;
  });

  readonly ticketTypesSlotCounts: Signal<ReturnType<typeof countSessionTypeTranslationSlots>[]> = computed(() => {
    const baseByEntityId = this.#baseSessionTypesByEntityId();
    return this.editedSessionTypes().map((st: EditedSessionType) => {
      const base = baseByEntityId.get(st.entityId);
      return countSessionTypeTranslationSlots(
        {
          details: st.details,
          instructions: st.instructions,
          label: st.label,
        },
        {
          originalDetails: base?.details ?? '',
          originalInstructions: base?.instructions ?? '',
        },
      );
    });
  });
  readonly ticketTypesTotalCount: Signal<number> = computed<number>(() =>
    this.ticketTypesSlotCounts().reduce((sum: number, counts) => sum + counts.total, 0),
  );
  readonly ticketTypesTranslatedCount: Signal<number> = computed<number>(() =>
    this.ticketTypesSlotCounts().reduce((sum: number, counts) => sum + counts.translated, 0),
  );

  readonly isRequiredPurchaseTermsSourceMeaningful: Signal<boolean> = computed<boolean>(() =>
    isHtmlMeaningful(this.requiredPurchaseTermsSourceHtml()),
  );

  readonly isTermsAndConditionsSectionVisible: Signal<boolean> = computed<boolean>(
    () => this.showTermsAndConditionsSection() && this.isRequiredPurchaseTermsSourceMeaningful(),
  );

  readonly termsFieldStatus: Signal<FieldStatus> = computed<FieldStatus>(() => 'none');

  readonly sourceTermsAndConditionsHtml: Signal<string> = computed<string>(() => {
    const source = this.selectedSourceLanguage();
    if (!source) {
      return '';
    }
    const sourceChannelId = this.selectedSourceChannelId();
    const draftKey = buildTermsAndConditionsKey(source.code, sourceChannelId);
    const fromDraft = this.termsAndConditionsDraftsByKey().get(draftKey) ?? '';
    const defaultLang = this.defaultLanguage();
    const isDefaultLanguageOnDefaultChannel =
      defaultLang != null && planTranslationLanguageKeysEqual(source.code, defaultLang.code) && sourceChannelId === null;
    return resolveTermsAndConditionsDisplayHtml({
      isDefaultLanguageOnDefaultChannel,
      requiredPurchaseTermsSourceHtml: this.requiredPurchaseTermsSourceHtml(),
      termsAndConditionsTranslatedHtml: fromDraft,
    });
  });

  readonly totalCount: Signal<number> = computed<number>(() => this.eventTotalCount() + this.ticketTypesTotalCount());
  readonly translatedCount: Signal<number> = computed<number>(() => this.eventTranslatedCount() + this.ticketTypesTranslatedCount());

  readonly canSaveScope: Signal<boolean> = computed<boolean>(() => {
    if (!this.canEditPlan()) {
      return false;
    }
    return this.selectedChannelId() !== null ? this.canManageChannelTranslations() : this.canEditDefaultTranslations();
  });

  readonly isTermsAndConditionsFieldReadonly: Signal<boolean> = computed<boolean>(() => !this.canSaveScope());

  readonly isSaveEnabled: Signal<boolean> = computed<boolean>(
    () => this.canSaveScope() && this.#areEventRequiredFieldsComplete() && !this.#aiSession.isAnyGenerating(),
  );

  readonly #optimizelyUserData: Signal<void | undefined> = toSignal(this.#optimizelyService.observeUserData());
  readonly isAiEnabled: Signal<boolean> = computed<boolean>(() => {
    void this.#optimizelyUserData();
    return (
      this.canSaveScope() &&
      !this.isOriginalScope() &&
      this.#optimizelyService.isFeatureEnabled({ optimizelyFeatureKey: FeatureFlags.AI_TRANSLATIONS, team: 'b2b-platform' }) === true
    );
  });
  readonly sparkleIcon: [string, string] = AiPlanTranslationSession.sparkleIcon;
  readonly isTranslateAllEnabled: Signal<boolean> = computed<boolean>(() => {
    if (!this.isAiEnabled() || this.#aiSession.isAnyGenerating() || this.isSavePending()) {
      return false;
    }
    const content = this.#aiTranslateAllContent();
    return requestedAiTranslationTargetKeys(content.fields, content.sessionTypes).length > 0;
  });
  readonly #sourceSessionTypesByEntityId: Signal<ReadonlyMap<number, { details: string; instructions: string; label: string }>> = computed<
    ReadonlyMap<number, { details: string; instructions: string; label: string }>
  >(() => {
    const source = this.selectedSourceLanguage();
    const sourceChannelId = this.selectedSourceChannelId();
    const defaultLang = this.defaultLanguage();
    const isBaseDefaultScope =
      source !== null &&
      defaultLang !== null &&
      planTranslationLanguageKeysEqual(source.code, defaultLang.code) &&
      sourceChannelId === null;
    const sessionTypeTranslationsByEntityId = this.sessionTypeTranslationsByEntityId();
    const planSessionTypes = this.planSessionTypes();
    const result = new Map<number, { details: string; instructions: string; label: string }>();
    for (const planSessionType of planSessionTypes) {
      if (source === null) {
        result.set(planSessionType.id, { details: '', instructions: '', label: '' });
        continue;
      }
      const rows = sessionTypeTranslationsByEntityId.get(planSessionType.id) ?? [];
      const match = rows.find(
        (row: SessionTypeTranslation) => planTranslationLanguageKeysEqual(row.language, source.code) && row.channelId === sourceChannelId,
      );
      if (match !== undefined) {
        result.set(planSessionType.id, {
          details: match.details ?? '',
          instructions: match.instructions ?? '',
          label: match.label ?? '',
        });
        continue;
      }
      if (isBaseDefaultScope) {
        result.set(planSessionType.id, {
          details: planSessionType.details ?? '',
          instructions: planSessionType.instructions ?? '',
          label: planSessionType.label ?? '',
        });
        continue;
      }
      result.set(planSessionType.id, { details: '', instructions: '', label: '' });
    }
    return result;
  });

  readonly #sessionTypeTargetsByKey: Signal<ReadonlyMap<AiTranslationTargetKey, AiSessionTypeTarget>> = computed(() =>
    aiSessionTypeTargetsByKey(this.editedSessionTypes()),
  );

  readonly visibleSessionTypes: Signal<
    Array<{ aiFields: Readonly<Record<AiSessionTypeFieldKey, AiSessionTypeFieldView>>; index: number; sessionType: EditedSessionType }>
  > = computed(() => {
    const sourcesByEntityId = this.#sourceSessionTypesByEntityId();
    return this.editedSessionTypes().map((sessionType: EditedSessionType, index: number) => {
      const source = sourcesByEntityId.get(sessionType.entityId);
      return {
        aiFields: {
          details: this.#sessionTypeAiField(sessionType.entityId, 'details'),
          instructions: this.#sessionTypeAiField(sessionType.entityId, 'instructions'),
          label: this.#sessionTypeAiField(sessionType.entityId, 'label'),
        },
        index,
        sessionType: {
          ...sessionType,
          sourceDetails: source?.details ?? '',
          sourceInstructions: source?.instructions ?? '',
          sourceLabel: source?.label ?? '',
        },
      };
    });
  });

  readonly sourceOptions: Signal<IgntButtonDropdownOption<string>[]> = computed<IgntButtonDropdownOption<string>[]>(() => {
    const target = this.selectedLanguage();
    const targetChannelId = this.selectedChannelId();
    const base = this.defaultLanguage();
    const candidates = this.#buildSourceLanguageCandidates();
    const sortedChannels = [...this.availableChannels()].sort((a: PartnerChannel, b: PartnerChannel) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
    const isTargetTuple = (langCode: string, channelId: string | null): boolean =>
      target !== null && langCode === target.code && channelId === targetChannelId;
    const isBaseLanguage = (langCode: string): boolean => base !== null && langCode === base.code;
    const hasTupleContent = (langCode: string, channelId: string | null): boolean => {
      if (isBaseLanguage(langCode) && channelId === null) {
        return true;
      }
      const isNonEmpty = (value: string | null | undefined): boolean => (value ?? '').trim() !== '';
      const planMatch = this.translations().some(
        (translation: PlanTranslation) =>
          planTranslationLanguageKeysEqual(translation.language, langCode) &&
          translation.channelId === channelId &&
          (isNonEmpty(translation.name) ||
            isNonEmpty(translation.description) ||
            isNonEmpty(translation.labelFormat) ||
            isNonEmpty(translation.shortDescription)),
      );
      if (planMatch) {
        return true;
      }
      for (const rows of this.sessionTypeTranslationsByEntityId().values()) {
        if (
          rows.some(
            (row: SessionTypeTranslation) =>
              planTranslationLanguageKeysEqual(row.language, langCode) &&
              row.channelId === channelId &&
              (isNonEmpty(row.label) || isNonEmpty(row.details) || isNonEmpty(row.instructions)),
          )
        ) {
          return true;
        }
      }
      return false;
    };
    const options: IgntButtonDropdownOption<string>[] = [];
    for (const language of candidates) {
      const langLabel = planTranslationDisplayNameFromAvailableLanguage(language);
      if (!isTargetTuple(language.code, null) && hasTupleContent(language.code, null)) {
        options.push({
          label: langLabel,
          leadingIcon: null,
          value: encodeSourceOptionValue(language.code, null),
        });
      }
      for (const channel of sortedChannels) {
        if (isTargetTuple(language.code, channel.id)) {
          continue;
        }
        if (!hasTupleContent(language.code, channel.id)) {
          continue;
        }
        options.push({
          label: `${langLabel} (${channel.name})`,
          leadingIcon: null,
          value: encodeSourceOptionValue(language.code, channel.id),
        });
      }
    }
    return options;
  });

  readonly selectedSourceDisplay: Signal<string> = computed<string>(() => {
    const source = this.selectedSourceLanguage();
    let language = '';
    if (source) {
      language = planTranslationDisplayNameFromAvailableLanguage(source);
    } else {
      const fallback = this.defaultLanguage();
      language = fallback ? planTranslationDisplayNameFromAvailableLanguage(fallback) : '';
    }
    const channelId = this.selectedSourceChannelId();
    if (channelId === null) {
      return language;
    }
    const channelName = this.availableChannels().find((channel: PartnerChannel) => channel.id === channelId)?.name ?? '';
    if (channelName === '') {
      return language;
    }
    return `${language} (${channelName})`;
  });
  readonly selectedTargetLanguageDisplay: Signal<string> = computed<string>(() => {
    const target = this.selectedLanguage();
    const language = target ? planTranslationDisplayNameFromAvailableLanguage(target) : '';
    const channel = this.selectedChannelName().trim();
    if (language === '' || channel === '') {
      return language;
    }
    return `${language} (${channel})`;
  });

  constructor() {
    effect(() => {
      const targetCode = this.selectedLanguage()?.code ?? '';
      const channelId = this.selectedChannelId();
      void this.translations();
      void this.sessionTypes();
      const channelToken = channelId ?? NULL_CHANNEL_SCOPE_SENTINEL;
      const prevLang = this.#lastHydratedLang;
      const prevChannel = this.#lastHydratedChannel;
      const langChanged = prevLang === null || targetCode !== prevLang;
      const channelChanged = prevChannel === null || channelToken !== prevChannel;

      if (!langChanged && !channelChanged && untracked(() => this.hasChanges())) {
        return;
      }

      this.#lastHydratedLang = targetCode;
      this.#lastHydratedChannel = channelToken;
      this.#hydrateEditBuffer(targetCode, {
        preservePlanOptionalBaselines: prevLang !== null && !langChanged && !channelChanged,
      });
      if (langChanged || channelChanged) {
        this.#aiSession.reset();
      }
    });

    effect(() => {
      const pinned = this.selectedSourceChannelId();
      if (pinned === null) {
        return;
      }
      const stillAvailable = this.availableChannels().some((channel: PartnerChannel) => channel.id === pinned);
      if (stillAvailable) {
        return;
      }
      if (this.hasChanges()) {
        return;
      }
      untracked(() => {
        this.selectedSourceChannelId.set(null);
      });
    });

    effect(() => {
      const target = this.selectedLanguage();
      const base = this.defaultLanguage();
      const current = this.selectedSourceLanguage();
      const availableLanguages = this.availableLanguages();
      const desiredFallback = base ?? availableLanguages.find((lang: AvailableLanguage) => lang.code !== target?.code) ?? null;
      if (!current) {
        if (desiredFallback !== null) {
          untracked(() => this.selectedSourceLanguage.set(desiredFallback));
        }
        return;
      }
      const stillAvailable = availableLanguages.some((lang: AvailableLanguage) => lang.code === current.code);
      const hasChanges = this.hasChanges();
      if (!stillAvailable) {
        if (!hasChanges && desiredFallback !== null) {
          untracked(() => this.selectedSourceLanguage.set(desiredFallback));
        }
        return;
      }
      if (
        target &&
        current.code === target.code &&
        this.selectedSourceChannelId() === this.selectedChannelId() &&
        desiredFallback !== null &&
        !hasChanges
      ) {
        untracked(() => {
          this.selectedSourceLanguage.set(desiredFallback);
          this.selectedSourceChannelId.set(null);
        });
      }
    });
  }

  getSessionTypeDetailsStatus(entityId: number): FieldStatus {
    const base = this.#baseSessionTypesByEntityId().get(entityId);
    if (!base || !isSessionTypeFieldPopulated('details', base.details)) {
      return 'none';
    }
    const item = this.editedSessionTypes().find((st: EditedSessionType) => st.entityId === entityId);
    return item !== undefined && isSessionTypeFieldPopulated('details', item.details) ? 'complete' : 'warning';
  }

  getSessionTypeInstructionsStatus(entityId: number): FieldStatus {
    const base = this.#baseSessionTypesByEntityId().get(entityId);
    if (!base || !isSessionTypeFieldPopulated('instructions', base.instructions)) {
      return 'none';
    }
    const item = this.editedSessionTypes().find((st: EditedSessionType) => st.entityId === entityId);
    return item !== undefined && isSessionTypeFieldPopulated('instructions', item.instructions) ? 'complete' : 'warning';
  }

  isSessionTypeInstructionsPopulated(entityId: number): boolean {
    const item = this.editedSessionTypes().find((st: EditedSessionType) => st.entityId === entityId);
    return item !== undefined && isSessionTypeFieldPopulated('instructions', item.instructions);
  }

  getSessionTypeLabelStatus(entityId: number): FieldStatus {
    const item = this.editedSessionTypes().find((st: EditedSessionType) => st.entityId === entityId);
    if (!item) {
      return 'warning';
    }
    return isSessionTypeFieldPopulated('label', item.label) ? 'complete' : 'warning';
  }

  onBackClick(): void {
    if (this.#aiSession.isAnyGenerating()) {
      this.#confirmLeaveWhileGenerating(() => {
        this.#continueBack();
      });
      return;
    }
    this.#continueBack();
  }

  onDescriptionChange(value: string | null): void {
    this.editedDescription.set(value ?? '');
    this.#markAsChanged();
  }

  onDescriptionFieldChange(change: DescriptionFieldChange): void {
    this.#descriptionUserEdits.update((edits: DescriptionTranslationOverlay) => ({ ...edits, [change.key]: change.value }));
    // Emptying a field must drop its local `verified` mark, or the scope stays complete and saves the base-language copy.
    if (!isValuePresent(change.kind, change.value)) {
      this.#descriptionStatusOverrides.update((overrides: Record<string, 'verified'>) => {
        if (!(change.code in overrides)) {
          return overrides;
        }
        const remaining = { ...overrides };
        delete remaining[change.code];
        return remaining;
      });
    }
    this.#markAsChanged();
  }

  onDescriptionValidate(field: DescriptionField): void {
    this.#descriptionStatusOverrides.update((overrides: Record<string, 'verified'>) => ({
      ...overrides,
      [field.code]: 'verified',
    }));
    this.#markAsChanged();
  }

  onLabelFormatChange(value: string): void {
    this.editedLabelFormat.set(value);
    this.#markAsChanged();
  }

  onNameChange(value: string): void {
    this.editedName.set(value);
    this.#markAsChanged();
  }

  onSaveClick(): void {
    if (this.isSavePending() || this.#aiSession.isAnyGenerating()) {
      return;
    }
    this.isSavePending.set(true);
    this.#handleSaveRequest();
  }

  onSessionTypeDetailsChange(entityId: number, value: string): void {
    this.#updateSessionTypeField(entityId, 'details', value);
  }

  onSessionTypeInstructionsChange(entityId: number, value: string): void {
    this.#updateSessionTypeField(entityId, 'instructions', value);
  }

  onApplyInstructionsToAllClick(entityId: number, value: string): void {
    const overwriteCount = countTicketTypesWithNonEmptyInstructionsExceptOrigin(this.editedSessionTypes(), entityId);
    if (overwriteCount === 0) {
      this.#applyInstructionsToAll(entityId, value);
      return;
    }

    this.#dialogService
      .openModal<boolean, UnsavedChangesDialogData>(UnsavedChangesDialogComponent, {
        data: {
          acceptLabel: this.#translateService.instant('planEdition.translationsEdition.applyToAllTicketTypesModal.confirm'),
          cancelLabel: this.#translateService.instant('planEdition.translationsEdition.applyToAllTicketTypesModal.cancel'),
          message: this.#translateService.instant('planEdition.translationsEdition.applyToAllTicketTypesModal.message', {
            count: overwriteCount,
          }),
          title: this.#translateService.instant('planEdition.translationsEdition.applyToAllTicketTypesModal.title'),
        },
        disableCloseShortcuts: false,
        size: 'sm',
      })
      .closed$.pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((result?: boolean) => {
        if (result !== true) {
          return;
        }
        this.#applyInstructionsToAll(entityId, value);
      });
  }

  onSessionTypeLabelChange(entityId: number, value: string): void {
    this.#updateSessionTypeField(entityId, 'label', value);
  }

  onShortDescriptionChange(value: string): void {
    this.editedShortDescription.set(value);
    this.#markAsChanged();
  }

  onSparkleClick(key: AiTranslationTargetKey): void {
    if (!this.isAiEnabled() || this.isSavePending() || this.#aiSession.isAnyGenerating() || this.isSparkleDisabled(key)) {
      return;
    }
    const content = this.#aiSparkleContent(key);
    if (this.#aiSession.hasApplied(key)) {
      this.#confirmRetranslate(() => {
        this.#runAiTranslate(content, 'field');
      });
      return;
    }
    this.#runAiTranslate(content, 'field');
  }

  onTranslateAllClick(): void {
    if (!this.isTranslateAllEnabled()) {
      return;
    }
    const content = this.#aiTranslateAllContent();
    const keys = requestedAiTranslationTargetKeys(content.fields, content.sessionTypes);
    if (keys.some((key: AiTranslationTargetKey) => this.#aiSession.hasApplied(key))) {
      this.#confirmRetranslate(() => {
        this.#runAiTranslate(content, 'all');
      });
      return;
    }
    this.#runAiTranslate(content, 'all');
  }

  isSparkleDisabled(key: AiTranslationTargetKey): boolean {
    if (!this.isAiEnabled() || this.isSavePending() || this.#aiSession.isAnyGenerating()) {
      return true;
    }
    return !this.#isAiSourceMeaningful(key);
  }

  isSparkleLoading(key: AiTranslationTargetKey): boolean {
    return this.#aiSession.isGenerating(key);
  }

  showAiRating(key: AiTranslationTargetKey): boolean {
    return this.isAiEnabled() && this.#aiSession.hasApplied(key) && !this.#aiSession.isGenerating(key);
  }

  aiRating(key: AiTranslationTargetKey): AiTranslationRating | null {
    return this.#aiSession.ratingFor(key);
  }

  onAiRated(key: AiTranslationTargetKey, rating: AiTranslationRating): void {
    const generation = this.#aiSession.generationFor(key);
    const context = this.#aiTrackingContext();
    if (generation === null || this.#aiSession.ratingFor(key) !== null || context === null) {
      return;
    }
    const fieldType = this.#trackedFieldType(key);
    if (fieldType === null) {
      return;
    }
    this.#aiSession.rate(key, rating);
    this.#fzTracking.track(aiTranslateRate({ ...context, ...generation, fieldType, rating }));
  }

  onSourceSelected(value: string): void {
    const decoded = decodeSourceOptionValue(value);
    if (!decoded) {
      return;
    }
    if (decoded.languageCode === this.selectedLanguage()?.code && decoded.channelId === this.selectedChannelId()) {
      return;
    }
    const language = this.#buildSourceLanguageCandidates().find((lang: AvailableLanguage) => lang.code === decoded.languageCode);
    if (!language) {
      return;
    }
    if (decoded.channelId !== null && !this.availableChannels().some((channel: PartnerChannel) => channel.id === decoded.channelId)) {
      return;
    }
    this.selectedSourceLanguage.set(language);
    this.selectedSourceChannelId.set(decoded.channelId);
  }

  onTermsAndConditionsChange(value: string | null): void {
    this.editedTermsAndConditionsHtml.set(value ?? '');
    const language = this.selectedLanguage()?.code;
    if (language === undefined || language === '') {
      this.#markAsChanged();
      return;
    }
    this.termsAndConditionsChanged.emit({ channelId: this.selectedChannelId(), html: value ?? '', language });
    this.#markAsChanged();
  }

  toggleContentExpansion(): void {
    this.isContentExpanded.update((value: boolean) => !value);
  }

  toggleSessionTypeExpansion(entityId: number): void {
    this.editedSessionTypes.update((items: EditedSessionType[]) =>
      items.map((item: EditedSessionType) => (item.entityId === entityId ? { ...item, isExpanded: !item.isExpanded } : item)),
    );
  }

  toggleTermsAndConditionsExpansion(): void {
    this.isTermsAndConditionsExpanded.update((value: boolean) => !value);
  }

  toggleTicketTypesExpansion(): void {
    this.isTicketTypesExpanded.update((value: boolean) => !value);
  }

  #areAllSessionTypesValidForSave(): boolean {
    return areAllEditedSessionTypesValidForSave(
      this.editedSessionTypes(),
      this.#sessionTypeHydrationBaseline,
      this.selectedLanguage()?.code,
      this.selectedChannelId(),
      this.sessionTypeTranslationsByEntityId(),
    );
  }

  #areEventRequiredFieldsComplete(): boolean {
    if (this.isDescriptionSchemaLoading()) {
      return false;
    }
    const isNameComplete = isPlanFieldPopulated('name', this.editedName());
    if (this.descriptionInherited()) {
      return isNameComplete;
    }
    if (this.hasComponentsDescription()) {
      const counts = this.descriptionComponentCounts();
      return isNameComplete && counts.translated >= counts.total;
    }
    return isNameComplete && isPlanFieldPopulated('description', this.editedDescription());
  }

  #areRequiredFieldsComplete(): boolean {
    return this.#areEventRequiredFieldsComplete() && this.#areAllSessionTypesValidForSave();
  }

  #buildDescriptionTranslatedBlocks(): Block[] {
    return applyDescriptionTranslationOverlayWithFallback(this.contentSchema(), this.descriptionOverlay());
  }

  #buildSourceLanguageCandidates(): AvailableLanguage[] {
    const available = this.availableLanguages();
    const base = this.defaultLanguage();
    if (!base) {
      return [...available];
    }
    const withBase = available.some((lang: AvailableLanguage) => lang.code === base.code);
    return withBase ? [...available] : [base, ...available];
  }

  #handleSaveRequest(skipPendingCheck = false): void {
    const selectedLanguage = this.selectedLanguage();
    if (!this.canSaveScope() || selectedLanguage === null) {
      this.isSavePending.set(false);
      this.saveFailed.emit();
      return;
    }
    if (!skipPendingCheck && !this.#areRequiredFieldsComplete()) {
      this.#showPendingTranslationsModal();
      return;
    }
    this.#runPersistAndClose();
  }

  #hydrateEditBuffer(targetCode: string, options?: { preservePlanOptionalBaselines?: boolean }): void {
    const target = targetCode === '' ? null : targetCode;
    const channelId = this.selectedChannelId();
    const translation = target ? (findPlanTranslationRowForLanguageScope(this.translations(), target, channelId) ?? null) : null;
    const name = translation?.name ?? '';
    const description = centerTagToRichTextHtml(translation?.description ?? '');
    const labelFormat = translation?.labelFormat ?? '';
    const shortDescription = translation?.shortDescription ?? '';
    this.editedName.set(name);
    this.editedDescription.set(description);
    this.editedLabelFormat.set(labelFormat);
    this.editedShortDescription.set(shortDescription);
    this.#originalName = name;
    this.#originalDescription = description;
    if (options?.preservePlanOptionalBaselines) {
      this.#originalLabelFormat = this.#resolvePreservedOptionalBaseline(labelFormat, this.#originalLabelFormat);
      this.#originalShortDescription = this.#resolvePreservedOptionalBaseline(shortDescription, this.#originalShortDescription);
    } else {
      this.#originalLabelFormat = labelFormat;
      this.#originalShortDescription = shortDescription;
    }
    const previouslyExpanded = new Set<number>(
      untracked(() => this.editedSessionTypes())
        .filter((st: EditedSessionType) => st.isExpanded)
        .map((st: EditedSessionType) => st.entityId),
    );
    const sessionTypes: EditedSessionType[] = this.sessionTypes().map((st: SessionTypeTranslationItem) => ({
      details: centerTagToRichTextHtml(st.details ?? ''),
      displayName: st.displayName ?? '',
      entityId: st.entityId,
      instructions: centerTagToRichTextHtml(st.instructions ?? ''),
      isExpanded: previouslyExpanded.has(st.entityId),
      label: st.label ?? '',
      sourceDetails: '',
      sourceInstructions: '',
      sourceLabel: '',
    }));
    this.editedSessionTypes.set(sessionTypes);
    this.#originalSessionTypes = sessionTypes.map((st: EditedSessionType) => ({ ...st }));
    this.#syncSessionTypeHydrationBaseline();

    const termsHtml = this.termsAndConditionsTranslatedHtml();
    this.editedTermsAndConditionsHtml.set(termsHtml);
    this.#originalTermsAndConditionsHtml = termsHtml;
    this.#originalTermsAndConditionsDraft = target
      ? (this.termsAndConditionsDraftsByKey().get(buildTermsAndConditionsKey(target, channelId)) ?? '')
      : '';

    this.#descriptionUserEdits.set({});
    this.#descriptionSavedEdits.set({});
    this.#descriptionStatusOverrides.set({});

    this.hasChanges.set(false);
  }

  #resolvePreservedOptionalBaseline(incoming: string, baseline: string): string {
    if (isTranslationTextPopulated(incoming) || !isTranslationTextPopulated(baseline)) {
      return incoming;
    }
    return baseline;
  }

  #markAsChanged(): void {
    this.hasChanges.set(true);
  }

  #applyAiResult(
    result: AiTranslationResult,
    requested: AiTranslationRequest,
    origin: { isRetranslate: boolean; scope: AiTranslationScope },
  ): void {
    const { isRetranslate, scope } = origin;
    const requestedKeys = requestedAiTranslationTargetKeys(requested.fields, requested.sessionTypes);
    const usablePlanKeys = requestedAiTranslationFieldKeys(requested.fields).filter((key: AiTranslationFieldKey) =>
      this.#isUsableAiValue(key, result.fields[key]),
    );
    const sessionTypeValues = usableAiSessionTypeValues(result.sessionTypes);
    const usableKeys: readonly AiTranslationTargetKey[] = [
      ...usablePlanKeys,
      ...sessionTypeValues.map((sessionTypeValue: AiSessionTypeTranslatedValue) => sessionTypeValue.key),
    ];
    if (scope === 'field' && (usableKeys.length !== 1 || usableKeys[0] !== requestedKeys[0])) {
      this.#showAiError();
      return;
    }
    if (scope === 'all' && usableKeys.length === 0) {
      this.#showAiError();
      return;
    }
    for (const key of usablePlanKeys) {
      const value = result.fields[key];
      if (typeof value !== 'string') {
        continue;
      }
      this.#writeAiField(key, value);
    }
    if (usablePlanKeys.includes('mandatoryPurchaseTerms')) {
      this.isTermsAndConditionsExpanded.set(true);
    }
    this.#writeAiSessionTypeValues(sessionTypeValues);
    this.#aiSession.markApplied(usableKeys, {
      model: result.model,
      scope,
      translationOrderId: result.translationOrderId,
    });
    this.#trackAiGenerate(usableKeys, { isRetranslate, scope, translationOrderId: result.translationOrderId });
    this.#markAsChanged();
  }

  #confirmLeaveWhileGenerating(onConfirm: () => void): void {
    this.#dialogService
      .openModal<boolean, UnsavedChangesDialogData>(UnsavedChangesDialogComponent, {
        data: {
          acceptLabel: this.#translateService.instant('planEdition.translationsEdition.ai.leaveWhileGeneratingConfirm'),
          cancelLabel: this.#translateService.instant('planEdition.translationsEdition.ai.leaveWhileGeneratingCancel'),
          isDestructive: true,
          message: this.#translateService.instant('planEdition.translationsEdition.ai.leaveWhileGeneratingMessage'),
          title: this.#translateService.instant('planEdition.translationsEdition.ai.leaveWhileGeneratingTitle'),
        },
        disableCloseShortcuts: false,
        size: 'sm',
      })
      .closed$.pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((shouldLeave?: boolean) => {
        if (shouldLeave !== true) {
          return;
        }
        onConfirm();
      });
  }

  #confirmRetranslate(onConfirm: () => void): void {
    this.#dialogService
      .openModal<boolean, UnsavedChangesDialogData>(UnsavedChangesDialogComponent, {
        data: {
          acceptLabel: this.#translateService.instant('planEdition.translationsEdition.ai.retranslateConfirm'),
          cancelLabel: this.#translateService.instant('planEdition.translationsEdition.ai.retranslateCancel'),
          message: this.#translateService.instant('planEdition.translationsEdition.ai.retranslateMessage'),
          title: this.#translateService.instant('planEdition.translationsEdition.ai.retranslateTitle'),
        },
        disableCloseShortcuts: false,
        size: 'sm',
      })
      .closed$.pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((result?: boolean) => {
        if (result !== true) {
          return;
        }
        onConfirm();
      });
  }

  #continueBack(): void {
    if (!this.hasChanges()) {
      this.#leaveEditor();
      return;
    }
    if (!this.#areEventRequiredFieldsComplete()) {
      this.#showMissingRequiredFieldsModal();
      return;
    }
    if (!this.#areRequiredFieldsComplete()) {
      this.#showPendingTranslationsModal(true);
      return;
    }
    this.#showUnsavedChangesModal();
  }

  #leaveEditor(): void {
    this.#aiSession.cancel();
    this.backToTranslations.emit();
  }

  #isAiSourceMeaningful(key: AiTranslationTargetKey): boolean {
    const target = this.#sessionTypeTargetsByKey().get(key);
    if (target !== undefined) {
      return isSessionTypeFieldPopulated(target.field, this.#sessionTypeSourceValueFor(target));
    }
    if (!isAiTranslationFieldKey(key)) {
      return false;
    }
    return isAiTranslationSourceMeaningful(key, this.#sourceValueFor(key));
  }

  #isUsableAiValue(field: AiTranslationFieldKey, value: string | null | undefined): boolean {
    if (value === undefined || value === null) {
      return false;
    }
    return isAiTranslationSourceMeaningful(field, value);
  }

  #aiSourceFields(): AiTranslationFields {
    return {
      description: this.hasComponentsDescription() ? '' : this.sourceDescription(),
      labelFormat: this.canManageLabelFormatTranslations() ? this.sourceLabelFormat() : '',
      mandatoryPurchaseTerms: this.isTermsAndConditionsSectionVisible() ? this.sourceTermsAndConditionsHtml() : '',
      name: this.sourceName(),
      shortDescription: this.sourceShortDescription(),
    };
  }

  #aiSourceSessionTypes(): readonly AiSessionTypeTranslation[] {
    const sourcesByEntityId = this.#sourceSessionTypesByEntityId();
    return this.editedSessionTypes().map((sessionType: EditedSessionType) => ({
      fields: sourcesByEntityId.get(sessionType.entityId) ?? {},
      id: sessionType.entityId,
    }));
  }

  #aiSparkleContent(key: AiTranslationTargetKey): Pick<AiTranslationRequest, 'fields' | 'sessionTypes'> {
    const target = this.#sessionTypeTargetsByKey().get(key);
    if (target !== undefined) {
      return {
        fields: {},
        sessionTypes: [{ fields: { [target.field]: this.#sessionTypeSourceValueFor(target) }, id: target.sessionTypeId }],
      };
    }
    if (!isAiTranslationFieldKey(key)) {
      return { fields: {}, sessionTypes: [] };
    }
    return { fields: { [key]: this.#sourceValueFor(key) }, sessionTypes: [] };
  }

  #aiTranslateAllContent(): Pick<AiTranslationRequest, 'fields' | 'sessionTypes'> {
    return {
      fields: pickMeaningfulAiTranslationFields(this.#aiSourceFields()),
      sessionTypes: pickMeaningfulAiSessionTypes(this.#aiSourceSessionTypes()),
    };
  }

  #runAiTranslate(content: Pick<AiTranslationRequest, 'fields' | 'sessionTypes'>, scope: AiTranslationScope): void {
    const request = this.#toAiRequest(content);
    if (request === null) {
      return;
    }
    const keys = requestedAiTranslationTargetKeys(request.fields, request.sessionTypes);
    const isRetranslate = keys.some((key: AiTranslationTargetKey) => this.#aiSession.hasApplied(key));
    this.#trackAiRequest(keys, { isRetranslate, scope });
    this.#aiSession.start(
      request,
      (result: AiTranslationResult) => {
        this.#applyAiResult(result, request, { isRetranslate, scope });
      },
      () => {
        this.#showAiError();
      },
    );
  }

  #showAiError(): void {
    this.#toastService.addError(this.#translateService.instant('planEdition.translationsEdition.ai.error'));
  }

  #sessionTypeSourceValueFor(target: AiSessionTypeTarget): string {
    return this.#sourceSessionTypesByEntityId().get(target.sessionTypeId)?.[target.field] ?? '';
  }

  #sourceValueFor(field: AiTranslationFieldKey): string {
    const fields = this.#aiSourceFields();
    return fields[field] ?? '';
  }

  #toAiRequest(content: Pick<AiTranslationRequest, 'fields' | 'sessionTypes'>): AiTranslationRequest | null {
    const partnerId = this.#partnerService.getPartner()?.id;
    const planId = this.#editingPlanService.getSelectedPlanDetail()?.data?.id;
    const sourceLocale = this.selectedSourceLanguage()?.code;
    const targetLocale = this.selectedLanguage()?.code;
    const meaningful = pickMeaningfulAiTranslationFields(content.fields);
    const sessionTypes = pickMeaningfulAiSessionTypes(content.sessionTypes);
    if (
      partnerId === undefined ||
      planId === undefined ||
      planId === null ||
      sourceLocale === undefined ||
      targetLocale === undefined ||
      requestedAiTranslationTargetKeys(meaningful, sessionTypes).length === 0
    ) {
      return null;
    }
    return {
      fields: meaningful,
      partnerId,
      planId,
      sessionTypes,
      sourceLocale,
      targetLocale,
    };
  }

  #writeAiField(field: AiTranslationFieldKey, value: string): void {
    switch (field) {
      case 'name':
        this.editedName.set(value);
        break;
      case 'description':
        this.editedDescription.set(value);
        break;
      case 'shortDescription':
        this.editedShortDescription.set(value);
        break;
      case 'labelFormat':
        this.editedLabelFormat.set(value);
        break;
      case 'mandatoryPurchaseTerms':
        this.onTermsAndConditionsChange(value);
        break;
      default:
        break;
    }
  }

  #writeAiSessionTypeValues(values: readonly AiSessionTypeTranslatedValue[]): void {
    if (values.length === 0) {
      return;
    }
    for (const sessionTypeValue of values) {
      this.#updateSessionTypeField(
        sessionTypeValue.sessionTypeId,
        sessionTypeValue.field,
        isSessionTypeRichTextField(sessionTypeValue.field) ? centerTagToRichTextHtml(sessionTypeValue.value) : sessionTypeValue.value,
      );
    }
    this.editedSessionTypes.update((items: EditedSessionType[]) =>
      items.map((item: EditedSessionType) =>
        values.some((sessionTypeValue: AiSessionTypeTranslatedValue) => sessionTypeValue.sessionTypeId === item.entityId)
          ? { ...item, isExpanded: true }
          : item,
      ),
    );
    this.isTicketTypesExpanded.set(true);
  }

  #syncSessionTypeHydrationBaseline(): void {
    this.#sessionTypeHydrationBaseline = buildEditedSessionTypeHydrationBaseline(
      this.editedSessionTypes(),
      this.selectedLanguage()?.code,
      this.selectedChannelId(),
      this.sessionTypeTranslationsByEntityId(),
    );
  }

  #buildSessionTypeOptionalFieldForSave(
    field: 'details' | 'instructions',
    entityId: number,
    current: string,
    languageCode: string,
    channelId: string | null,
  ): string {
    const translations = this.sessionTypeTranslationsByEntityId().get(entityId) ?? [];
    const persisted = findSessionTypeTranslationForEditor(translations, languageCode, channelId);
    return normalizeRichTextHtmlForSave(resolveSessionTypeOptionalFieldForSave(field, current, persisted?.[field]));
  }

  #persistChanges(): Observable<PlanTranslation> {
    const partner = this.#partnerService.getPartner();
    const plan = this.#editingPlanService.getSelectedPlanDetail()?.data;
    const selectedLanguage = this.selectedLanguage();
    if (!partner || !plan || !selectedLanguage) {
      return EMPTY;
    }
    if (this.isDescriptionSchemaLoading()) {
      // Defense in depth: "Save and close anyway" reaches this directly, bypassing the completeness gate.
      return EMPTY;
    }

    const channelId = this.selectedChannelId();
    if (channelId !== null && !this.availableChannels().some((channel: PartnerChannel) => channel.id === channelId)) {
      this.#trackTranslationSaveError('configuration', { errorMessage: 'channel_unavailable', errorType: 'validation' });
      this.#toastService.add({
        autoHide: true,
        translationKey: 'planEdition.translationsEdition.saveError',
        type: ToastType.ERROR,
      });
      return EMPTY;
    }
    const usesComponents = this.hasComponentsDescription();
    // A component plan with no blocks still has the legacy single description: blanking it wipes the saved translation.
    const usesDescriptionBlocks = usesComponents && (this.hasDescriptionBlocks() || this.descriptionInherited());
    const contentSchema: Block[] | null = usesDescriptionBlocks
      ? this.descriptionInherited()
        ? []
        : this.#buildDescriptionTranslatedBlocks()
      : null;
    const translation: PlanTranslation = {
      channelId,
      description: usesDescriptionBlocks ? '' : normalizeRichTextHtmlForSave(this.editedDescription()),
      labelFormat: this.editedLabelFormat(),
      language: selectedLanguage.code,
      name: this.editedName(),
      shortDescription: this.editedShortDescription(),
      ...(contentSchema !== null ? { contentSchema } : {}),
    };
    const termsToPersist = this.#resolveMandatoryPurchaseTermsForSave();
    if (termsToPersist !== null) {
      translation.mandatoryPurchaseTerms = termsToPersist;
    }

    const completed = this.editedSessionTypes().filter((st: EditedSessionType) => {
      const baseline = this.#originalSessionTypes.find((item: EditedSessionType) => item.entityId === st.entityId);
      return shouldSaveEditedSessionType(baseline, st);
    });
    const toDelete = this.editedSessionTypes().filter((st: EditedSessionType) => {
      const original = this.#sessionTypeHydrationBaseline.find((item: EditedSessionType) => item.entityId === st.entityId);
      const translations = this.sessionTypeTranslationsByEntityId().get(st.entityId) ?? [];
      return shouldDeleteEditedSessionTypeForScope(original, st, translations, selectedLanguage.code, channelId);
    });

    return this.#planTranslationsService
      .savePlanTranslation(partner.id, plan.id, translation, {
        persisted: {
          labelFormat: this.#originalLabelFormat,
          shortDescription: this.#originalShortDescription,
        },
      })
      .pipe(
        switchMap(() => {
          const deleteReqs = toDelete.flatMap((st: EditedSessionType) =>
            findSessionTypeDeleteWireLanguageCodes(
              this.sessionTypeTranslationsByEntityId().get(st.entityId) ?? [],
              selectedLanguage.code,
              channelId,
            ).map((wireLanguageCode: string) =>
              this.#planTranslationsService.deleteSessionTypeTranslation(partner.id, plan.id, st.entityId, wireLanguageCode, channelId),
            ),
          );
          const saveReqs = completed.map((st: EditedSessionType) =>
            this.#planTranslationsService.saveSessionTypeTranslation(partner.id, plan.id, st.entityId, selectedLanguage.code, channelId, {
              details: this.#buildSessionTypeOptionalFieldForSave('details', st.entityId, st.details, selectedLanguage.code, channelId),
              instructions: this.#buildSessionTypeOptionalFieldForSave(
                'instructions',
                st.entityId,
                st.instructions,
                selectedLanguage.code,
                channelId,
              ),
              label: st.label,
            }),
          );
          const all = [...deleteReqs, ...saveReqs];
          return all.length === 0 ? of([]) : forkJoin(all);
        }),
        map(() => {
          this.#persistToStorage(plan.id, translation);
          this.#originalName = translation.name ?? '';
          this.#originalDescription = this.editedDescription();
          this.#originalLabelFormat = translation.labelFormat ?? '';
          this.#originalShortDescription = translation.shortDescription ?? '';
          this.#originalSessionTypes = this.editedSessionTypes().map((st: EditedSessionType) => ({ ...st }));
          this.#syncSessionTypeHydrationBaseline();
          this.#originalTermsAndConditionsHtml = this.editedTermsAndConditionsHtml();
          this.hasChanges.set(false);
          this.translationChanged.emit(translation);
          return translation;
        }),
      );
  }

  #persistToStorage(planId: number, translation: PlanTranslation): void {
    const existing = this.translations();
    const idx = findPlanTranslationRowIndexForLanguageScope(existing, translation.language, translation.channelId);
    const next = idx >= 0 ? [...existing.slice(0, idx), translation, ...existing.slice(idx + 1)] : [...existing, translation];
    this.#planTranslationsStorageService.saveTranslations(planId, next);
  }

  #resolveMandatoryPurchaseTermsForSave(): string | null {
    if (!this.showTermsAndConditionsSection()) {
      return null;
    }
    const editedHtml = this.editedTermsAndConditionsHtml();
    const edited = normalizeRichTextHtmlForSave(editedHtml);
    if (!isHtmlMeaningful(edited)) {
      return null;
    }
    // requiredPurchaseTermsSourceHtml still comes from the unmigrated Quill-based main-plan-settings
    // flow, so the verbatim-equality check needs the same legacy dialect to compare against it.
    if (transformQuillText(editedHtml) === this.requiredPurchaseTermsSourceHtml()) {
      return null;
    }
    return edited;
  }

  #restoreOriginalValues(): void {
    this.editedName.set(this.#originalName);
    this.editedDescription.set(this.#originalDescription);
    this.editedLabelFormat.set(this.#originalLabelFormat);
    this.editedShortDescription.set(this.#originalShortDescription);
    this.editedSessionTypes.set(this.#originalSessionTypes.map((st: EditedSessionType) => ({ ...st })));
    this.#syncSessionTypeHydrationBaseline();
    this.editedTermsAndConditionsHtml.set(this.#originalTermsAndConditionsHtml);
    this.#descriptionUserEdits.set({});
    this.#descriptionSavedEdits.set({});
    this.#descriptionStatusOverrides.set({});
    const language = this.selectedLanguage()?.code;
    if (language !== undefined && language !== '') {
      this.termsAndConditionsChanged.emit({ channelId: this.selectedChannelId(), html: this.#originalTermsAndConditionsDraft, language });
    }
    this.hasChanges.set(false);
  }

  #runPersistAndClose(): void {
    this.#aiSession.cancel();
    this.isSavePending.set(true);
    let persisted = false;
    this.#persistChanges()
      .pipe(
        finalize(() => this.isSavePending.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        complete: () => {
          if (!persisted) {
            this.saveFailed.emit();
          }
        },
        error: (error: unknown) => {
          this.saveFailed.emit();
          this.#trackTranslationSaveError('plan', { error });
          this.#toastService.add({
            autoHide: true,
            translationKey: 'planEdition.translationsEdition.saveError',
            type: ToastType.ERROR,
          });
        },
        next: () => {
          persisted = true;
          this.#trackTranslationSaved();
          this.#toastService.add({
            autoHide: true,
            translationKey: 'planEdition.translationsEdition.changesSaved',
            type: ToastType.SUCCESS,
          });
          this.translationSaved.emit();
          this.#leaveEditor();
        },
      });
  }

  #showMissingRequiredFieldsModal(): void {
    this.#dialogService
      .openModal<boolean, UnsavedChangesDialogData>(UnsavedChangesDialogComponent, {
        data: {
          acceptLabel: this.#translateService.instant('planEdition.translationsEdition.unsavedChangesModal.cancelButtonLabel'),
          cancelLabel: this.#translateService.instant('planEdition.translationsEdition.continueTranslating'),
          isDestructive: true,
          message: this.#translateService.instant('planEdition.translationsEdition.unsavedChangesModal.question'),
          title: this.#translateService.instant('planEdition.translationsEdition.unsavedChangesModal.title'),
        },
        disableCloseShortcuts: false,
      })
      .closed$.pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((shouldLeave?: boolean) => {
        if (shouldLeave !== true) {
          return;
        }
        this.#restoreOriginalValues();
        this.#leaveEditor();
      });
  }

  #showPendingTranslationsModal(fromBack = false): void {
    const title = this.#translateService.instant('planEdition.translationsEdition.pendingTranslationsModal.title');
    const message = this.#translateService.instant('planEdition.translationsEdition.pendingTranslationsModal.message');
    const saveAndCloseLabel = this.#translateService.instant('planEdition.translationsEdition.pendingTranslationsModal.saveAndCloseLabel');
    const modalRef = fromBack
      ? this.#dialogService.openModal<boolean, UnsavedChangesDialogData>(UnsavedChangesDialogComponent, {
          data: {
            acceptLabel: saveAndCloseLabel,
            cancelLabel: this.#translateService.instant('planEdition.translationsEdition.unsavedChangesModal.cancelButtonLabel'),
            message,
            title,
          },
          disableCloseShortcuts: false,
        })
      : openConfirmModalWithLabels(this.#dialogService, this.#injector, {
          cancelButton: this.#translateService.instant('planEdition.translationsEdition.continueTranslating'),
          message,
          okButton: saveAndCloseLabel,
          title,
        });
    modalRef.closed$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result?: boolean) => {
      if (result === true) {
        this.#runPersistAndClose();
        return;
      }
      if (fromBack && result === false) {
        this.#restoreOriginalValues();
        this.#leaveEditor();
        return;
      }
      this.isSavePending.set(false);
      if (!fromBack) {
        this.saveFailed.emit();
      }
    });
  }

  #showUnsavedChangesModal(): void {
    this.#dialogService
      .openModal<boolean, UnsavedChangesDialogData>(UnsavedChangesDialogComponent, {
        data: {
          acceptLabel: this.#translateService.instant('planEdition.translationsEdition.unsavedChangesModal.saveButtonLabel'),
          cancelLabel: this.#translateService.instant('planEdition.translationsEdition.unsavedChangesModal.cancelButtonLabel'),
          message: this.#translateService.instant('planEdition.translationsEdition.unsavedChangesModal.question'),
          title: this.#translateService.instant('planEdition.translationsEdition.unsavedChangesModal.title'),
        },
        disableCloseShortcuts: false,
      })
      .closed$.pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((shouldSave?: boolean) => {
        if (typeof shouldSave !== 'boolean') {
          return;
        }
        if (shouldSave) {
          if (!this.isSavePending()) {
            this.isSavePending.set(true);
            this.#handleSaveRequest(true);
          }
          return;
        }
        this.#restoreOriginalValues();
        this.#leaveEditor();
      });
  }

  #trackTranslationSaved(): void {
    const context = buildTranslationsTrackingContext(this.#partnerService, this.#editingPlanService);
    const selectedLanguage = this.selectedLanguage();
    if (!context || selectedLanguage === null) {
      return;
    }
    this.#fzTracking.track(
      saveTranslations({
        ...context,
        channelId: this.selectedChannelId(),
        languageCode: this.#wireLanguageCodeForTracking(selectedLanguage.code),
      }),
    );
  }

  #trackTranslationSaveError(
    field: string,
    details: { error: unknown } | { errorMessage: string; errorType: 'server' | 'validation' },
  ): void {
    const context = buildTranslationsTrackingContext(this.#partnerService, this.#editingPlanService);
    const selectedLanguage = this.selectedLanguage();
    trackTranslationsError(this.#fzTracking, context, {
      channelId: this.selectedChannelId(),
      field,
      languageCode: selectedLanguage ? this.#wireLanguageCodeForTracking(selectedLanguage.code) : null,
      operation: 'save',
      ...details,
    });
  }

  #aiTrackingContext(): (TranslationsContextData & { channelId: string | null; sourceLanguage: string; targetLanguage: string }) | null {
    const context = buildTranslationsTrackingContext(this.#partnerService, this.#editingPlanService);
    const sourceCode = this.selectedSourceLanguage()?.code;
    const targetCode = this.selectedLanguage()?.code;
    if (!context || sourceCode === undefined || targetCode === undefined) {
      return null;
    }
    return {
      ...context,
      channelId: this.selectedChannelId(),
      sourceLanguage: this.#wireLanguageCodeForTracking(sourceCode),
      targetLanguage: this.#wireLanguageCodeForTracking(targetCode),
    };
  }

  #applyInstructionsToAll(entityId: number, value: string): void {
    this.editedSessionTypes.update((items: EditedSessionType[]) => applyInstructionsToAllTicketTypesExceptOrigin(items, entityId, value));
    this.#markAsChanged();
  }

  #sessionTypeAiField(sessionTypeId: number, field: AiSessionTypeFieldKey): AiSessionTypeFieldView {
    const key = aiSessionTypeTargetKey(sessionTypeId, field);
    return {
      disabled: this.isSparkleDisabled(key),
      field,
      key,
      loading: this.isSparkleLoading(key),
      rating: this.aiRating(key),
      sessionTypeId,
      showRating: this.showAiRating(key),
    };
  }

  #trackAiGenerate(
    keys: readonly AiTranslationTargetKey[],
    origin: { isRetranslate: boolean; scope: AiTranslationScope; translationOrderId: string },
  ): void {
    const context = this.#aiTrackingContext();
    if (context === null) {
      return;
    }
    this.#fzTracking.track(aiTranslateGenerate({ ...context, ...origin, fieldTypes: this.#trackedFieldTypes(keys) }));
  }

  #trackAiRequest(keys: readonly AiTranslationTargetKey[], origin: { isRetranslate: boolean; scope: AiTranslationScope }): void {
    const context = this.#aiTrackingContext();
    if (context === null) {
      return;
    }
    this.#fzTracking.track(aiTranslateRequest({ ...context, ...origin, fieldTypes: this.#trackedFieldTypes(keys) }));
  }

  #trackedFieldType(key: AiTranslationTargetKey): AiTranslationTrackedFieldType | null {
    const target = this.#sessionTypeTargetsByKey().get(key);
    if (target !== undefined) {
      return aiSessionTypeTrackedFieldType(target.field);
    }
    return isAiTranslationFieldKey(key) ? key : null;
  }

  #trackedFieldTypes(keys: readonly AiTranslationTargetKey[]): readonly AiTranslationTrackedFieldType[] {
    const fieldTypes = keys.flatMap((key: AiTranslationTargetKey) => {
      const fieldType = this.#trackedFieldType(key);
      return fieldType === null ? [] : [fieldType];
    });
    return [...new Set(fieldTypes)];
  }

  #updateSessionTypeField(entityId: number, field: 'label' | 'details' | 'instructions', value: string): void {
    this.editedSessionTypes.update((items: EditedSessionType[]) =>
      items.map((item: EditedSessionType) => (item.entityId === entityId ? { ...item, [field]: value } : item)),
    );
    this.#markAsChanged();
  }

  #uploadImage(file: File): Observable<string> {
    const partner = this.#partnerService.getPartner();
    const plan = this.#editingPlanService.getSelectedPlanDetail()?.data;
    if (!partner || !plan) {
      return EMPTY;
    }
    return this.#uploadPlanImageService.uploadFile(partner.id, plan.id, file).pipe(
      map(response => {
        if (!response.data) {
          throw new Error((response.error as Error | null)?.message ?? 'Image upload failed');
        }
        return response.data.fileUrl;
      }),
    );
  }

  #wireLanguageCodeForTracking(canonicalCode: string): string {
    return planTranslationWireLanguageCodeForTracking(
      canonicalCode,
      this.#translationLanguageCatalogForTracking(),
      this.#wireHintSourceForTracking(),
    );
  }

  #translationLanguageCatalogForTracking(): ReadonlyArray<{ code: string }> {
    const catalog = this.translationLanguageCatalog();
    if (catalog.length > 0) {
      return catalog;
    }
    return this.availableLanguages().map((language: AvailableLanguage) => ({ code: language.code }));
  }

  #wireHintSourceForTracking(): PlanTranslationWireHintSource {
    return {
      planTranslations: this.translations(),
      sessionTypeTranslationsByEntityId: this.sessionTypeTranslationsByEntityId(),
      planTranslationLocales: this.planTranslationLocales(),
    };
  }
}

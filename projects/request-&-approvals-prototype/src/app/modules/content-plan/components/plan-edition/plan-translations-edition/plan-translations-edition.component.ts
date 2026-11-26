import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  OnInit,
  output,
  OutputEmitterRef,
  signal,
  Signal,
  untracked,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { Block } from '@fz-original/app/modules/content-plan/components/plan-edition/description-builder/models/block.model';
import { DescriptionTranslationStatusMap } from '@fz-original/app/modules/content-plan/components/plan-edition/plan-translations-edition/models/description-translation.model';
import { SessionTypeTranslationItem } from '@fz-original/app/modules/content-plan/components/plan-edition/plan-translations-edition/translation-content/translation-content.component';
import { PartnerChannel } from '@fz-original/app/modules/content-plan/models/partner-channels.model';
import { PlanSessionType } from '@fz-original/app/modules/content-plan/models/plan-session-types.model';
import { PlanTranslation, TranslationEntity } from '@fz-original/app/modules/content-plan/models/plan-translation.model';
import { SessionTypeTranslation } from '@fz-original/app/modules/content-plan/models/session-type-translation.model';
import { EditingPlanService } from '@fz-original/app/modules/content-plan/services/editing-plan/editing-plan.service';
import {
  ContentSchemaResult,
  EMPTY_CONTENT_SCHEMA_RESULT,
  PlanContentService,
} from '@fz-original/app/modules/content-plan/services/plan-content/plan-content.service';
import { PlanTranslationsService } from '@fz-original/app/modules/content-plan/services/plan-translations/plan-translations.service';
import { contentPlanTranslationsTrackingProvider } from '@fz-original/app/modules/content-plan/tracking/content-plan-translations.tracking-provider';
import { addTranslations } from '@fz-original/app/modules/content-plan/tracking/events/add-translations.event';
import { deleteTranslations } from '@fz-original/app/modules/content-plan/tracking/events/delete-translations.event';
import { viewTranslations } from '@fz-original/app/modules/content-plan/tracking/events/view-translations.event';
import { allowedChannelsForPlan } from '@fz-original/app/modules/content-plan/utils/allowed-channels.util';
import {
  descriptionComponentScopeKey,
  hasOverrideRow,
} from '@fz-original/app/modules/content-plan/utils/channel-translation-completeness.util';
import {
  isHtmlMeaningful,
  resolveTermsAndConditionsDisplayHtml,
} from '@fz-original/app/modules/content-plan/utils/default-translation-field-catalog';
import {
  buildTermsAndConditionsKey,
  computeDefaultTranslationFieldCounts,
  DefaultTranslationFieldCounts,
  DescriptionComponentCounts,
  TermsAndConditionsChangePayload,
} from '@fz-original/app/modules/content-plan/utils/default-translation-field-count.util';
import { buildDefaultTranslationSessionTypeItems } from '@fz-original/app/modules/content-plan/utils/default-translation-session-type-items.util';
import { openConfirmModalWithLabels } from '@fz-original/app/modules/content-plan/utils/open-confirm-modal-with-labels.util';
import {
  findPlanTranslationRowIndexForLanguageScope,
  planTranslationCatalogDisplayName,
  planTranslationLanguageKey,
  planTranslationLanguageKeysEqual,
  planTranslationWireHintsForCanonical,
  PlanTranslationWireHintSource,
  planTranslationWireLanguageCode,
  planTranslationWireLanguageCodeForTracking,
} from '@fz-original/app/modules/content-plan/utils/plan-translation-locale.util';
import { selectTranslatableSessionTypes } from '@fz-original/app/modules/content-plan/utils/select-translatable-session-types.util';
import { trackTranslationsError } from '@fz-original/app/modules/content-plan/utils/translations-error-tracking.util';
import { buildTranslationsTrackingContext } from '@fz-original/app/modules/content-plan/utils/translations-tracking.util';
import { MainPlanSettingsService } from '@fz-original/app/modules/event-settings/services/main-plan-settings.service';
import { planRequiresTermsAndConditions } from '@fz-original/app/modules/plan/plan-creation/components/utils/plan-content-completion.util';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { PlanDetail } from '@fz-original/app/shared/models/plan/plan-detail.model';
import { WithUnsavedChangesGuardComponent } from '@fz-original/app/shared/models/with-unsaved-changes-guard-component.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { AvailableLanguage } from '@fz-original/app/shared/translations/models/available-language.model';
import { TranslationLanguage } from '@fz-original/app/shared/translations/models/translation-language.model';
import { TranslationLanguagesService } from '@fz-original/app/shared/translations/services/translation-languages/translation-languages.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntDialogService } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, filter, finalize, forkJoin, map, Observable, of, Subject, switchMap, take, tap } from 'rxjs';

import { EditEntitySidebarComponent } from './edit-entity-sidebar/edit-entity-sidebar.component';
import { EditEntitySidebarDiscardModalConfig, EditEntitySidebarItem } from './edit-entity-sidebar/edit-entity-sidebar.model';
import { LanguageTab } from './language-tabs-bar/language-tab.model';
import { LanguageTabsBarComponent } from './language-tabs-bar/language-tabs-bar.component';
import { PlanTranslationsContentComponent } from './plan-translations-content/plan-translations-content.component';
import { PlanTranslationsEditorComponent } from './plan-translations-editor/plan-translations-editor.component';
import { TranslationChannelsComponent } from './translation-channels/translation-channels.component';
import { countDescriptionComponentSlots, extractDescriptionTranslationOverlay } from './utils/description-translation.adapter';

const NULL_CHANNEL_SCOPE_SENTINEL = '__null_channel__';

interface ConsolidatedLanguageDeletionResult {
  readonly language: string;
  readonly planRemoved: boolean;
  readonly sessionCleanupPartialFailure: boolean;
}

interface ConsolidatedChannelDeletionResult {
  readonly channelId: string;
  readonly planRemoved: boolean;
  readonly sessionCleanupPartialFailure: boolean;
}

interface OverrideRemovalResult {
  readonly hadPlanDelete: boolean;
  readonly planOk: boolean;
  readonly sessionsAttempted: number;
  readonly sessionsFailed: number;
}

interface PlanSessionTypesPayload {
  sessionTypes: readonly PlanSessionType[];
  translationsByEntityId: ReadonlyMap<number, readonly SessionTypeTranslation[]>;
}

interface EditLanguagesSidebarItem {
  code: string;
  isDefault: boolean;
  isSelected: boolean;
  name: string;
}

interface EditChannelsSidebarItem {
  id: string;
  isSelected: boolean;
  name: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    EditEntitySidebarComponent,
    IgntIconComponent,
    LanguageTabsBarComponent,
    PlanTranslationsContentComponent,
    PlanTranslationsEditorComponent,
    TranslateModule,
    TranslationChannelsComponent,
  ],
  providers: [...contentPlanTranslationsTrackingProvider()],
  selector: 'app-plan-translations-edition',
  standalone: true,
  styleUrl: './plan-translations-edition.component.scss',
  templateUrl: './plan-translations-edition.component.html',
})
export class PlanTranslationsEditionComponent implements OnInit, WithUnsavedChangesGuardComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #injector = inject(Injector);
  readonly #editingPlan = inject(EditingPlanService);
  readonly #mainPlanSettingsService = inject(MainPlanSettingsService);
  readonly #partnerService = inject(PartnerService);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #planContentService = inject(PlanContentService);
  readonly #planTranslationsService = inject(PlanTranslationsService);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);
  readonly #translationLanguagesService = inject(TranslationLanguagesService);
  readonly #userService = inject(UserService);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #reloadPayload$ = new Subject<void>();
  #lastViewTrackedPlanId: number | null = null;
  readonly #trackedChannelConfigurationAdds = new Set<string>();
  protected readonly languagesSidebar = viewChild<EditEntitySidebarComponent>('languagesSidebar');
  protected readonly channelsSidebar = viewChild<EditEntitySidebarComponent>('channelsSidebar');
  protected readonly translationsEditor = viewChild<PlanTranslationsEditorComponent>('translationsEditor');

  readonly saved: OutputEmitterRef<void> = output<void>();
  readonly saveFailed: OutputEmitterRef<void> = output<void>();
  #pendingTabSave = false;
  readonly #loading: WritableSignal<boolean> = signal<boolean>(false);
  readonly loading: Signal<boolean> = this.#loading.asReadonly();

  readonly baseLocale: WritableSignal<string> = signal<string>('');
  readonly baseLanguageCode: Signal<string> = computed<string>(() => planTranslationLanguageKey(this.baseLocale()));
  readonly canEditPlan: Signal<boolean> = toSignal(this.#editingPlan.observeCanEditPlan$(), { initialValue: false });
  readonly canEditDefaultTranslations: Signal<boolean> = computed<boolean>(
    () => this.canEditPlan() && this.#hasDefaultTranslationsPermission(),
  );
  readonly canManageChannelTranslations: Signal<boolean> = computed<boolean>(
    () => this.canEditPlan() && this.#hasChannelTranslationsPermission(),
  );
  readonly canManageLabelFormatTranslations: Signal<boolean> = computed<boolean>(() =>
    this.#userService.hasPermission(Permissions.CAN_MANAGE_LABEL_FORMAT_TRANSLATIONS),
  );
  readonly canManageLanguageRoster: Signal<boolean> = computed<boolean>(
    () => this.canEditDefaultTranslations() || (this.canManageChannelTranslations() && this.#allowedChannelIds().size > 0),
  );
  readonly planTranslationLocales: WritableSignal<readonly string[]> = signal<readonly string[]>([]);
  readonly #rawPlanTranslations: WritableSignal<readonly PlanTranslation[]> = signal<readonly PlanTranslation[]>([]);
  readonly #rawSessionTypeTranslationsByEntityId: WritableSignal<ReadonlyMap<number, readonly SessionTypeTranslation[]>> = signal<
    ReadonlyMap<number, readonly SessionTypeTranslation[]>
  >(new Map());
  readonly planTranslationLanguageCodes: Signal<readonly string[]> = computed<readonly string[]>(() => {
    const codesFromLocales = this.planTranslationLocales()
      .map((locale: string) => planTranslationLanguageKey(locale))
      .filter((code: string) => code !== '');
    const codesFromTranslations = this.#rawPlanTranslations()
      .filter((translation: PlanTranslation) => this.#isChannelInScope(translation.channelId))
      .map((translation: PlanTranslation) => planTranslationLanguageKey(translation.language))
      .filter((code: string) => code !== '');
    const codesFromSessionTypes = Array.from(this.#rawSessionTypeTranslationsByEntityId().values()).flatMap(
      (translations: readonly SessionTypeTranslation[]) =>
        translations
          .filter((item: SessionTypeTranslation) => !!item.language && this.#isChannelInScope(item.channelId))
          .map((item: SessionTypeTranslation) => planTranslationLanguageKey(item.language)),
    );
    return Array.from(new Set<string>([...codesFromLocales, ...codesFromTranslations, ...codesFromSessionTypes]));
  });
  readonly selectedLanguageCode: WritableSignal<string> = signal<string>('');
  readonly translationLanguages: WritableSignal<TranslationLanguage[]> = signal<TranslationLanguage[]>([]);
  readonly #planDetail: WritableSignal<PlanDetail | null> = signal<PlanDetail | null>(null);
  readonly #selectedPlanId: WritableSignal<number | null> = signal<number | null>(null);
  readonly #planSessionTypes: WritableSignal<readonly PlanSessionType[]> = signal<readonly PlanSessionType[]>([]);
  readonly #partnerAvailableChannels: WritableSignal<readonly PartnerChannel[]> = signal<readonly PartnerChannel[]>([]);
  readonly #allowedChannelIds: Signal<ReadonlySet<string>> = computed<ReadonlySet<string>>(() => {
    const detail = this.#planDetail();
    if (detail === null) {
      return new Set<string>();
    }
    const planChannelIds = (detail.channels ?? []).map(channel => channel.id);
    const sessionTypeChannelIds = this.#planSessionTypes().flatMap((sessionType: PlanSessionType) => sessionType.channels ?? []);
    const allowed = allowedChannelsForPlan(this.#partnerAvailableChannels(), planChannelIds, sessionTypeChannelIds);
    return new Set<string>(allowed.map((channel: PartnerChannel) => channel.id));
  });
  #isChannelInScope(channelId: string | null, includeDefault: boolean = true): boolean {
    if (channelId === null) {
      return includeDefault;
    }
    return this.#allowedChannelIds().has(channelId);
  }
  #lastPlanDetailId: number | null = null;
  #termsLoadGeneration = 0;
  #translationsByChannelDefaultApplied = false;
  readonly planDetail: Signal<PlanDetail | null> = this.#planDetail.asReadonly();
  readonly planOriginalLabelFormat: Signal<string> = computed<string>(() =>
    this.canManageLabelFormatTranslations() ? (this.#planDetail()?.labelFormat ?? '') : '',
  );
  readonly planSessionTypes: Signal<readonly PlanSessionType[]> = computed<readonly PlanSessionType[]>(() => {
    const detail = this.#planDetail();
    if (detail === null) {
      return [];
    }
    return selectTranslatableSessionTypes(detail.type ?? '', this.#planSessionTypes());
  });
  readonly planTranslations: Signal<readonly PlanTranslation[]> = computed<readonly PlanTranslation[]>(() =>
    this.#enrichTranslationsWithBaseDefault(this.#rawPlanTranslations()),
  );
  readonly sessionTypeTranslationsByEntityId: Signal<ReadonlyMap<number, readonly SessionTypeTranslation[]>> = computed<
    ReadonlyMap<number, readonly SessionTypeTranslation[]>
  >(() => this.#enrichSessionTypeTranslationsWithBaseDefault(this.planSessionTypes(), this.#rawSessionTypeTranslationsByEntityId()));
  readonly languageTabs: Signal<LanguageTab[]> = computed<LanguageTab[]>(() => this.#buildLanguageTabs());
  readonly selectedLanguageTab: Signal<LanguageTab | null> = computed<LanguageTab | null>(() => {
    const code = this.selectedLanguageCode();
    return this.languageTabs().find((tab: LanguageTab) => tab.code === code) ?? null;
  });
  readonly selectedLanguageName: Signal<string> = computed<string>(() => (this.selectedLanguageTab()?.name ?? '').trim());
  readonly selectedLanguageIsDefault: Signal<boolean> = computed<boolean>(() => this.selectedLanguageTab()?.isDefault ?? false);
  readonly selectedLanguageTotalFieldCount: Signal<number> = computed<number>(() => this.selectedLanguageTab()?.totalFieldCount ?? 0);
  readonly selectedLanguageTranslatedFieldCount: Signal<number> = computed<number>(
    () => this.selectedLanguageTab()?.translatedFieldCount ?? 0,
  );
  readonly selectedLanguageData: Signal<AvailableLanguage | null> = computed<AvailableLanguage | null>(() => {
    const tab = this.selectedLanguageTab();
    if (!tab) {
      return null;
    }
    return this.#toAvailableLanguage(tab);
  });
  readonly defaultLanguageData: Signal<AvailableLanguage | null> = computed<AvailableLanguage | null>(() => {
    const defaultTab = this.languageTabs().find((tab: LanguageTab) => tab.isDefault);
    if (!defaultTab) {
      return null;
    }
    return this.#toAvailableLanguage(defaultTab);
  });
  readonly availableLanguagesData: Signal<AvailableLanguage[]> = computed<AvailableLanguage[]>(() =>
    this.languageTabs().map((tab: LanguageTab) => this.#toAvailableLanguage(tab)),
  );
  readonly hasTranslations: Signal<boolean> = computed<boolean>(() => {
    if (this.#hasAnyPersistedTranslationRows()) {
      return true;
    }
    const codes = this.planTranslationLanguageCodes();
    const baseCode = this.baseLanguageCode();
    if (baseCode === '') {
      return codes.length > 0;
    }
    return codes.some((code: string) => code !== baseCode);
  });

  readonly isEditing: WritableSignal<boolean> = signal<boolean>(false);

  readonly #requiredPurchaseTermsSourceHtml: WritableSignal<string> = signal<string>('');
  readonly requiredPurchaseTermsSourceHtml: Signal<string> = this.#requiredPurchaseTermsSourceHtml.asReadonly();
  readonly #termsAndConditionsHtmlByKey: WritableSignal<ReadonlyMap<string, string>> = signal<ReadonlyMap<string, string>>(new Map());
  readonly termsAndConditionsHtmlByKey: Signal<ReadonlyMap<string, string>> = this.#termsAndConditionsHtmlByKey.asReadonly();
  readonly showTermsAndConditionsSection: Signal<boolean> = computed<boolean>(() => {
    const detail = this.planDetail();
    if (!detail) {
      return false;
    }
    return planRequiresTermsAndConditions({ type: detail.type ?? '' });
  });
  readonly selectedChannelId: WritableSignal<string | null> = signal<string | null>(null);

  readonly #isDescriptionLanguagePayloadLoading: WritableSignal<boolean> = signal<boolean>(false);
  readonly #isBaseChannelSchemaLoading: WritableSignal<boolean> = signal<boolean>(false);
  // inherited, so an imperative loading flag set in their pipe would lag a flush behind that flip.
  readonly #inheritedBaseLanguagePayloadResolvedGen: WritableSignal<string> = signal<string>('');
  readonly #inheritedBaseSchemaResolvedGen: WritableSignal<string> = signal<string>('');

  readonly #inheritedBaseSchemaGen: Signal<string> = computed<string>(
    () => `${this.descriptionChannelHasNoSchema()}:${this.#selectedPlanId()}:${this.#componentCountsReloadToken()}`,
  );
  readonly #inheritedBaseLanguagePayloadGen: Signal<string> = computed<string>(
    () =>
      `${this.descriptionChannelHasNoSchema()}:${this.#selectedPlanId()}:${this.selectedLanguageCode()}:${this.#componentCountsReloadToken()}`,
  );

  readonly isDescriptionSchemaLoading: Signal<boolean> = computed<boolean>(
    () =>
      this.#isDescriptionLanguagePayloadLoading() ||
      this.#isBaseChannelSchemaLoading() ||
      (this.descriptionChannelHasNoSchema() &&
        (this.#inheritedBaseSchemaResolvedGen() !== this.#inheritedBaseSchemaGen() ||
          this.#inheritedBaseLanguagePayloadResolvedGen() !== this.#inheritedBaseLanguagePayloadGen())),
  );

  readonly #descriptionLanguagePayload: Signal<ContentSchemaResult> = toSignal(
    toObservable(
      computed(() => ({
        channelId: this.selectedChannelId(),
        hasComponentsDescription: this.planDetail()?.hasComponentsDescription ?? false,
        language: this.selectedLanguageCode(),
        planId: this.#selectedPlanId(),
        // Read by nothing downstream: bumping it re-emits so the scope refetches through the invalidated cache.
        reloadToken: this.#componentCountsReloadToken(),
      })),
    ).pipe(
      tap(() => this.#isDescriptionLanguagePayloadLoading.set(true)),
      switchMap(({ channelId, hasComponentsDescription, language, planId }) => {
        const partnerId = this.#partnerService.getPartner()?.id;
        if (!hasComponentsDescription || planId === null || partnerId === undefined) {
          return of<ContentSchemaResult>(EMPTY_CONTENT_SCHEMA_RESULT);
        }
        const scopedLanguage = language !== '' && language !== this.baseLanguageCode() ? language : null;
        return this.#planContentService
          .getContentSchema(partnerId, planId, channelId, scopedLanguage)
          .pipe(catchError(() => of<ContentSchemaResult>(EMPTY_CONTENT_SCHEMA_RESULT)));
      }),
      // After `switchMap`: a request cancelled by a newer one never emits, so it can't clear the newer flag.
      tap(() => this.#isDescriptionLanguagePayloadLoading.set(false)),
    ),
    { initialValue: EMPTY_CONTENT_SCHEMA_RESULT },
  );

  readonly descriptionSchema: Signal<Block[]> = computed<Block[]>(() => this.#descriptionLanguagePayload().blocks);

  readonly descriptionStatusByCode: Signal<DescriptionTranslationStatusMap> = computed<DescriptionTranslationStatusMap>(
    () => this.#descriptionLanguagePayload().statusByCode,
  );

  readonly descriptionSchemaId: Signal<string | null> = computed<string | null>(() => this.#descriptionLanguagePayload().schemaId);

  /**
   * Base-language schema of the currently-selected channel, driving the editor's LEFT column.
   * `planDetail.contentSchema` can't stand in: it only carries the default channel's blocks.
   */
  readonly baseChannelSchema: Signal<Block[]> = toSignal(
    toObservable(
      computed(() => ({
        channelId: this.selectedChannelId(),
        hasComponentsDescription: this.planDetail()?.hasComponentsDescription ?? false,
        planId: this.#selectedPlanId(),
        reloadToken: this.#componentCountsReloadToken(),
      })),
    ).pipe(
      tap(() => this.#isBaseChannelSchemaLoading.set(true)),
      switchMap(({ channelId, hasComponentsDescription, planId }) => {
        const partnerId = this.#partnerService.getPartner()?.id;
        if (!hasComponentsDescription || planId === null || partnerId === undefined) {
          return of<Block[]>([]);
        }
        // Known limitation: a failed fetch is indistinguishable from a channel with no schema of its own.
        return this.#planContentService.getContentSchema(partnerId, planId, channelId, null).pipe(
          map((result: ContentSchemaResult) => result.blocks),
          catchError(() => of<Block[]>([])),
        );
      }),
      tap(() => this.#isBaseChannelSchemaLoading.set(false)),
    ),
    { initialValue: [] as Block[] },
  );

  readonly descriptionChannelHasNoSchema: Signal<boolean> = computed<boolean>(
    () =>
      this.selectedChannelId() !== null && (this.planDetail()?.hasComponentsDescription ?? false) && this.baseChannelSchema().length === 0,
  );

  readonly #inheritedBaseLanguagePayload: Signal<ContentSchemaResult> = toSignal(
    toObservable(
      computed(() => ({
        inherited: this.descriptionChannelHasNoSchema(),
        language: this.selectedLanguageCode(),
        planId: this.#selectedPlanId(),
        reloadToken: this.#componentCountsReloadToken(),
      })),
    ).pipe(
      switchMap(({ inherited, language, planId }) => {
        const partnerId = this.#partnerService.getPartner()?.id;
        const scopedLanguage = language !== '' && language !== this.baseLanguageCode() ? language : null;
        const source: Observable<ContentSchemaResult> =
          !inherited || planId === null || partnerId === undefined
            ? of<ContentSchemaResult>(EMPTY_CONTENT_SCHEMA_RESULT)
            : this.#planContentService
                .getContentSchema(partnerId, planId, null, scopedLanguage)
                .pipe(catchError(() => of<ContentSchemaResult>(EMPTY_CONTENT_SCHEMA_RESULT)));
        return source.pipe(tap(() => this.#inheritedBaseLanguagePayloadResolvedGen.set(this.#inheritedBaseLanguagePayloadGen())));
      }),
    ),
    { initialValue: EMPTY_CONTENT_SCHEMA_RESULT },
  );

  readonly #inheritedBaseSchema: Signal<Block[]> = toSignal(
    toObservable(
      computed(() => ({
        inherited: this.descriptionChannelHasNoSchema(),
        planId: this.#selectedPlanId(),
        reloadToken: this.#componentCountsReloadToken(),
      })),
    ).pipe(
      switchMap(({ inherited, planId }) => {
        const partnerId = this.#partnerService.getPartner()?.id;
        const source: Observable<Block[]> =
          !inherited || planId === null || partnerId === undefined
            ? of<Block[]>([])
            : this.#planContentService.getContentSchema(partnerId, planId, null, null).pipe(
                map((result: ContentSchemaResult) => result.blocks),
                catchError(() => of<Block[]>([])),
              );
        return source.pipe(tap(() => this.#inheritedBaseSchemaResolvedGen.set(this.#inheritedBaseSchemaGen())));
      }),
    ),
    { initialValue: [] as Block[] },
  );

  readonly effectiveBaseSchema: Signal<Block[]> = computed<Block[]>(() =>
    this.descriptionChannelHasNoSchema() ? this.#inheritedBaseSchema() : this.baseChannelSchema(),
  );

  readonly effectiveDescriptionSchema: Signal<Block[]> = computed<Block[]>(() =>
    this.descriptionChannelHasNoSchema() ? this.#inheritedBaseLanguagePayload().blocks : this.descriptionSchema(),
  );

  readonly effectiveDescriptionStatusByCode: Signal<DescriptionTranslationStatusMap> = computed<DescriptionTranslationStatusMap>(() =>
    this.descriptionChannelHasNoSchema() ? this.#inheritedBaseLanguagePayload().statusByCode : this.descriptionStatusByCode(),
  );

  readonly selectedScopeComponentCounts: Signal<DescriptionComponentCounts> = computed<DescriptionComponentCounts>(() => {
    if (!(this.planDetail()?.hasComponentsDescription ?? false)) {
      return { total: 0, translated: 0 };
    }
    // NOT `selectedLanguageIsDefault()`: it derives from `languageTabs`, whose counts read this signal back — a cycle.
    const baseCode = this.baseLanguageCode();
    const isBaseLanguage = baseCode !== '' && planTranslationLanguageKeysEqual(this.selectedLanguageCode(), baseCode);
    if (isBaseLanguage && this.selectedChannelId() === null) {
      return { total: 0, translated: 0 };
    }
    const baseSchema = this.effectiveBaseSchema();
    if (baseSchema.length === 0) {
      return { total: 0, translated: 0 };
    }
    return countDescriptionComponentSlots(
      baseSchema,
      extractDescriptionTranslationOverlay(this.effectiveDescriptionSchema()),
      this.effectiveDescriptionStatusByCode(),
    );
  });

  readonly #componentCountScopes: Signal<readonly { channelId: string | null; language: string }[]> = computed<
    readonly { channelId: string | null; language: string }[]
  >(() => {
    if (!(this.planDetail()?.hasComponentsDescription ?? false)) {
      return [];
    }
    const baseCode = this.baseLanguageCode();
    const languages = this.planTranslationLanguageCodes().filter((code: string) => code !== '' && code !== baseCode);
    if (languages.length === 0) {
      return [];
    }
    const channelScopes: (string | null)[] = [null, ...this.activeChannels()];
    const scopes: { channelId: string | null; language: string }[] = [];
    for (const channelId of channelScopes) {
      for (const language of languages) {
        scopes.push({ channelId, language });
      }
    }
    return scopes;
  });

  readonly #componentCountsReloadToken: WritableSignal<number> = signal<number>(0);

  /**
   * Per-component counts for EVERY (channel, language) scope the read screen needs, keyed by
   * {@link descriptionComponentScopeKey}; drives the per-language tab status and the channels panel.
   * Known limitation: a failed count request folds into `{ total: 0, translated: 0 }`, i.e. reads as translated.
   */
  readonly #componentCountsByScope: Signal<ReadonlyMap<string, DescriptionComponentCounts>> = toSignal(
    toObservable(
      computed(() => ({
        hasComponentsDescription: this.planDetail()?.hasComponentsDescription ?? false,
        planId: this.#selectedPlanId(),
        reloadToken: this.#componentCountsReloadToken(),
        scopes: this.#componentCountScopes(),
      })),
    ).pipe(
      switchMap(({ hasComponentsDescription, planId, scopes }) => {
        const partnerId = this.#partnerService.getPartner()?.id;
        if (!hasComponentsDescription || planId === null || partnerId === undefined || scopes.length === 0) {
          return of(new Map<string, DescriptionComponentCounts>());
        }
        const channelIds = [...new Set<string | null>(scopes.map(scope => scope.channelId))];
        return forkJoin(
          channelIds.map((channelId: string | null) =>
            this.#planContentService.getContentSchema(partnerId, planId, channelId, null).pipe(
              map((result: ContentSchemaResult) => ({ blocks: result.blocks, channelId })),
              catchError(() => of({ blocks: [] as Block[], channelId })),
            ),
          ),
        ).pipe(
          switchMap((bases: { blocks: Block[]; channelId: string | null }[]) => {
            const baseByChannel = new Map<string | null, Block[]>(bases.map(entry => [entry.channelId, entry.blocks]));
            const defaultChannelBase = baseByChannel.get(null) ?? [];
            const isInherited = (channelId: string | null): boolean =>
              channelId !== null && (baseByChannel.get(channelId) ?? []).length === 0;
            // A scope with no blocks must carry no entry at all: a `{0, 0}` one would read as fully translated.
            const blocksForScope = (channelId: string | null): Block[] =>
              isInherited(channelId) ? defaultChannelBase : (baseByChannel.get(channelId) ?? []);
            const countableScopes = scopes.filter(scope => blocksForScope(scope.channelId).length > 0);
            if (countableScopes.length === 0) {
              // `forkJoin([])` completes without emitting, leaving the signal on its previous, now stale, map.
              return of([] as { counts: DescriptionComponentCounts; key: string }[]);
            }
            return forkJoin(
              countableScopes.map(scope => {
                const fetchChannelId = isInherited(scope.channelId) ? null : scope.channelId;
                const baseBlocks = blocksForScope(scope.channelId);
                return this.#planContentService.getContentSchema(partnerId, planId, fetchChannelId, scope.language).pipe(
                  map((result: ContentSchemaResult) => ({
                    counts: countDescriptionComponentSlots(
                      baseBlocks,
                      extractDescriptionTranslationOverlay(result.blocks),
                      result.statusByCode,
                    ),
                    key: descriptionComponentScopeKey(scope.channelId, planTranslationLanguageKey(scope.language)),
                  })),
                  catchError(() =>
                    of({
                      counts: { total: 0, translated: 0 },
                      key: descriptionComponentScopeKey(scope.channelId, planTranslationLanguageKey(scope.language)),
                    }),
                  ),
                );
              }),
            );
          }),
          map((entries: { counts: DescriptionComponentCounts; key: string }[]) => {
            const next = new Map<string, DescriptionComponentCounts>();
            for (const entry of entries) {
              next.set(entry.key, entry.counts);
            }
            return next;
          }),
        );
      }),
    ),
    { initialValue: new Map<string, DescriptionComponentCounts>() },
  );

  readonly descriptionComponentCountsByScope: Signal<ReadonlyMap<string, DescriptionComponentCounts>> = computed<
    ReadonlyMap<string, DescriptionComponentCounts>
  >(() => {
    const base = this.#componentCountsByScope();
    if (!(this.planDetail()?.hasComponentsDescription ?? false)) {
      return base;
    }
    // Mid-load the selected scope's counts are a transient `{0, 0}` that completeness helpers read as "done".
    if (this.isDescriptionSchemaLoading()) {
      return base;
    }
    if (this.#selectedScopeFallsBackToLegacyDescription()) {
      return base;
    }
    const selectedKey = descriptionComponentScopeKey(this.selectedChannelId(), planTranslationLanguageKey(this.selectedLanguageCode()));
    const merged = new Map(base);
    merged.set(selectedKey, this.selectedScopeComponentCounts());
    return merged;
  });

  #selectedScopeFallsBackToLegacyDescription(): boolean {
    return this.effectiveBaseSchema().length === 0;
  }

  #descriptionComponentCountsFor(channelId: string | null, language: string): DescriptionComponentCounts | null {
    if (!(this.planDetail()?.hasComponentsDescription ?? false)) {
      return null;
    }
    return (
      this.descriptionComponentCountsByScope().get(descriptionComponentScopeKey(channelId, planTranslationLanguageKey(language))) ?? null
    );
  }

  readonly termsAndConditionsTranslatedHtmlForActiveScope: Signal<string> = computed<string>(() => {
    const language = this.selectedLanguageCode();
    if (language === '') {
      return '';
    }
    const channelId = this.selectedChannelId();
    const draft = this.termsAndConditionsHtmlByKey().get(buildTermsAndConditionsKey(language, channelId)) ?? '';
    if (!this.selectedLanguageIsDefault() || channelId !== null) {
      return draft;
    }
    return resolveTermsAndConditionsDisplayHtml({
      isDefaultLanguageOnDefaultChannel: true,
      requiredPurchaseTermsSourceHtml: this.requiredPurchaseTermsSourceHtml(),
      termsAndConditionsTranslatedHtml: draft,
    });
  });
  readonly translationsByChannelEnabled: WritableSignal<boolean> = signal<boolean>(false);
  readonly showTranslationsByChannelToggle: Signal<boolean> = computed<boolean>(() => this.#allowedChannelIds().size > 0);
  readonly #manuallyAddedChannels: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(new Set());
  readonly activeChannels: Signal<readonly string[]> = computed<readonly string[]>(() => {
    const allowed = this.#allowedChannelIds();
    const ids = new Set<string>();
    for (const translation of this.planTranslations()) {
      if (translation.channelId !== null && allowed.has(translation.channelId)) {
        ids.add(translation.channelId);
      }
    }
    for (const id of this.#manuallyAddedChannels()) {
      if (allowed.has(id)) {
        ids.add(id);
      }
    }
    return Array.from(ids);
  });
  readonly availableChannels: Signal<readonly PartnerChannel[]> = computed<readonly PartnerChannel[]>(() => {
    const allowed = this.#allowedChannelIds();
    const filtered = this.#partnerAvailableChannels().filter((channel: PartnerChannel) => allowed.has(channel.id));
    return filtered.sort((a: PartnerChannel, b: PartnerChannel) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  });
  readonly selectedChannelName: Signal<string> = computed<string>(() => {
    const id = this.selectedChannelId();
    if (id === null) {
      return '';
    }
    return this.availableChannels().find((channel: PartnerChannel) => channel.id === id)?.name ?? '';
  });

  readonly showEditLanguagesSidebar: WritableSignal<boolean> = signal<boolean>(false);
  readonly #selectedLanguagesInMemory: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(new Set());
  readonly #initialSelectedLanguagesInMemory: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(new Set());
  readonly #serverLanguageCodes: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(new Set());
  readonly #locallySavedLanguageCodes: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(new Set());
  readonly allLanguagesForSidebar: Signal<readonly EditLanguagesSidebarItem[]> = computed<readonly EditLanguagesSidebarItem[]>(() =>
    this.#buildSidebarLanguageItems(),
  );

  readonly searchQuery: WritableSignal<string> = signal<string>('');

  readonly hasLanguageChanges: Signal<boolean> = computed<boolean>(() => {
    const selected = this.#selectedLanguagesInMemory();
    const initial = this.#initialSelectedLanguagesInMemory();
    if (selected.size !== initial.size) {
      return true;
    }
    for (const code of selected) {
      if (!initial.has(code)) {
        return true;
      }
    }
    return false;
  });

  protected readonly languagesSidebarItemsForComponent: Signal<readonly EditEntitySidebarItem[]> = computed<
    readonly EditEntitySidebarItem[]
  >(() =>
    this.allLanguagesForSidebar().map(
      (item: EditLanguagesSidebarItem): EditEntitySidebarItem => ({
        id: item.code,
        isLocked: item.isDefault,
        isSelected: item.isSelected,
        lockedBadgeLabel: item.isDefault ? this.#translateService.instant('planEdition.translationsEdition.defaultBadge') : undefined,
        lockedTooltip: item.isDefault
          ? this.#translateService.instant('planEdition.translationsEdition.defaultLanguageCannotRemove')
          : undefined,
        name: item.name,
      }),
    ),
  );

  protected readonly sidebarDiscardConfig: Signal<EditEntitySidebarDiscardModalConfig> = computed<EditEntitySidebarDiscardModalConfig>(
    () => ({
      cancelButtonLabel: this.#translateService.instant('planEdition.translationsEdition.unsavedChangesModal.cancelButtonLabel'),
      question: this.#translateService.instant('planEdition.translationsEdition.unsavedChangesModal.question'),
      saveButtonLabel: this.#translateService.instant('planEdition.translationsEdition.unsavedChangesModal.saveButtonLabel'),
      title: this.#translateService.instant('planEdition.translationsEdition.unsavedChangesModal.title'),
    }),
  );

  protected readonly sidebarDialogTranslations: Signal<{ cancelButton: string; closeAriaLabel: string }> = computed<{
    cancelButton: string;
    closeAriaLabel: string;
  }>(() => ({
    cancelButton: this.#translateService.instant('planEdition.translationsEdition.cancel'),
    closeAriaLabel: this.#translateService.instant('common.close'),
  }));

  readonly showEditChannelsSidebar: WritableSignal<boolean> = signal<boolean>(false);
  readonly #selectedChannelsInMemory: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(new Set());
  readonly #initialSelectedChannelsInMemory: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(new Set());
  readonly channelsSearchQuery: WritableSignal<string> = signal<string>('');
  readonly allChannelsForSidebar: Signal<readonly EditChannelsSidebarItem[]> = computed<readonly EditChannelsSidebarItem[]>(() =>
    this.#buildSidebarChannelItems(),
  );
  readonly hasChannelsChanges: Signal<boolean> = computed<boolean>(() => {
    const selected = this.#selectedChannelsInMemory();
    const initial = this.#initialSelectedChannelsInMemory();
    if (selected.size !== initial.size) {
      return true;
    }
    for (const id of selected) {
      if (!initial.has(id)) {
        return true;
      }
    }
    return false;
  });

  protected readonly channelsSidebarItemsForComponent: Signal<readonly EditEntitySidebarItem[]> = computed<
    readonly EditEntitySidebarItem[]
  >(() =>
    this.allChannelsForSidebar().map(
      (item: EditChannelsSidebarItem): EditEntitySidebarItem => ({
        id: item.id,
        isSelected: item.isSelected,
        name: item.name,
      }),
    ),
  );

  readonly sessionTypesForEditor: Signal<SessionTypeTranslationItem[]> = computed<SessionTypeTranslationItem[]>(() =>
    buildDefaultTranslationSessionTypeItems({
      channelId: this.selectedChannelId(),
      language: this.selectedLanguageCode(),
      planSessionTypes: this.planSessionTypes(),
      sessionTypeTranslationsByEntityId: this.sessionTypeTranslationsByEntityId(),
    }),
  );

  closeEditChannelsSidebar(): void {
    const sidebar = this.channelsSidebar();
    if (sidebar?.isOpen()) {
      sidebar.close();
      return;
    }
    this.#syncChannelsSidebarStateOnClose();
  }

  closeEditLanguagesSidebar(): void {
    const sidebar = this.languagesSidebar();
    if (sidebar?.isOpen()) {
      sidebar.close();
      return;
    }
    this.#syncLanguagesSidebarStateOnClose();
  }

  constructor() {
    effect(() => {
      const allowed = this.#allowedChannelIds();
      const detail = this.#planDetail();
      if (detail === null) {
        return;
      }
      if (untracked(() => this.isEditing())) {
        return;
      }
      untracked(() => {
        const currentId = this.selectedChannelId();
        if (currentId !== null && !allowed.has(currentId)) {
          this.selectedChannelId.set(null);
        }
        if (allowed.size === 0 && this.#partnerAvailableChannels().length > 0 && this.translationsByChannelEnabled() === true) {
          this.translationsByChannelEnabled.set(false);
        }
        if (allowed.size > 0 && !this.#translationsByChannelDefaultApplied) {
          this.#translationsByChannelDefaultApplied = true;
          this.translationsByChannelEnabled.set(true);
        }
        const selectedBeforePrune = this.#selectedChannelsInMemory();
        this.#pruneSet(this.#manuallyAddedChannels, (id: string) => allowed.has(id));
        this.#pruneSet(this.#selectedChannelsInMemory, (id: string) => allowed.has(id));
        this.#pruneSet(this.#initialSelectedChannelsInMemory, (id: string) => allowed.has(id) || !selectedBeforePrune.has(id));
      });
    });
  }

  areChangesUnsaved(): boolean {
    if (this.loading()) {
      return false;
    }
    if (this.hasLanguageChanges() || this.hasChannelsChanges() || this.#hasUnsavedLanguageAdditions()) {
      return true;
    }
    if (!this.isEditing()) {
      return false;
    }
    return this.translationsEditor()?.hasChanges() ?? false;
  }

  #hasUnsavedLanguageAdditions(): boolean {
    const serverCodes = this.#serverLanguageCodes();
    const locallySavedCodes = this.#locallySavedLanguageCodes();
    const baseCode = this.baseLanguageCode();
    return this.planTranslationLocales().some((locale: string) => {
      const code = planTranslationLanguageKey(locale);
      return code !== baseCode && !serverCodes.has(code) && !locallySavedCodes.has(code);
    });
  }

  saveCurrentTab(): boolean {
    const editor = this.translationsEditor();
    if (this.isEditing() && (editor?.hasChanges() ?? false)) {
      this.#pendingTabSave = true;
      editor?.onSaveClick();
      return true;
    }
    return false;
  }

  onEditorSaveFailed(): void {
    if (this.#pendingTabSave) {
      this.#pendingTabSave = false;
      this.saveFailed.emit();
    }
  }

  #pruneSet(target: WritableSignal<ReadonlySet<string>>, keepFn: (id: string) => boolean): void {
    const current = target();
    const next = new Set<string>();
    let changed = false;
    for (const id of current) {
      if (keepFn(id)) {
        next.add(id);
      } else {
        changed = true;
      }
    }
    if (changed) {
      target.set(next);
    }
  }

  ngOnInit(): void {
    // Fresh page entry: the schema cache only dedupes within a visit, so this visit must refetch.
    this.#planContentService.invalidateContentSchemaCache();
    this.#loadTranslationLanguages();
    this.#subscribeToSelectedPlanDetail();
    this.#subscribeToSelectedPlanPayload();
    this.#reloadPayload$
      .pipe(
        tap(() => {
          const planId = this.#selectedPlanId();
          if (planId !== null) {
            this.#planContentService.invalidateContentSchemaCache(planId);
          }
        }),
        switchMap(() => this.#reloadPlanTranslations()),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  onBackToTranslations(): void {
    this.isEditing.set(false);
  }

  onChannelSelected(channelId: string | null): void {
    this.selectedChannelId.set(channelId);
  }

  onChannelsSearchQueryChange(value: string | number | null | undefined): void {
    if (value === null || value === undefined) {
      this.channelsSearchQuery.set('');
      return;
    }
    this.channelsSearchQuery.set(String(value));
  }

  onChannelsSidebarClosed(): void {
    this.#syncChannelsSidebarStateOnClose();
  }

  onEditChannelsClick(): void {
    if (!this.canManageChannelTranslations()) {
      return;
    }
    const current = new Set(this.activeChannels());
    this.#selectedChannelsInMemory.set(current);
    this.#initialSelectedChannelsInMemory.set(new Set(current));
    this.channelsSearchQuery.set('');
    this.showEditChannelsSidebar.set(true);
    this.channelsSidebar()?.open();
  }

  goToContent(): void {
    this.#router.navigate(['../content-edit'], { relativeTo: this.#route, queryParamsHandling: 'preserve' });
  }

  onEditClick(): void {
    const onChannel = this.selectedChannelId() !== null;
    const allowed = onChannel ? this.canManageChannelTranslations() : this.canEditDefaultTranslations();
    if (!allowed) {
      return;
    }
    if (this.selectedLanguageIsDefault() && !onChannel) {
      return;
    }
    this.isEditing.set(true);
  }

  onEditLanguagesClick(): void {
    const current = new Set(this.#currentEnabledLanguageCodes());
    this.#selectedLanguagesInMemory.set(current);
    this.#initialSelectedLanguagesInMemory.set(new Set(current));
    this.searchQuery.set('');
    this.showEditLanguagesSidebar.set(true);
    this.languagesSidebar()?.open();
  }

  onLanguagesSidebarClosed(): void {
    this.#syncLanguagesSidebarStateOnClose();
  }

  onRemoveOverrideClick(): void {
    if (!this.canManageChannelTranslations()) {
      return;
    }
    const channelId = this.selectedChannelId();
    const language = this.selectedLanguageCode();
    if (channelId === null || language === '') {
      return;
    }
    if (!this.#overrideExists(channelId, language)) {
      return;
    }
    this.#openRemoveOverrideConfirmation(channelId, language);
  }

  onSearchQueryChange(value: string | number | null | undefined): void {
    if (value === null || value === undefined) {
      this.searchQuery.set('');
      return;
    }
    this.searchQuery.set(String(value));
  }

  onTermsAndConditionsChanged(event: TermsAndConditionsChangePayload): void {
    if (event.language === '') {
      return;
    }
    const key = buildTermsAndConditionsKey(event.language, event.channelId);
    const next = new Map(this.#termsAndConditionsHtmlByKey());
    if (!isHtmlMeaningful(event.html)) {
      next.delete(key);
    } else {
      next.set(key, event.html);
    }
    this.#termsAndConditionsHtmlByKey.set(next);
  }

  onTranslationChanged(updated: PlanTranslation): void {
    const existing = this.#rawPlanTranslations();
    const index = findPlanTranslationRowIndexForLanguageScope(existing, updated.language, updated.channelId);
    if (index >= 0) {
      const next = [...existing];
      next[index] = { ...updated };
      this.#rawPlanTranslations.set(next);
      return;
    }
    this.#rawPlanTranslations.set([...existing, { ...updated }]);
  }

  onTranslationSaved(): void {
    this.#trackChannelConfigurationAddedAfterEditorSave();
    this.#componentCountsReloadToken.update((token: number) => token + 1);
    this.#markSelectedLanguagePersisted();
    this.#reloadPayload$.next();
    if (this.#pendingTabSave) {
      this.#pendingTabSave = false;
      this.saved.emit();
    }
  }

  #markSelectedLanguagePersisted(): void {
    const code = this.selectedLanguageCode();
    if (code === '' || this.#serverLanguageCodes().has(code) || this.#locallySavedLanguageCodes().has(code)) {
      return;
    }
    this.#locallySavedLanguageCodes.set(new Set(this.#locallySavedLanguageCodes()).add(code));
  }

  onTranslationsByChannelToggle(enabled: boolean): void {
    if (enabled && !this.showTranslationsByChannelToggle()) {
      return;
    }
    this.translationsByChannelEnabled.set(enabled);
    if (!enabled) {
      this.selectedChannelId.set(null);
    }
  }

  saveChannelsInSidebar(): void {
    if (!this.canManageChannelTranslations()) {
      this.channelsSidebar()?.resetSavePending();
      return;
    }
    const selected = new Set(this.#selectedChannelsInMemory());
    const initial = new Set(this.#initialSelectedChannelsInMemory());
    const added = [...selected].filter((id: string) => !initial.has(id));
    const removed = [...initial].filter((id: string) => !selected.has(id));
    if (added.length === 0 && removed.length === 0) {
      this.closeEditChannelsSidebar();
      return;
    }
    if (removed.length > 0) {
      this.#openRemoveChannelsConfirmation(added, removed);
      return;
    }
    this.#applyChannelsSelection(added, removed);
  }

  saveLanguagesInSidebar(): void {
    if (!this.canManageLanguageRoster()) {
      this.languagesSidebar()?.resetSavePending();
      return;
    }
    const selected = new Set(this.#selectedLanguagesInMemory());
    const initial = new Set(this.#initialSelectedLanguagesInMemory());
    const added = [...selected].filter((code: string) => !initial.has(code));
    const removed = [...initial].filter((code: string) => !selected.has(code));
    if (added.length === 0 && removed.length === 0) {
      this.closeEditLanguagesSidebar();
      return;
    }
    const isPartnerOnly = !this.canEditDefaultTranslations() && this.canManageChannelTranslations();
    const removedWithChannelRows = isPartnerOnly ? removed.filter((code: string) => this.#languageHasChannelScopedRows(code)) : [];
    const consolidatedRemoved = isPartnerOnly
      ? removedWithChannelRows
      : removed.filter((code: string) => this.#isLanguageConsolidated(code));
    if (consolidatedRemoved.length > 0) {
      this.#openRemoveLanguagesConfirmation(consolidatedRemoved, added, removed, isPartnerOnly);
      return;
    }
    this.#applyLanguageSelection(added, removed, false, isPartnerOnly);
  }

  selectLanguage(code: string): void {
    this.selectedLanguageCode.set(planTranslationLanguageKey(code));
  }

  toggleChannelInSidebar(channelId: string): void {
    if (!this.canManageChannelTranslations()) {
      return;
    }
    const current = new Set(this.#selectedChannelsInMemory());
    if (current.has(channelId)) {
      current.delete(channelId);
    } else {
      current.add(channelId);
    }
    this.#selectedChannelsInMemory.set(current);
  }

  toggleLanguageSelection(code: string): void {
    if (!this.canManageLanguageRoster()) {
      return;
    }
    if (code === this.baseLanguageCode()) {
      return;
    }
    const current = new Set(this.#selectedLanguagesInMemory());
    if (current.has(code)) {
      current.delete(code);
    } else {
      current.add(code);
    }
    this.#selectedLanguagesInMemory.set(current);
  }

  #afterOverrideRemovalReload(channelId?: string, language?: string): void {
    if (channelId !== undefined && language !== undefined) {
      this.#purgeOverrideScopeFromLocalState(channelId, language);
      this.#pruneManuallyAddedChannelsWithoutTranslationRows();
    }
    this.selectedChannelId.set(null);
    this.#componentCountsReloadToken.update((token: number) => token + 1);
    this.#reloadPayload$.next();
  }

  #applyChannelsSelection(
    added: readonly string[],
    removed: readonly string[],
    keepEditChannelsSidebarOpenDueToFailedConsolidatedDeletes: boolean = false,
  ): void {
    const removedSet = new Set(removed);
    if (removed.length > 0) {
      const filteredTranslations = this.#rawPlanTranslations().filter(
        (translation: PlanTranslation) => translation.channelId === null || !removedSet.has(translation.channelId),
      );
      this.#rawPlanTranslations.set(filteredTranslations);
      const filteredSessionTypeMap = new Map<number, readonly SessionTypeTranslation[]>();
      for (const [entityId, translations] of this.#rawSessionTypeTranslationsByEntityId().entries()) {
        filteredSessionTypeMap.set(
          entityId,
          translations.filter((item: SessionTypeTranslation) => item.channelId === null || !removedSet.has(item.channelId)),
        );
      }
      this.#rawSessionTypeTranslationsByEntityId.set(filteredSessionTypeMap);
    }

    const nextManual = new Set(this.#manuallyAddedChannels());
    for (const id of removed) {
      nextManual.delete(id);
    }
    for (const id of added) {
      nextManual.add(id);
    }
    this.#manuallyAddedChannels.set(nextManual);

    if (this.selectedChannelId() !== null && removedSet.has(this.selectedChannelId() as string)) {
      this.selectedChannelId.set(null);
    }
    if (added.length > 0 && this.translationsByChannelEnabled() && this.selectedChannelId() === null) {
      const sortedAdded = added
        .map((id: string) => ({ id, name: this.availableChannels().find((c: PartnerChannel) => c.id === id)?.name ?? id }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      this.selectedChannelId.set(sortedAdded[0]?.id ?? null);
    }
    this.#reloadPayload$.next();
    if (keepEditChannelsSidebarOpenDueToFailedConsolidatedDeletes) {
      this.#initialSelectedChannelsInMemory.set(new Set(this.activeChannels()));
      this.channelsSidebar()?.resetSavePending();
      return;
    }
    this.closeEditChannelsSidebar();
  }

  #applyLanguageSelection(
    added: readonly string[],
    removed: readonly string[],
    keepEditLanguagesSidebarOpenDueToFailedConsolidatedDeletes: boolean = false,
    isPartnerOnly: boolean = false,
  ): void {
    const baseCode = this.baseLanguageCode();
    const currentLocales = this.planTranslationLocales();
    const removedKeys = new Set(
      removed
        .filter((code: string) => !(isPartnerOnly && this.#isLanguagePlanLevel(code)))
        .map((code: string) => planTranslationLanguageKey(code)),
    );
    const keptLocales = currentLocales.filter((locale: string) => !removedKeys.has(planTranslationLanguageKey(locale)));
    const presentCodes = new Set(keptLocales.map((locale: string) => planTranslationLanguageKey(locale)));
    const addedLocales = added.filter((code: string) => code !== baseCode && !presentCodes.has(planTranslationLanguageKey(code)));
    this.#trackLanguageConfigurationAdded(addedLocales);
    const nextLocales = [...keptLocales, ...addedLocales];
    this.planTranslationLocales.set(nextLocales);
    const removedAllKeys = new Set(removed.map((code: string) => planTranslationLanguageKey(code)));
    if (removed.length > 0) {
      const filteredTranslations = this.#rawPlanTranslations().filter((translation: PlanTranslation) => {
        if (!removedAllKeys.has(planTranslationLanguageKey(translation.language))) {
          return true;
        }
        return isPartnerOnly && translation.channelId === null;
      });
      this.#rawPlanTranslations.set(filteredTranslations);
      const filteredSessionTypeMap = new Map<number, readonly SessionTypeTranslation[]>();
      for (const [entityId, translations] of this.#rawSessionTypeTranslationsByEntityId().entries()) {
        filteredSessionTypeMap.set(
          entityId,
          translations.filter((item: SessionTypeTranslation) => {
            if (!removedAllKeys.has(planTranslationLanguageKey(item.language))) {
              return true;
            }
            return isPartnerOnly && item.channelId === null;
          }),
        );
      }
      this.#rawSessionTypeTranslationsByEntityId.set(filteredSessionTypeMap);
    }
    this.#reloadPayload$.next();
    if (added.length > 0) {
      this.#selectNewlyAddedLanguage(added);
    } else {
      this.#selectFirstLanguageIfAny();
    }
    if (keepEditLanguagesSidebarOpenDueToFailedConsolidatedDeletes) {
      this.#initialSelectedLanguagesInMemory.set(new Set(this.#currentEnabledLanguageCodes()));
      this.languagesSidebar()?.resetSavePending();
      return;
    }
    this.closeEditLanguagesSidebar();
  }

  #buildEnabledLanguageCodes(baseCode: string): readonly string[] {
    const dedupedRest = [...new Set<string>(this.planTranslationLanguageCodes().filter((code: string) => code !== baseCode))];
    if (baseCode === '') {
      return dedupedRest;
    }
    return [baseCode, ...dedupedRest];
  }

  #buildLanguageTabs(): LanguageTab[] {
    const baseCode = this.baseLanguageCode();
    const enabledLanguageCodes = this.#buildEnabledLanguageCodes(baseCode);
    if (enabledLanguageCodes.length === 0) {
      return [];
    }
    return enabledLanguageCodes.map((code: string): LanguageTab => {
      const isDefault = baseCode !== '' && code === baseCode;
      const counts = this.#computeFieldCounts(code);
      return {
        code,
        isDefault,
        name: this.#catalogDisplayName(code),
        status: this.#computeLanguageOverallStatus(code, isDefault),
        totalFieldCount: counts.totalFieldCount,
        translatedFieldCount: counts.translatedFieldCount,
      };
    });
  }

  #buildSidebarChannelItems(): readonly EditChannelsSidebarItem[] {
    const allowed = this.#allowedChannelIds();
    const selected = this.#selectedChannelsInMemory();
    const channels = this.#partnerAvailableChannels();
    return channels
      .filter((channel: PartnerChannel) => allowed.has(channel.id))
      .map(
        (channel: PartnerChannel): EditChannelsSidebarItem => ({
          id: channel.id,
          isSelected: selected.has(channel.id),
          name: channel.name,
        }),
      )
      .sort((a: EditChannelsSidebarItem, b: EditChannelsSidebarItem) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }

  #buildSidebarLanguageItems(): readonly EditLanguagesSidebarItem[] {
    const baseCode = this.baseLanguageCode();
    const selected = this.#selectedLanguagesInMemory();
    const codes = new Set<string>();
    if (baseCode !== '') {
      codes.add(baseCode);
    }
    for (const language of this.translationLanguages()) {
      const catalogueKey = planTranslationLanguageKey(language.code);
      if (catalogueKey !== '') {
        codes.add(catalogueKey);
      }
    }
    for (const locale of this.planTranslationLocales()) {
      const code = planTranslationLanguageKey(locale);
      if (code !== '') {
        codes.add(code);
      }
    }
    const baseItem: EditLanguagesSidebarItem | null =
      baseCode !== '' && codes.has(baseCode)
        ? {
            code: baseCode,
            isDefault: true,
            isSelected: true,
            name: this.#catalogDisplayName(baseCode),
          }
        : null;
    const nonDefaultItems: readonly EditLanguagesSidebarItem[] = [...codes]
      .filter((code: string) => code !== baseCode)
      .map((code: string): EditLanguagesSidebarItem => {
        return {
          code,
          isDefault: false,
          isSelected: selected.has(code),
          name: this.#catalogDisplayName(code),
        };
      })
      .sort((a: EditLanguagesSidebarItem, b: EditLanguagesSidebarItem) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    return baseItem ? [baseItem, ...nonDefaultItems] : nonDefaultItems;
  }

  #buildTermsByKeyFromTranslations(translations: readonly PlanTranslation[]): ReadonlyMap<string, string> {
    const next = new Map<string, string>();
    for (const translation of translations) {
      const html = translation.mandatoryPurchaseTerms;
      if (!isHtmlMeaningful(html)) {
        continue;
      }
      const key = buildTermsAndConditionsKey(planTranslationLanguageKey(translation.language), translation.channelId);
      next.set(key, html!);
    }
    return next;
  }

  #catalogDisplayName(canonicalCode: string): string {
    return planTranslationCatalogDisplayName(canonicalCode, this.translationLanguages(), this.#planWireHintsForCanonical(canonicalCode));
  }

  #channelDisplayName(channelId: string): string {
    const fromAllowed = this.availableChannels().find((channel: PartnerChannel) => channel.id === channelId)?.name;
    if (fromAllowed) {
      return fromAllowed;
    }
    const fromCatalog = this.#partnerAvailableChannels().find((channel: PartnerChannel) => channel.id === channelId)?.name;
    return fromCatalog || channelId;
  }

  #channelHasAnyTranslationRows(channelId: string): boolean {
    if (this.#rawPlanTranslations().some((translation: PlanTranslation) => translation.channelId === channelId)) {
      return true;
    }
    for (const translations of this.#rawSessionTypeTranslationsByEntityId().values()) {
      if (translations.some((item: SessionTypeTranslation) => item.channelId === channelId)) {
        return true;
      }
    }
    return false;
  }

  #computeFieldCounts(languageCode: string): DefaultTranslationFieldCounts {
    return this.#computeFieldCountsForScope(languageCode, this.selectedChannelId());
  }

  #computeFieldCountsForScope(languageCode: string, channelId: string | null): DefaultTranslationFieldCounts {
    const plan = this.planDetail();
    return computeDefaultTranslationFieldCounts({
      channelId,
      descriptionComponentCounts: this.#descriptionComponentCountsFor(channelId, languageCode),
      hasComponentsDescription: plan?.hasComponentsDescription ?? false,
      language: languageCode,
      originalLabelFormat: this.planOriginalLabelFormat(),
      originalShortDescription: plan?.shortDescription ?? '',
      planSessionTypes: this.planSessionTypes(),
      planTranslations: this.planTranslations(),
      sessionTypeTranslationsByEntityId: this.sessionTypeTranslationsByEntityId(),
    });
  }

  #computeLanguageOverallStatus(languageCode: string, isDefault: boolean): LanguageTab['status'] {
    if (isDefault) {
      return 'unknown';
    }
    const scopes: (string | null)[] = [...(this.canEditDefaultTranslations() ? [null] : []), ...this.activeChannels()];
    let hasAnyCountedField = false;
    for (const channelId of scopes) {
      const counts = this.#computeFieldCountsForScope(languageCode, channelId);
      if (counts.totalFieldCount <= 0) {
        continue;
      }
      hasAnyCountedField = true;
      if (!counts.isScopeTranslationComplete) {
        return 'missing';
      }
    }
    return hasAnyCountedField ? 'complete' : 'unknown';
  }

  #currentEnabledLanguageCodes(): readonly string[] {
    const baseCode = this.baseLanguageCode();
    const codes = new Set<string>();
    if (baseCode !== '') {
      codes.add(baseCode);
    }
    for (const code of this.planTranslationLanguageCodes()) {
      codes.add(code);
    }
    return [...codes];
  }

  #deleteConsolidatedChannel$(partnerId: number, planId: number, channelId: string): Observable<ConsolidatedChannelDeletionResult> {
    const planLanguages = this.#planTranslationWireLanguagesInChannel(channelId);
    const sessionTypeLanguages = this.#sessionTypeWireLanguagesInChannel(channelId);
    const planDeletes$: Observable<boolean> =
      planLanguages.length === 0
        ? of(true)
        : forkJoin(
            planLanguages.map((language: string) =>
              this.#planTranslationsService.deletePlanTranslation(partnerId, planId, language, channelId).pipe(
                map(() => true),
                catchError(() => of(false)),
              ),
            ),
          ).pipe(map((results: boolean[]) => results.every(Boolean)));
    return planDeletes$.pipe(
      switchMap((planRemoved: boolean) => {
        if (!planRemoved) {
          return of<ConsolidatedChannelDeletionResult>({ channelId, planRemoved: false, sessionCleanupPartialFailure: false });
        }
        if (sessionTypeLanguages.length === 0) {
          return of<ConsolidatedChannelDeletionResult>({ channelId, planRemoved: true, sessionCleanupPartialFailure: false });
        }
        const sessionDeletes = sessionTypeLanguages.map(({ language, sessionTypeId }: { language: string; sessionTypeId: number }) =>
          this.#planTranslationsService.deleteSessionTypeTranslation(partnerId, planId, sessionTypeId, language, channelId).pipe(
            map(() => 0),
            catchError(() => of(1)),
          ),
        );
        return forkJoin(sessionDeletes).pipe(
          map((failures: number[]) => ({
            channelId,
            planRemoved: true,
            sessionCleanupPartialFailure: failures.some((n: number) => n > 0),
          })),
        );
      }),
    );
  }

  #deleteConsolidatedLanguage$(
    partnerId: number,
    planId: number,
    code: string,
    channelScopeOnly: boolean = false,
  ): Observable<ConsolidatedLanguageDeletionResult> {
    const wireCode = planTranslationWireLanguageCode(code, this.translationLanguages(), this.#planWireHintsForCanonical(code));
    const planChannels = this.#planTranslationChannelsForLanguage(code).filter((c: string | null) =>
      this.#isChannelInScope(c, !channelScopeOnly),
    );
    const sessionPairs = this.#sessionTypeChannelPairsForLanguage(code).filter(
      (pair: { channelId: string | null; sessionTypeId: number }) => this.#isChannelInScope(pair.channelId, !channelScopeOnly),
    );

    const sessionPairsByChannel = new Map<string, { channelId: string | null; sessionTypeId: number }[]>();
    for (const pair of sessionPairs) {
      const key = pair.channelId ?? NULL_CHANNEL_SCOPE_SENTINEL;
      const bucket = sessionPairsByChannel.get(key) ?? [];
      bucket.push(pair);
      sessionPairsByChannel.set(key, bucket);
    }

    type ChannelOutcome = { hadPlanDelete: boolean; planOk: boolean; sessionFailed: number };

    const deleteSessionsForChannel$ = (pairs: readonly { channelId: string | null; sessionTypeId: number }[]): Observable<number> => {
      if (pairs.length === 0) {
        return of(0);
      }
      const requests = pairs.map(({ channelId: scopedChannelId, sessionTypeId }) =>
        this.#planTranslationsService.deleteSessionTypeTranslation(partnerId, planId, sessionTypeId, wireCode, scopedChannelId).pipe(
          map(() => 0),
          catchError(() => of(1)),
        ),
      );
      return forkJoin(requests).pipe(map((failures: number[]) => failures.reduce((acc: number, n: number) => acc + n, 0)));
    };

    const channelStreams: Observable<ChannelOutcome>[] = [];
    const planChannelKeys = new Set<string>();

    for (const channelId of planChannels) {
      const key = channelId ?? NULL_CHANNEL_SCOPE_SENTINEL;
      planChannelKeys.add(key);
      const channelSessionPairs = sessionPairsByChannel.get(key) ?? [];
      channelStreams.push(
        this.#planTranslationsService.deletePlanTranslation(partnerId, planId, wireCode, channelId).pipe(
          switchMap(() =>
            deleteSessionsForChannel$(channelSessionPairs).pipe(
              map((sessionFailed: number) => ({ hadPlanDelete: true, planOk: true, sessionFailed })),
            ),
          ),
          catchError(() => of<ChannelOutcome>({ hadPlanDelete: true, planOk: false, sessionFailed: 0 })),
        ),
      );
    }

    for (const [key, pairs] of sessionPairsByChannel.entries()) {
      if (planChannelKeys.has(key)) {
        continue;
      }
      channelStreams.push(
        deleteSessionsForChannel$(pairs).pipe(map((sessionFailed: number) => ({ hadPlanDelete: false, planOk: true, sessionFailed }))),
      );
    }

    if (channelStreams.length === 0) {
      return of<ConsolidatedLanguageDeletionResult>({
        language: code,
        planRemoved: true,
        sessionCleanupPartialFailure: false,
      });
    }

    return forkJoin(channelStreams).pipe(
      map((outcomes: ChannelOutcome[]) => {
        const planRemoved = outcomes.every((o: ChannelOutcome) => !o.hadPlanDelete || o.planOk);
        const sessionCleanupPartialFailure = outcomes.some((o: ChannelOutcome) => o.sessionFailed > 0);
        return { language: code, planRemoved, sessionCleanupPartialFailure };
      }),
      catchError(() =>
        of<ConsolidatedLanguageDeletionResult>({
          language: code,
          planRemoved: false,
          sessionCleanupPartialFailure: false,
        }),
      ),
    );
  }

  #enrichSessionTypeTranslationsWithBaseDefault(
    sessionTypes: readonly PlanSessionType[],
    translationsByEntityId: ReadonlyMap<number, readonly SessionTypeTranslation[]>,
  ): ReadonlyMap<number, readonly SessionTypeTranslation[]> {
    const baseCode = this.baseLanguageCode();
    if (sessionTypes.length === 0) {
      return new Map<number, readonly SessionTypeTranslation[]>();
    }
    if (baseCode === '') {
      return translationsByEntityId;
    }
    const enriched = new Map<number, readonly SessionTypeTranslation[]>(translationsByEntityId);
    for (const sessionType of sessionTypes) {
      const existing = enriched.get(sessionType.id) ?? [];
      const alreadyHasBase = existing.some(
        (item: SessionTypeTranslation) => item.channelId === null && planTranslationLanguageKeysEqual(item.language, baseCode),
      );
      if (alreadyHasBase) {
        continue;
      }
      const synthetic: SessionTypeTranslation = {
        channelId: null,
        details: sessionType.details ?? '',
        entityId: sessionType.id,
        instructions: sessionType.instructions ?? '',
        label: sessionType.label ?? '',
        language: baseCode,
      };
      enriched.set(sessionType.id, [synthetic, ...existing]);
    }
    return enriched;
  }

  #enrichTranslationsWithBaseDefault(translations: readonly PlanTranslation[]): readonly PlanTranslation[] {
    const detail = this.planDetail();
    const baseCode = this.baseLanguageCode();
    if (!detail || baseCode === '') {
      return translations;
    }
    const alreadyHasBase = translations.some(
      (translation: PlanTranslation) => translation.channelId === null && planTranslationLanguageKeysEqual(translation.language, baseCode),
    );
    if (alreadyHasBase) {
      return translations;
    }
    const synthetic: PlanTranslation = {
      channelId: null,
      description: detail.description ?? '',
      labelFormat: detail.labelFormat ?? '',
      language: baseCode,
      name: detail.name ?? '',
      shortDescription: detail.shortDescription ?? '',
    };
    return [synthetic, ...translations];
  }

  #formatChannelNames(channelIds: readonly string[]): string {
    return channelIds.map((id: string) => this.#channelDisplayName(id)).join(', ');
  }

  #formatLanguageNames(codes: readonly string[]): string {
    return codes.map((code: string) => this.#catalogDisplayName(code)).join(', ');
  }

  #hasAnyPersistedTranslationRows(): boolean {
    if (this.#rawPlanTranslations().some((translation: PlanTranslation) => this.#isChannelInScope(translation.channelId))) {
      return true;
    }
    for (const list of this.#rawSessionTypeTranslationsByEntityId().values()) {
      if (list.some((item: SessionTypeTranslation) => this.#isChannelInScope(item.channelId))) {
        return true;
      }
    }
    return false;
  }

  #hasChannelTranslationsPermission(): boolean {
    return this.#userService.hasPermission(Permissions.CAN_MANAGE_MAIN_PLAN_TRANSLATIONS);
  }

  #hasDefaultTranslationsPermission(): boolean {
    return this.#userService.hasPermission(Permissions.CAN_EDIT_DEFAULT_TRANSLATIONS);
  }

  #isChannelConsolidated(channelId: string): boolean {
    if (!this.#allowedChannelIds().has(channelId)) {
      return false;
    }
    if (this.#rawPlanTranslations().some((translation: PlanTranslation) => translation.channelId === channelId)) {
      return true;
    }
    for (const translations of this.#rawSessionTypeTranslationsByEntityId().values()) {
      if (translations.some((item: SessionTypeTranslation) => item.channelId === channelId)) {
        return true;
      }
    }
    return false;
  }

  #isLanguageConsolidated(languageCode: string): boolean {
    const hasPlanRow = this.#rawPlanTranslations().some(
      (translation: PlanTranslation) =>
        planTranslationLanguageKeysEqual(translation.language, languageCode) && this.#isChannelInScope(translation.channelId),
    );
    if (hasPlanRow) {
      return true;
    }
    for (const translations of this.#rawSessionTypeTranslationsByEntityId().values()) {
      if (
        translations.some(
          (item: SessionTypeTranslation) =>
            planTranslationLanguageKeysEqual(item.language, languageCode) && this.#isChannelInScope(item.channelId),
        )
      ) {
        return true;
      }
    }
    return false;
  }

  #isLanguagePlanLevel(languageCode: string): boolean {
    const planLevel = this.planDetail()?.translationLanguages ?? [];
    return planLevel.some((locale: string) => planTranslationLanguageKeysEqual(locale, languageCode));
  }

  #languageHasChannelScopedRows(languageCode: string): boolean {
    const hasPlanRow = this.#rawPlanTranslations().some(
      (translation: PlanTranslation) =>
        this.#isChannelInScope(translation.channelId, false) && planTranslationLanguageKeysEqual(translation.language, languageCode),
    );
    if (hasPlanRow) {
      return true;
    }
    for (const translations of this.#rawSessionTypeTranslationsByEntityId().values()) {
      if (
        translations.some(
          (item: SessionTypeTranslation) =>
            this.#isChannelInScope(item.channelId, false) && planTranslationLanguageKeysEqual(item.language, languageCode),
        )
      ) {
        return true;
      }
    }
    return false;
  }

  #loadPartnerAvailableChannels(partnerId: number): Observable<readonly PartnerChannel[]> {
    return this.#planTranslationsService.getPartnerAvailableChannels(partnerId).pipe(
      catchError((error: unknown) => {
        console.warn('Failed to load partner available channels for translations', error);
        return of([] as PartnerChannel[]);
      }),
    );
  }

  #loadPlanTranslations(partnerId: number, planId: number): Observable<readonly PlanTranslation[]> {
    return this.#planTranslationsService.getPlanTranslations(partnerId, TranslationEntity.MAIN_PLAN, planId).pipe(
      map((response: BaseResponse<PlanTranslation[]>) => response.data ?? []),
      catchError(() => of([] as PlanTranslation[])),
    );
  }

  #loadRequiredPurchaseTermsIfPlanDetailAligned(): void {
    const generation = ++this.#termsLoadGeneration;
    const partner = this.#partnerService.getPartner();
    const selectedPlanId = this.#selectedPlanId();
    const detail = this.planDetail();
    if (!partner || selectedPlanId === null) {
      this.#requiredPurchaseTermsSourceHtml.set('');
      return;
    }
    if (!detail || detail.id !== selectedPlanId) {
      this.#requiredPurchaseTermsSourceHtml.set('');
      return;
    }
    if (!planRequiresTermsAndConditions({ type: detail.type ?? '' })) {
      this.#requiredPurchaseTermsSourceHtml.set('');
      return;
    }
    this.#mainPlanSettingsService
      .getMainPlanGeneralSettings(partner.id, detail.id)
      .pipe(
        catchError(() => of(null)),
        take(1),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(settings => {
        if (generation !== this.#termsLoadGeneration) {
          return;
        }
        if (this.#selectedPlanId() !== selectedPlanId || this.planDetail()?.id !== selectedPlanId) {
          return;
        }
        this.#requiredPurchaseTermsSourceHtml.set(settings?.requiredPurchaseTerms ?? '');
      });
  }

  #loadSessionTypesAndTranslations(partnerId: number, planId: number): Observable<PlanSessionTypesPayload> {
    return this.#planTranslationsService.getPlanSessionTypes(partnerId, planId).pipe(
      switchMap((sessionTypes: PlanSessionType[]) => {
        if (sessionTypes.length === 0) {
          return of<PlanSessionTypesPayload>({ sessionTypes: [], translationsByEntityId: new Map() });
        }
        const detail = this.#planDetail();
        const sessionTypesToTranslate =
          detail !== null && detail.id === planId ? selectTranslatableSessionTypes(detail.type ?? '', sessionTypes) : sessionTypes;
        if (sessionTypesToTranslate.length === 0) {
          return of<PlanSessionTypesPayload>({ sessionTypes, translationsByEntityId: new Map() });
        }
        return forkJoin(
          sessionTypesToTranslate.map((sessionType: PlanSessionType) =>
            this.#planTranslationsService.getSessionTypeTranslations(partnerId, sessionType.id).pipe(
              map(response => ({ entityId: sessionType.id, translations: response.data ?? [] })),
              catchError(() => of({ entityId: sessionType.id, translations: [] as SessionTypeTranslation[] })),
            ),
          ),
        ).pipe(
          map((results: Array<{ entityId: number; translations: SessionTypeTranslation[] }>) => {
            const translationsByEntityId = new Map<number, readonly SessionTypeTranslation[]>();
            for (const result of results) {
              translationsByEntityId.set(result.entityId, result.translations);
            }
            return { sessionTypes, translationsByEntityId } as PlanSessionTypesPayload;
          }),
        );
      }),
      catchError(() => of<PlanSessionTypesPayload>({ sessionTypes: [], translationsByEntityId: new Map() })),
    );
  }

  #loadTranslationLanguages(): void {
    const partner = this.#partnerService.getPartner();
    if (!partner) {
      return;
    }

    this.#translationLanguagesService
      .getTranslationLanguages(partner.id)
      .pipe(
        catchError(() => of(new BaseResponse<TranslationLanguage[]>([], null))),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((response: BaseResponse<TranslationLanguage[]>) => {
        this.translationLanguages.set(response.data ?? []);
        this.#selectFirstLanguageIfAny();
      });
  }

  #buildDeleteConfirmationMessage(question: string, explanation: string): string {
    return `${question}\n${explanation}`;
  }

  #openRemoveChannelsConfirmation(added: readonly string[], removed: readonly string[]): void {
    const partner = this.#partnerService.getPartner();
    const planId = this.#resolvePlanId();
    if (!partner || planId === null) {
      this.channelsSidebar()?.resetSavePending();
      return;
    }
    const consolidatedRemoved = removed.filter((id: string) => this.#isChannelConsolidated(id));
    const localOnlyRemoved = removed.filter((id: string) => !this.#isChannelConsolidated(id));

    if (consolidatedRemoved.length === 0) {
      this.#applyChannelsSelection(added, localOnlyRemoved);
      return;
    }

    const channelNames = this.#formatChannelNames(consolidatedRemoved);
    const message = this.#buildDeleteConfirmationMessage(
      this.#translateService.instant('planEdition.translationsEdition.deleteChannels.question', { channels: channelNames }),
      this.#translateService.instant('planEdition.translationsEdition.deleteChannels.explanation'),
    );
    openConfirmModalWithLabels(this.#dialogService, this.#injector, {
      cancelButton: this.#translateService.instant('planEdition.translationsEdition.cancel'),
      isDestructive: true,
      message,
      okButton: this.#translateService.instant('planEdition.translationsEdition.deleteChannels.acceptButton'),
      title: this.#translateService.instant('planEdition.translationsEdition.deleteChannels.title'),
    })
      .closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe((accepted: boolean | undefined) => {
        if (accepted !== true) {
          this.channelsSidebar()?.resetSavePending();
          return;
        }
        forkJoin(consolidatedRemoved.map((channelId: string) => this.#deleteConsolidatedChannel$(partner.id, planId, channelId)))
          .pipe(takeUntilDestroyed(this.#destroyRef))
          .subscribe((results: readonly ConsolidatedChannelDeletionResult[]) => {
            const failedPlanDeletes = results
              .filter((result: ConsolidatedChannelDeletionResult) => !result.planRemoved)
              .map((result: ConsolidatedChannelDeletionResult) => result.channelId);
            if (failedPlanDeletes.length > 0) {
              this.#toastFailedChannelDeletions(failedPlanDeletes);
            }
            const partialSessionCleanup = results
              .filter((result: ConsolidatedChannelDeletionResult) => result.planRemoved && result.sessionCleanupPartialFailure)
              .map((result: ConsolidatedChannelDeletionResult) => result.channelId);
            if (partialSessionCleanup.length > 0) {
              this.#toastChannelSessionTypeCleanupPartialFailure(partialSessionCleanup);
            }
            const successfullyRemoved = results
              .filter((result: ConsolidatedChannelDeletionResult) => result.planRemoved)
              .map((result: ConsolidatedChannelDeletionResult) => result.channelId);
            const effectiveRemoved = [...localOnlyRemoved, ...successfullyRemoved];
            if (effectiveRemoved.length === 0 && added.length === 0) {
              this.channelsSidebar()?.resetSavePending();
              return;
            }
            if (successfullyRemoved.length > 0) {
              this.#toastSuccessfulChannelDeletions(successfullyRemoved);
              this.#trackChannelConfigurationRemoved(successfullyRemoved);
            }
            this.#applyChannelsSelection(added, effectiveRemoved, failedPlanDeletes.length > 0);
          });
      });
  }

  #openRemoveLanguagesConfirmation(
    consolidatedRemoved: readonly string[],
    added: readonly string[],
    removed: readonly string[],
    isPartnerOnly: boolean = false,
  ): void {
    const partner = this.#partnerService.getPartner();
    const planId = this.#resolvePlanId();
    if (!partner || planId === null) {
      this.languagesSidebar()?.resetSavePending();
      return;
    }
    const languageNames = this.#formatLanguageNames(consolidatedRemoved);
    const message = this.#buildDeleteConfirmationMessage(
      this.#translateService.instant('planEdition.translationsEdition.deleteLanguages.question', {
        languages: languageNames,
      }),
      this.#translateService.instant(
        isPartnerOnly
          ? 'planEdition.translationsEdition.deleteLanguages.partnerExplanation'
          : 'planEdition.translationsEdition.deleteLanguages.explanation',
      ),
    );
    openConfirmModalWithLabels(this.#dialogService, this.#injector, {
      cancelButton: this.#translateService.instant('planEdition.translationsEdition.cancel'),
      isDestructive: true,
      message,
      okButton: this.#translateService.instant('planEdition.translationsEdition.deleteLanguages.acceptButton'),
      title: this.#translateService.instant('planEdition.translationsEdition.deleteLanguages.title'),
    })
      .closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe((accepted: boolean | undefined) => {
        if (accepted !== true) {
          this.languagesSidebar()?.resetSavePending();
          return;
        }
        forkJoin(consolidatedRemoved.map((code: string) => this.#deleteConsolidatedLanguage$(partner.id, planId, code, isPartnerOnly)))
          .pipe(takeUntilDestroyed(this.#destroyRef))
          .subscribe((results: ConsolidatedLanguageDeletionResult[]) => {
            const failedPlanDeletes = results
              .filter((result: ConsolidatedLanguageDeletionResult) => !result.planRemoved)
              .map((result: ConsolidatedLanguageDeletionResult) => result.language);
            if (failedPlanDeletes.length > 0) {
              this.#toastFailedDeletions(failedPlanDeletes);
            }
            const partialSessionCleanup = results
              .filter((result: ConsolidatedLanguageDeletionResult) => result.planRemoved && result.sessionCleanupPartialFailure)
              .map((result: ConsolidatedLanguageDeletionResult) => result.language);
            if (partialSessionCleanup.length > 0) {
              this.#toastSessionTypeCleanupPartialFailure(partialSessionCleanup);
            }
            const successfullyRemoved = results
              .filter((result: ConsolidatedLanguageDeletionResult) => result.planRemoved)
              .map((result: ConsolidatedLanguageDeletionResult) => result.language);
            const effectiveRemoved = removed.filter(
              (code: string) => !consolidatedRemoved.includes(code) || successfullyRemoved.includes(code),
            );
            if (effectiveRemoved.length === 0 && added.length === 0) {
              this.languagesSidebar()?.resetSavePending();
              return;
            }
            if (successfullyRemoved.length > 0) {
              this.#toastSuccessfulDeletions(successfullyRemoved);
              this.#trackLanguageConfigurationRemoved(successfullyRemoved);
            }
            this.#applyLanguageSelection(added, effectiveRemoved, failedPlanDeletes.length > 0, isPartnerOnly);
          });
      });
  }

  #openRemoveOverrideConfirmation(channelId: string, language: string): void {
    const partner = this.#partnerService.getPartner();
    const planId = this.#resolvePlanId();
    if (!partner || planId === null) {
      return;
    }
    const channelName = this.#channelDisplayName(channelId);
    const languageName = this.#catalogDisplayName(language);
    const message = this.#buildDeleteConfirmationMessage(
      this.#translateService.instant('planEdition.translationsEdition.removeOverrideModal.question', {
        channel: channelName,
        language: languageName,
      }),
      this.#translateService.instant('planEdition.translationsEdition.removeOverrideModal.explanation'),
    );
    const wireLanguageCode = planTranslationWireLanguageCode(
      language,
      this.translationLanguages(),
      this.#planWireHintsForCanonical(language),
    );
    openConfirmModalWithLabels(this.#dialogService, this.#injector, {
      cancelButton: this.#translateService.instant('planEdition.translationsEdition.cancel'),
      isDestructive: true,
      message,
      okButton: this.#translateService.instant('planEdition.translationsEdition.removeOverrideModal.acceptButton'),
      title: this.#translateService.instant('planEdition.translationsEdition.removeOverrideModal.title'),
    })
      .closed$.pipe(
        take(1),
        filter((accepted: boolean | undefined): accepted is true => accepted === true),
        switchMap(() => {
          const hasPlanRow = this.#rawPlanTranslations().some(
            (translation: PlanTranslation) =>
              translation.channelId === channelId && planTranslationLanguageKeysEqual(translation.language, language),
          );
          const sessionTypeIds = this.#sessionTypeIdsWithOverride(channelId, language);
          if (!hasPlanRow && sessionTypeIds.length === 0) {
            return of<OverrideRemovalResult>({
              hadPlanDelete: false,
              planOk: true,
              sessionsAttempted: 0,
              sessionsFailed: 0,
            });
          }
          const planDelete$: Observable<boolean> = hasPlanRow
            ? this.#planTranslationsService.deletePlanTranslation(partner.id, planId, wireLanguageCode, channelId).pipe(
                map(() => true),
                catchError(() => of(false)),
              )
            : of(true);
          const sessionDeletes$: Observable<number[]> =
            sessionTypeIds.length === 0
              ? of<number[]>([])
              : forkJoin(
                  sessionTypeIds.map((sessionTypeId: number) =>
                    this.#planTranslationsService
                      .deleteSessionTypeTranslation(partner.id, planId, sessionTypeId, wireLanguageCode, channelId)
                      .pipe(
                        map(() => 0),
                        catchError(() => of(1)),
                      ),
                  ),
                );
          return forkJoin([planDelete$, sessionDeletes$]).pipe(
            map(([planOk, sessionResults]: [boolean, number[]]) => ({
              hadPlanDelete: hasPlanRow,
              planOk,
              sessionsAttempted: sessionResults.length,
              sessionsFailed: sessionResults.reduce((acc: number, n: number) => acc + n, 0),
            })),
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((result: OverrideRemovalResult) => {
        const planSucceeded = !result.hadPlanDelete || result.planOk;
        const allSessionsSucceeded = result.sessionsFailed === 0;
        const somethingSucceeded = (result.hadPlanDelete && result.planOk) || result.sessionsAttempted - result.sessionsFailed > 0;

        if (planSucceeded && allSessionsSucceeded) {
          this.#toastSuccessfulOverrideRemoval(channelId, language);
          this.#trackTranslationOverrideRemoved(wireLanguageCode, channelId);
          this.#afterOverrideRemovalReload(channelId, language);
          return;
        }
        if (somethingSucceeded) {
          this.#toastOverrideRemovalPartialFailure(channelId, language);
          const context = buildTranslationsTrackingContext(this.#partnerService, this.#editingPlan);
          trackTranslationsError(this.#fzTracking, context, {
            channelId: channelId,
            field: 'configuration',
            languageCode: wireLanguageCode,
            operation: 'delete',
            errorMessage: 'override_delete_partial_failure',
            errorType: 'server',
          });
          this.#afterOverrideRemovalReload();
          return;
        }
        this.#toastFailedOverrideRemoval(channelId, language);
      });
  }

  #overrideExists(channelId: string, language: string): boolean {
    return hasOverrideRow(this.#rawPlanTranslations(), this.#rawSessionTypeTranslationsByEntityId(), channelId, language);
  }

  #planTranslationChannelsForLanguage(languageCode: string): readonly (string | null)[] {
    const channelIds = new Set<string | null>();
    for (const translation of this.#rawPlanTranslations()) {
      if (planTranslationLanguageKeysEqual(translation.language, languageCode)) {
        channelIds.add(translation.channelId);
      }
    }
    return Array.from(channelIds);
  }

  #planWireHintsForCanonical(canonicalKey: string): readonly string[] {
    return planTranslationWireHintsForCanonical(canonicalKey, this.#wireHintSourceForTracking());
  }

  #wireHintSourceForTracking(): PlanTranslationWireHintSource {
    return {
      planTranslations: this.#rawPlanTranslations(),
      sessionTypeTranslationsByEntityId: this.#rawSessionTypeTranslationsByEntityId(),
      planTranslationLocales: this.planTranslationLocales(),
    };
  }

  #wireLanguageCodeForTracking(canonicalCode: string): string {
    return planTranslationWireLanguageCodeForTracking(canonicalCode, this.translationLanguages(), this.#wireHintSourceForTracking());
  }

  #pruneManuallyAddedChannelsWithoutTranslationRows(): void {
    const nextManual = new Set(this.#manuallyAddedChannels());
    let changed = false;
    for (const id of nextManual) {
      if (!this.#channelHasAnyTranslationRows(id)) {
        nextManual.delete(id);
        changed = true;
      }
    }
    if (changed) {
      this.#manuallyAddedChannels.set(nextManual);
    }
  }

  #purgeOverrideScopeFromLocalState(channelId: string, language: string): void {
    this.#rawPlanTranslations.set(
      this.#rawPlanTranslations().filter(
        (translation: PlanTranslation) =>
          !(translation.channelId === channelId && planTranslationLanguageKeysEqual(translation.language, language)),
      ),
    );
    const nextSessionTypeMap = new Map<number, readonly SessionTypeTranslation[]>();
    for (const [entityId, translations] of this.#rawSessionTypeTranslationsByEntityId().entries()) {
      nextSessionTypeMap.set(
        entityId,
        translations.filter(
          (item: SessionTypeTranslation) => !(item.channelId === channelId && planTranslationLanguageKeysEqual(item.language, language)),
        ),
      );
    }
    this.#rawSessionTypeTranslationsByEntityId.set(nextSessionTypeMap);
  }

  #reloadPlanTranslations(): Observable<void> {
    const partner = this.#partnerService.getPartner();
    const planId = this.#resolvePlanId();
    if (!partner || planId === null) {
      return of(undefined);
    }
    return this.#loadPlanTranslations(partner.id, planId).pipe(
      tap((translations: readonly PlanTranslation[]) => {
        this.#rawPlanTranslations.set(translations);
        this.#termsAndConditionsHtmlByKey.set(this.#buildTermsByKeyFromTranslations(translations));
      }),
      switchMap(() => this.#reloadSessionTypeTranslations()),
      map((): undefined => undefined),
    );
  }

  #reloadSessionTypeTranslations(): Observable<void> {
    const partner = this.#partnerService.getPartner();
    const sessionTypes = this.planSessionTypes();
    if (!partner || sessionTypes.length === 0) {
      return of(undefined);
    }
    return forkJoin(
      sessionTypes.map((sessionType: PlanSessionType) =>
        this.#planTranslationsService.getSessionTypeTranslations(partner.id, sessionType.id).pipe(
          map((response: BaseResponse<SessionTypeTranslation[]>) => ({
            entityId: sessionType.id,
            translations: response.data ?? [],
          })),
          catchError(() => of({ entityId: sessionType.id, translations: [] as SessionTypeTranslation[] })),
        ),
      ),
    ).pipe(
      tap((results: Array<{ entityId: number; translations: SessionTypeTranslation[] }>) => {
        const next = new Map<number, readonly SessionTypeTranslation[]>();
        for (const result of results) {
          next.set(result.entityId, result.translations);
        }
        this.#rawSessionTypeTranslationsByEntityId.set(next);
      }),
      map((): undefined => undefined),
    );
  }

  #resolvePlanId(): number | null {
    return this.#selectedPlanId();
  }

  #selectFirstLanguageIfAny(): void {
    const tabs = this.languageTabs();
    if (tabs.length === 0) {
      this.selectedLanguageCode.set('');
      return;
    }
    const stillAvailable = tabs.some(tab => tab.code === this.selectedLanguageCode());
    if (stillAvailable && this.selectedLanguageCode() !== '') {
      return;
    }
    const firstNonBase = tabs.find(tab => !tab.isDefault);
    this.selectedLanguageCode.set(firstNonBase?.code ?? tabs[0].code);
  }

  #selectNewlyAddedLanguage(added: readonly string[]): void {
    const baseKey = planTranslationLanguageKey(this.baseLanguageCode());
    const nonDefaultAdded = added.filter((code: string) => planTranslationLanguageKey(code) !== baseKey);
    const candidateKey = planTranslationLanguageKey(nonDefaultAdded.length > 0 ? nonDefaultAdded[0] : (added[0] ?? ''));
    const isTabAvailable = this.languageTabs().some((tab: LanguageTab) => tab.code === candidateKey);
    if (candidateKey !== '' && isTabAvailable) {
      this.selectedLanguageCode.set(candidateKey);
      return;
    }
    this.#selectFirstLanguageIfAny();
  }

  #sessionTypeChannelPairsForLanguage(languageCode: string): readonly { channelId: string | null; sessionTypeId: number }[] {
    const seen = new Set<string>();
    return Array.from(this.#rawSessionTypeTranslationsByEntityId().entries()).flatMap(
      ([entityId, translations]: [number, readonly SessionTypeTranslation[]]) =>
        translations
          .filter((item: SessionTypeTranslation) => planTranslationLanguageKeysEqual(item.language, languageCode))
          .map((item: SessionTypeTranslation) => ({ channelId: item.channelId, sessionTypeId: entityId }))
          .filter((pair: { channelId: string | null; sessionTypeId: number }) => {
            const key = `${pair.sessionTypeId}|${pair.channelId ?? NULL_CHANNEL_SCOPE_SENTINEL}`;
            if (seen.has(key)) {
              return false;
            }
            seen.add(key);
            return true;
          }),
    );
  }

  #planTranslationWireLanguagesInChannel(channelId: string): readonly string[] {
    const storedLanguages = new Set<string>(
      this.#rawPlanTranslations()
        .filter((translation: PlanTranslation) => translation.channelId === channelId)
        .map((translation: PlanTranslation) => translation.language),
    );
    return [...storedLanguages];
  }

  #sessionTypeWireLanguagesInChannel(channelId: string): readonly { language: string; sessionTypeId: number }[] {
    return Array.from(this.#rawSessionTypeTranslationsByEntityId().entries()).flatMap(
      ([sessionTypeId, translations]: [number, readonly SessionTypeTranslation[]]) => {
        const storedLanguages = new Set<string>(
          translations
            .filter((item: SessionTypeTranslation) => item.channelId === channelId)
            .map((item: SessionTypeTranslation) => item.language),
        );
        return [...storedLanguages].map((language: string) => ({ language, sessionTypeId }));
      },
    );
  }

  #sessionTypeIdsWithOverride(channelId: string, language: string): readonly number[] {
    return Array.from(this.#rawSessionTypeTranslationsByEntityId().entries())
      .filter(([, translations]: [number, readonly SessionTypeTranslation[]]) =>
        translations.some(
          (item: SessionTypeTranslation) => item.channelId === channelId && planTranslationLanguageKeysEqual(item.language, language),
        ),
      )
      .map(([entityId]: [number, readonly SessionTypeTranslation[]]) => entityId);
  }

  #subscribeToSelectedPlanDetail(): void {
    this.#editingPlan
      .getSelectedPlanDetail$()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((planDetailResponse: BaseResponse<PlanDetail>) => {
        const detail = planDetailResponse?.data ?? null;
        const planDetailId = detail?.id ?? null;
        const baseLocale = detail?.baseLocale ?? '';
        const translationLanguages = detail?.translationLanguages ?? [];
        this.#planDetail.set(detail);
        this.baseLocale.set(baseLocale);
        const serverCodes = new Set(translationLanguages.map((l: string) => planTranslationLanguageKey(l)));
        this.#serverLanguageCodes.set(serverCodes);
        const shouldCarryOptimisticExtras = planDetailId !== null && planDetailId === this.#lastPlanDetailId;
        const optimisticExtras = shouldCarryOptimisticExtras
          ? this.planTranslationLocales().filter((locale: string) => !serverCodes.has(planTranslationLanguageKey(locale)))
          : [];
        this.#lastPlanDetailId = planDetailId;
        this.planTranslationLocales.set([...translationLanguages, ...optimisticExtras]);
        this.#selectFirstLanguageIfAny();
        this.#loadRequiredPurchaseTermsIfPlanDetailAligned();
      });
  }

  #resetPlanPayloadState(): void {
    this.isEditing.set(false);
    this.#rawPlanTranslations.set([]);
    this.#locallySavedLanguageCodes.set(new Set());
    this.#planSessionTypes.set([]);
    this.#rawSessionTypeTranslationsByEntityId.set(new Map());
    this.#partnerAvailableChannels.set([]);
    this.#manuallyAddedChannels.set(new Set());
    this.selectedLanguageCode.set('');
    this.selectedChannelId.set(null);
    this.translationsByChannelEnabled.set(false);
    this.#selectedLanguagesInMemory.set(new Set());
    this.#initialSelectedLanguagesInMemory.set(new Set());
    this.#selectedChannelsInMemory.set(new Set());
    this.#initialSelectedChannelsInMemory.set(new Set());
    this.searchQuery.set('');
    this.channelsSearchQuery.set('');
    this.closeEditChannelsSidebar();
    this.closeEditLanguagesSidebar();
  }

  #subscribeToSelectedPlanPayload(): void {
    const partner = this.#partnerService.getPartner();
    if (!partner) {
      return;
    }
    this.#editingPlan
      .getSelectedPlanOption$()
      .pipe(
        switchMap(option => {
          const planId = option?.id;
          if (planId === undefined || planId === null) {
            this.#selectedPlanId.set(null);
            this.#resetPlanPayloadState();
            this.#loading.set(false);
            return of({
              partnerChannels: [] as readonly PartnerChannel[],
              sessionTypesPayload: { sessionTypes: [], translationsByEntityId: new Map() } as PlanSessionTypesPayload,
              translations: [] as readonly PlanTranslation[],
            });
          }
          this.#selectedPlanId.set(planId);
          this.#resetPlanPayloadState();
          this.#loading.set(true);
          return forkJoin({
            partnerChannels: this.#loadPartnerAvailableChannels(partner.id),
            sessionTypesPayload: this.#loadSessionTypesAndTranslations(partner.id, planId),
            translations: this.#loadPlanTranslations(partner.id, planId),
          }).pipe(
            finalize(() => {
              this.#loading.set(false);
            }),
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(({ partnerChannels, sessionTypesPayload, translations }) => {
        this.isEditing.set(false);
        this.selectedChannelId.set(null);
        this.translationsByChannelEnabled.set(false);
        this.#translationsByChannelDefaultApplied = false;
        this.#partnerAvailableChannels.set(partnerChannels);
        this.#rawPlanTranslations.set(translations);
        this.#planSessionTypes.set(sessionTypesPayload.sessionTypes);
        this.#rawSessionTypeTranslationsByEntityId.set(sessionTypesPayload.translationsByEntityId);
        this.#manuallyAddedChannels.set(new Set());
        this.#trackedChannelConfigurationAdds.clear();
        this.#termsAndConditionsHtmlByKey.set(this.#buildTermsByKeyFromTranslations(translations));
        this.#loadRequiredPurchaseTermsIfPlanDetailAligned();
        this.#selectFirstLanguageIfAny();
        this.closeEditChannelsSidebar();
        this.closeEditLanguagesSidebar();
        this.#trackTranslationsViewed();
      });
  }

  #trackChannelConfigurationAdded(channelIds: readonly string[]): void {
    const context = buildTranslationsTrackingContext(this.#partnerService, this.#editingPlan);
    if (!context) {
      return;
    }
    for (const channelId of channelIds) {
      this.#fzTracking.track(addTranslations({ ...context, channelId: channelId, languageCode: null }));
    }
  }

  #trackChannelConfigurationRemoved(channelIds: readonly string[]): void {
    const context = buildTranslationsTrackingContext(this.#partnerService, this.#editingPlan);
    if (!context) {
      return;
    }
    for (const channelId of channelIds) {
      this.#fzTracking.track(deleteTranslations({ ...context, channelId: channelId, languageCode: null }));
    }
  }

  #trackLanguageConfigurationAdded(languageCodes: readonly string[]): void {
    const context = buildTranslationsTrackingContext(this.#partnerService, this.#editingPlan);
    if (!context) {
      return;
    }
    for (const languageCode of languageCodes) {
      this.#fzTracking.track(
        addTranslations({ ...context, channelId: null, languageCode: this.#wireLanguageCodeForTracking(languageCode) }),
      );
    }
  }

  #trackLanguageConfigurationRemoved(languageCodes: readonly string[]): void {
    const context = buildTranslationsTrackingContext(this.#partnerService, this.#editingPlan);
    if (!context) {
      return;
    }
    for (const languageCode of languageCodes) {
      this.#fzTracking.track(
        deleteTranslations({ ...context, channelId: null, languageCode: this.#wireLanguageCodeForTracking(languageCode) }),
      );
    }
  }

  #trackTranslationOverrideRemoved(languageCode: string, channelId: string): void {
    const context = buildTranslationsTrackingContext(this.#partnerService, this.#editingPlan);
    if (!context) {
      return;
    }
    this.#fzTracking.track(deleteTranslations({ ...context, channelId: channelId, languageCode: languageCode }));
  }

  #trackChannelConfigurationAddedAfterEditorSave(): void {
    const channelId = this.selectedChannelId();
    if (channelId === null || !this.#manuallyAddedChannels().has(channelId) || !this.#isChannelConsolidated(channelId)) {
      return;
    }
    if (this.#trackedChannelConfigurationAdds.has(channelId)) {
      return;
    }
    this.#trackedChannelConfigurationAdds.add(channelId);
    this.#trackChannelConfigurationAdded([channelId]);
  }

  #trackTranslationsViewed(): void {
    if (this.#selectedPlanId() === null) {
      return;
    }
    const context = buildTranslationsTrackingContext(this.#partnerService, this.#editingPlan);
    if (!context || this.#lastViewTrackedPlanId === context.planId) {
      return;
    }
    this.#lastViewTrackedPlanId = context.planId;
    this.#fzTracking.track(viewTranslations(context));
  }

  #syncChannelsSidebarStateOnClose(): void {
    this.showEditChannelsSidebar.set(false);
    const syncedSelection = new Set(this.activeChannels());
    this.#selectedChannelsInMemory.set(syncedSelection);
    this.#initialSelectedChannelsInMemory.set(new Set(syncedSelection));
    this.channelsSearchQuery.set('');
  }

  #syncLanguagesSidebarStateOnClose(): void {
    this.showEditLanguagesSidebar.set(false);
    const syncedSelection = new Set(this.#currentEnabledLanguageCodes());
    this.#selectedLanguagesInMemory.set(syncedSelection);
    this.#initialSelectedLanguagesInMemory.set(new Set(syncedSelection));
    this.searchQuery.set('');
  }

  #toastChannelSessionTypeCleanupPartialFailure(channelIds: readonly string[]): void {
    const context = buildTranslationsTrackingContext(this.#partnerService, this.#editingPlan);
    for (const channelId of channelIds) {
      trackTranslationsError(this.#fzTracking, context, {
        channelId: channelId,
        field: 'configuration',
        languageCode: null,
        operation: 'delete',
        errorMessage: 'session_type_cleanup_partial_failure',
        errorType: 'server',
      });
    }
    this.#toastService.add({
      autoHide: true,
      message: this.#translateService.instant('planEdition.translationsEdition.deleteChannels.sessionTypeCleanupWarning', {
        channels: this.#formatChannelNames(channelIds),
      }),
      sentiment: AlertSentiment.warning,
    });
  }

  #toastFailedChannelDeletions(channelIds: readonly string[]): void {
    const context = buildTranslationsTrackingContext(this.#partnerService, this.#editingPlan);
    for (const channelId of channelIds) {
      trackTranslationsError(this.#fzTracking, context, {
        channelId: channelId,
        field: 'configuration',
        languageCode: null,
        operation: 'delete',
        errorMessage: 'channel_delete_failed',
        errorType: 'server',
      });
    }
    this.#toastService.add({
      autoHide: true,
      message: this.#translateService.instant('planEdition.translationsEdition.deleteChannels.error', {
        channels: this.#formatChannelNames(channelIds),
      }),
      sentiment: AlertSentiment.danger,
    });
  }

  #toastFailedDeletions(failedLanguageCodes: readonly string[]): void {
    const context = buildTranslationsTrackingContext(this.#partnerService, this.#editingPlan);
    for (const languageCode of failedLanguageCodes) {
      trackTranslationsError(this.#fzTracking, context, {
        channelId: null,
        field: 'configuration',
        languageCode: this.#wireLanguageCodeForTracking(languageCode),
        operation: 'delete',
        errorMessage: 'language_delete_failed',
        errorType: 'server',
      });
    }
    this.#toastService.add({
      autoHide: true,
      message: this.#translateService.instant('planEdition.translationsEdition.deleteLanguages.error', {
        languages: this.#formatLanguageNames(failedLanguageCodes),
      }),
      sentiment: AlertSentiment.danger,
    });
  }

  #toastFailedOverrideRemoval(channelId: string, language: string): void {
    const context = buildTranslationsTrackingContext(this.#partnerService, this.#editingPlan);
    trackTranslationsError(this.#fzTracking, context, {
      channelId: channelId,
      field: 'configuration',
      languageCode: this.#wireLanguageCodeForTracking(language),
      operation: 'delete',
      errorMessage: 'override_delete_failed',
      errorType: 'server',
    });
    this.#toastService.add({
      autoHide: true,
      message: this.#translateService.instant('planEdition.translationsEdition.removeOverride.error', {
        channel: this.#channelDisplayName(channelId),
        language: this.#catalogDisplayName(language),
      }),
      sentiment: AlertSentiment.danger,
    });
  }

  #toastOverrideRemovalPartialFailure(channelId: string, language: string): void {
    this.#toastService.add({
      autoHide: true,
      message: this.#translateService.instant('planEdition.translationsEdition.removeOverride.partialFailureMessage', {
        channel: this.#channelDisplayName(channelId),
        language: this.#catalogDisplayName(language),
      }),
      sentiment: AlertSentiment.warning,
    });
  }

  #toastSessionTypeCleanupPartialFailure(languageCodes: readonly string[]): void {
    const context = buildTranslationsTrackingContext(this.#partnerService, this.#editingPlan);
    for (const languageCode of languageCodes) {
      trackTranslationsError(this.#fzTracking, context, {
        channelId: null,
        field: 'configuration',
        languageCode: this.#wireLanguageCodeForTracking(languageCode),
        operation: 'delete',
        errorMessage: 'session_type_cleanup_partial_failure',
        errorType: 'server',
      });
    }
    this.#toastService.add({
      autoHide: true,
      message: this.#translateService.instant('planEdition.translationsEdition.deleteLanguages.sessionTypeCleanupWarning', {
        languages: this.#formatLanguageNames(languageCodes),
      }),
      sentiment: AlertSentiment.warning,
    });
  }

  #toastSuccessfulChannelDeletions(channelIds: readonly string[]): void {
    this.#toastService.add({
      autoHide: true,
      message: this.#translateService.instant('planEdition.translationsEdition.deleteChannels.successMessage', {
        channels: this.#formatChannelNames(channelIds),
      }),
      sentiment: AlertSentiment.positive,
      title: this.#translateService.instant('planEdition.translationsEdition.deleteChannels.successTitle'),
    });
  }

  #toastSuccessfulDeletions(removedLanguageCodes: readonly string[]): void {
    this.#toastService.add({
      autoHide: true,
      message: this.#translateService.instant('planEdition.translationsEdition.deleteLanguages.successMessage', {
        languages: this.#formatLanguageNames(removedLanguageCodes),
      }),
      sentiment: AlertSentiment.positive,
      title: this.#translateService.instant('planEdition.translationsEdition.deleteLanguages.successTitle'),
    });
  }

  #toastSuccessfulOverrideRemoval(channelId: string, language: string): void {
    this.#toastService.add({
      autoHide: true,
      message: this.#translateService.instant('planEdition.translationsEdition.removeOverride.successMessage', {
        channel: this.#channelDisplayName(channelId),
        language: this.#catalogDisplayName(language),
      }),
      sentiment: AlertSentiment.positive,
      title: this.#translateService.instant('planEdition.translationsEdition.removeOverride.successTitle'),
    });
  }

  #toAvailableLanguage(tab: LanguageTab): AvailableLanguage {
    const total = tab.totalFieldCount ?? 0;
    const translated = tab.translatedFieldCount ?? 0;
    const wireCode = planTranslationWireLanguageCode(tab.code, this.translationLanguages(), this.#planWireHintsForCanonical(tab.code));
    return {
      code: wireCode,
      hasTranslation: total === 0 || translated >= total,
      isDefault: tab.isDefault,
      isSelected: this.selectedLanguageCode() === tab.code,
      name: tab.name,
    };
  }
}

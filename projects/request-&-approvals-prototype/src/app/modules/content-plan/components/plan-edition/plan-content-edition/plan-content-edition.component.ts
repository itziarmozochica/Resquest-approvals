import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  Output,
  Signal,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import {
  centerTagToRichTextHtml,
  isEmptyRichTextHtml,
} from '@fz-original/app/shared/components/rich-text-editor/rich-text-editor-content.utils';
import { RICH_TEXT_EDITOR_TRANSLATION_FIELD_FEATURES } from '@fz-original/app/shared/components/rich-text-editor/rich-text-editor-features.const';
import { IgntAlertComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntToggleComponent } from '@ignite/legacy/components/ignt-toggle/ignt-toggle.component';
import { IgntRichTextEditorComponent } from '@ignite/rich-text-editor';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, combineLatest, EMPTY, forkJoin, Observable, of, Subject } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  mergeMap,
  startWith,
  switchMap,
  take,
  takeUntil,
  tap,
} from 'rxjs/operators';

import { UpdateContentPlanData, UpdateContentPlanEvent } from '../../../../../core/tracking/core/events/update-content-plan';
import { TrackingService } from '../../../../../core/tracking/tracking.service';
import { MessageModalComponent } from '../../../../../shared/components/message-modal/message-modal.component';
import { SharedComponentsModule } from '../../../../../shared/components/shared-components.module';
import { PLAN_NAME_MAX_LENGTH } from '../../../../../shared/models/plan/plan-constraints.const';
import { PlanDetail } from '../../../../../shared/models/plan/plan-detail.model';
import { WithUnsavedChangesGuardComponent } from '../../../../../shared/models/with-unsaved-changes-guard-component.model';
import { OptimizelyService } from '../../../../../shared/optimizely/optimizely.service';
import { PartnerService } from '../../../../../shared/services/partner/partner.service';
import { Permissions } from '../../../../../shared/services/user/permissions';
import { UserService } from '../../../../../shared/services/user/user.service';
import { PartnerChannel } from '../../../models/partner-channels.model';
import { PlanContent } from '../../../models/plan-content';
import { PlanTranslation, TranslationEntity } from '../../../models/plan-translation.model';
import { ContentFileUploadService } from '../../../services/content-file-upload/content-file-upload.service';
import { EditingPlanService } from '../../../services/editing-plan/editing-plan.service';
import { PlanContentService } from '../../../services/plan-content/plan-content.service';
import { PlanTranslationsService } from '../../../services/plan-translations/plan-translations.service';
import { UploadPlanImageService } from '../../../services/upload-plan-image/upload-plan-image.service';
import { allowedChannelsForPlan } from '../../../utils/allowed-channels.util';
import { isHtmlMeaningful, isTranslationTextPopulated } from '../../../utils/default-translation-field-catalog';
import { planTranslationLanguageKey, planTranslationLanguageKeysEqual } from '../../../utils/plan-translation-locale.util';
import { ContentChannelSelectorComponent } from '../content-channel-selector/content-channel-selector.component';
import { collectMissingMandatory, MissingMandatoryField } from '../description-builder/blocks/block-validation.util';
import { DescriptionBuilderComponent } from '../description-builder/description-builder.component';
import { Block } from '../description-builder/models/block.model';
import { EditionConfirmationModalComponent } from '../edition-confirmation-modal/edition-confirmation-modal.component';
import { PlanEditionHeaderComponent } from '../plan-edition-header/plan-edition-header.component';
import { SelectContentChannelSidebarComponent } from '../select-content-channel-sidebar/select-content-channel-sidebar.component';

enum ComponentStateEnum {
  loading,
  error,
  ok,
}

const BEST_CONTENT_PRACTICES_LINK_LANG_MAP = {
  en: 'en-us',
  fr: 'fr-fr',
  es: 'es',
  pt: 'pt',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ContentChannelSelectorComponent,
    DescriptionBuilderComponent,
    FormsModule,
    IgntAlertComponent,
    IgntButtonComponent,
    IgntIconComponent,
    IgntRichTextEditorComponent,
    IgntToggleComponent,
    PlanEditionHeaderComponent,
    ReactiveFormsModule,
    SelectContentChannelSidebarComponent,
    SharedComponentsModule,
    TranslateModule,
  ],
  selector: 'app-plan-content-edition',
  standalone: true,
  styleUrls: ['./plan-content-edition.component.scss'],
  templateUrl: './plan-content-edition.component.html',
})
export class PlanContentEditionComponent implements OnDestroy, WithUnsavedChangesGuardComponent {
  readonly #userService = inject(UserService);
  #breakpointStateService = inject(BreakpointStateService);
  #changeDetectorRef = inject(ChangeDetectorRef);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #contentFileUploadService = inject(ContentFileUploadService);
  readonly #editingPlan = inject(EditingPlanService);
  readonly #formBuilder = inject(UntypedFormBuilder);
  readonly #modalService = inject(NgbModal);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #partnerService = inject(PartnerService);
  readonly #planContentService = inject(PlanContentService);
  readonly #planTranslationsService = inject(PlanTranslationsService);
  readonly #trackingService = inject(TrackingService);
  readonly #translate = inject(TranslateService);
  readonly #uploadPlanImageService = inject(UploadPlanImageService);
  @Input() isDraftMode = false;
  @Input() isLastTab = false;
  readonly MAX_SORT_DESCRIPTION_CHARACTERS = 200;
  readonly PLAN_NAME_MAX_LENGTH = PLAN_NAME_MAX_LENGTH;
  readonly descriptionControl = new FormControl<string>('', { nonNullable: true });
  readonly descriptionFeatures = RICH_TEXT_EDITOR_TRANSLATION_FIELD_FEATURES;

  @Output() saved = new EventEmitter<void>();
  @Output() saveFailed = new EventEmitter<void>();

  bestPracticesLink: string;
  componentState = ComponentStateEnum.ok;
  componentStateEnum = ComponentStateEnum;
  destroy$ = new Subject<void>();
  isConfirmationModalChecked = false;
  isMobile: Signal<boolean> = this.#breakpointStateService.getStateProp('isMobile');
  planDetail: PlanDetail | null = null;
  planNameFormControl: FormControl;
  planShortDescriptionFormControl: FormControl | null = null;

  @ViewChild('savingModal', { static: true }) savingModal!: TemplateRef<unknown>;

  contentSchema: Block[] = [];
  initialContentSchema: Block[] = [];
  /**
   * Switches the builder's properties panel into its "missing mandatory fields" error
   * paint. On until the user edits the schema or a publish succeeds.
   */
  readonly highlightMissingMandatory = signal(false);
  /**
   * Server-computed flag: the plan has missing or invalid translations across
   * its languages/channels. Drives the content-edit warning banner.
   */
  readonly missingTranslations = signal(false);
  hasComponentsDescriptionFormControl: FormControl;
  channelIdFormControl: FormControl;
  partnerChannels: PartnerChannel[] = [];
  sessionTypeChannelIds: string[] = [];
  channelSchemaIsInherited = false;
  /** The user clicked "Add channel schema": a blank, editable override exists only in memory (not yet persisted). */
  isAddingChannelOverride = false;
  /** Channel ids that have a (default-language) `main_plan` translation — drives the channel panel's success/warning icon. */
  channelsWithTranslations: ReadonlySet<string> = new Set<string>();
  /**
   * Channel ids currently "created" for the plan — the list the panel renders below the
   * toggle. Seeded add-only from `channelsWithTranslations` so a persisted override is
   * always listed; removal is explicit through the Edit modal.
   */
  activeChannelIds: string[] = [];
  readonly showEditChannelsSidebar = signal(false);
  /**
   * Gates the "enable component-based description" toggle behind a per-partner
   * Optimizely flag. Resolved once in the constructor rather than read from the
   * template on every change-detection cycle.
   */
  showComponentsDescriptionToggle = false;
  #isContentSchemaDirty = false;
  #channelDataLoaded = false;
  /**
   * True while `#ensureChannelDataLoaded`'s fetch is in flight. Separate from
   * `channelDataLoaded`, which only flips once it resolves, so the two plan-detail
   * emissions of a plan load can't both pass the guard and fire duplicate requests.
   */
  #channelDataLoading = false;
  /** Fetched only when the user turns on "Content by channel". */
  #channelTranslationsLoaded = false;
  /**
   * Plan id whose per-channel view has already been initialised. A plan detail re-emits
   * both for a genuinely new plan and for a post-save refresh of the same one; comparing
   * against this id tells the two apart, and only the former resets the view.
   */
  #channelStateInitializedForPlanId: number | null = null;
  #initialHasComponentsDescription = false;
  #planDetail$ = new BehaviorSubject<PlanDetail | null>(null);
  /** Channels queued to add after a deselect confirmation resolves (added + removed in one Save). */
  #pendingAddedChannels: string[] = [];

  onBuilderSchemaChange(schema: Block[]): void {
    this.contentSchema = schema;
    this.#isContentSchemaDirty = true;
    this.highlightMissingMandatory.set(false);
    this.#changeDetectorRef.markForCheck();
  }

  private isUploadingAnImage = false;
  /**
   * True while the (channel, planDetail)-scoped schema loader is fetching. Gates
   * `canPublish()`: `contentSchema` only catches up once the fetch resolves, so
   * publishing in that window would send the previous channel's blocks.
   */
  #isChannelSchemaLoading = false;
  private planId: number | null = null;
  private planName: string | null = null;
  /** The only language edited on this page (`planDetail.baseLocale`). */
  #baseLanguageCode = '';
  #planTranslations: PlanTranslation[] = [];

  constructor() {
    this.#planContentService.invalidateContentSchemaCache();
    this.bestPracticesLink = this.getBestPracticesLink();
    this.showComponentsDescriptionToggle = this.#optimizelyService.isFeatureEnabled('allow_components_description') || false;
    this.planNameFormControl = this.#formBuilder.control('', [Validators.required]);
    this.hasComponentsDescriptionFormControl = this.#formBuilder.control(false);
    this.channelIdFormControl = this.#formBuilder.control('');
    const cancelPlanDetailsRequest = new Subject<void>();

    this.#editingPlan
      .getSelectedPlanOption$()
      .pipe(
        takeUntil(this.destroy$),
        switchMap(option => {
          this.planId = option?.id;
          this.planName = option?.title;
          if (!this.planId) {
            return of(null);
          }
          cancelPlanDetailsRequest.next();
          return this.requestPlanDetails().pipe(takeUntil(cancelPlanDetailsRequest));
        }),
      )
      .subscribe(planDetail => {
        const currentPlanId = planDetail?.id ?? this.planId;
        const isNewPlan = this.#channelStateInitializedForPlanId !== currentPlanId;
        // Refreshing the same plan must not reseed from the base plan: the form holds the selected channel's content.
        const refreshedChannelId: string | null = isNewPlan ? null : this.channelIdFormControl.value || null;

        this.planDetail = planDetail;
        this.#baseLanguageCode = planTranslationLanguageKey(planDetail?.baseLocale ?? '');
        if (refreshedChannelId === null) {
          this.descriptionControl.setValue(centerTagToRichTextHtml(planDetail?.description || ''), { emitEvent: false });
          this.descriptionControl.markAsPristine();
          this.planNameFormControl.setValue(planDetail?.name || '');
        }
        this.#initialHasComponentsDescription = planDetail?.hasComponentsDescription ?? false;
        this.hasComponentsDescriptionFormControl.setValue(this.#initialHasComponentsDescription, { emitEvent: false });
        this.hasComponentsDescriptionFormControl.markAsPristine();

        if (isNewPlan) {
          this.#channelStateInitializedForPlanId = currentPlanId;
          this.channelIdFormControl.setValue('', { emitEvent: false });
          this.channelIdFormControl.markAsPristine();

          this.#channelDataLoaded = false;
          this.#channelDataLoading = false;
          this.#channelTranslationsLoaded = false;
          this.partnerChannels = [];
          this.sessionTypeChannelIds = [];
          this.#planTranslations = [];
          this.channelsWithTranslations = new Set<string>();
          this.activeChannelIds = [];
        }
        if (this.showComponentsDescriptionToggle) {
          this.#ensureChannelDataLoaded();
        }

        if (this.showPlanShortDescription()) {
          this.planShortDescriptionFormControl = this.#formBuilder.control('', [
            Validators.maxLength(this.MAX_SORT_DESCRIPTION_CHARACTERS),
          ]);
          this.planShortDescriptionFormControl.setValue(this.planDetail?.shortDescription || '');
        }
        // The short-description control above is rebuilt from the base plan, so put the channel's value back.
        if (refreshedChannelId !== null && !this.#hasUnsavedChannelScopedEdits()) {
          this.#applyChannelContent(refreshedChannelId);
        }

        this.#applyCanEditPlanToControls(this.canEditPlan() && this.hasEditContentPermission());
        this.#planDetail$.next(planDetail);
        this.#loadMissingTranslations(planDetail);
      });

    combineLatest([this.#editingPlan.observeCanEditPlan$(), this.#userService.observePermissions()])
      .pipe(
        map(([canEditPlan]) => canEditPlan && this.hasEditContentPermission()),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe(canEdit => {
        this.#applyCanEditPlanToControls(canEdit);
        this.#changeDetectorRef.markForCheck();
      });

    combineLatest([
      this.#planDetail$,
      this.channelIdFormControl.valueChanges.pipe(startWith<string | null>(this.channelIdFormControl.value)),
    ])
      .pipe(
        takeUntil(this.destroy$),
        tap(([planDetail]) => (this.#isChannelSchemaLoading = planDetail !== null)),
        map(([planDetail]) => [planDetail, this.channelIdFormControl.value] as const),
        switchMap(([planDetail, channelId]) => this.#loadSchemaForChannel(planDetail, channelId)),
      )
      .subscribe(({ blocks, inherited }) => {
        this.#isChannelSchemaLoading = false;
        this.channelSchemaIsInherited = inherited;
        this.isAddingChannelOverride = false;
        this.initialContentSchema = blocks;
        this.contentSchema = blocks;
        this.#isContentSchemaDirty = false;
        this.#changeDetectorRef.markForCheck();
      });

    this.channelIdFormControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((channelId: string | null) => {
      this.#applyChannelContent(channelId);
      this.#applyCanEditPlanToControls(this.canEditPlan() && this.hasEditContentPermission());
    });
  }

  /**
   * Switches the active content channel, confirming first when the current scope has
   * unsaved edits — a switch reloads everything from the server and discards them.
   */
  onChannelChange(nextChannelId: string): void {
    this.#applyChannelSelection(nextChannelId);
  }

  /**
   * Whether the current channel scope has any unsaved edit that switching channels would
   * silently discard — the schema loader and `#applyChannelContent` overwrite the schema,
   * title, short description, description and the builder toggle alike.
   */
  #hasUnsavedChannelScopedEdits(): boolean {
    return (
      this.isAddingChannelOverride ||
      this.#isContentSchemaDirty ||
      this.planNameFormControl.dirty ||
      Boolean(this.planShortDescriptionFormControl?.dirty) ||
      this.descriptionControl.dirty ||
      this.#hasHasComponentsDescriptionChanged()
    );
  }

  #applyChannelSelection(nextChannelId: string, onCancelled?: () => void): void {
    const currentChannelId = this.channelIdFormControl.value ?? '';
    if (nextChannelId === currentChannelId) {
      return;
    }

    if (!this.#hasUnsavedChannelScopedEdits()) {
      this.channelIdFormControl.setValue(nextChannelId);
      return;
    }

    this.#confirmDiscardChannelEdits(() => this.channelIdFormControl.setValue(nextChannelId), onCancelled);
  }

  /**
   * Opens the "Unsaved changes" modal for leaving a channel scope with in-progress edits.
   * Runs `onConfirmed` on discard, `onCancelled` on keep editing. Shared by channel
   * switching and the dismiss (×) of an unpublished channel.
   */
  #confirmDiscardChannelEdits(onConfirmed: () => void, onCancelled?: () => void): void {
    const modal = this.#modalService.open(MessageModalComponent, { backdrop: 'static' });
    const modalInstance = modal.componentInstance as MessageModalComponent;
    modalInstance.showWarningIcon = true;
    modalInstance.title = this.#translate.instant('planEdition.contentEdition.switchChannelUnsavedTitle');
    modalInstance.messages = [this.#translate.instant('planEdition.contentEdition.switchChannelUnsavedMessage')];
    modalInstance.acceptButtonLabel = this.#translate.instant('planEdition.contentEdition.switchChannelUnsavedConfirm');
    modalInstance.cancelButtonLabel = this.#translate.instant('planEdition.contentEdition.switchChannelUnsavedCancel');
    modalInstance.showDangerAcceptButton = true;

    modalInstance.responseEmitter.pipe(take(1), takeUntil(this.destroy$)).subscribe((confirmed: boolean) => {
      if (confirmed) {
        onConfirmed();
      } else {
        onCancelled?.();
      }
      this.#changeDetectorRef.markForCheck();
    });
  }

  /**
   * Loads title, short description and (rich-text mode) the description for the active
   * channel scope: base values for the default channel, the channel's own base-language
   * `main_plan` translation otherwise — empty when it has none. Applied pristine.
   */
  #applyChannelContent(channelId: string | null): void {
    const isDefaultChannel = channelId === null || channelId === '';
    const row = isDefaultChannel
      ? undefined
      : this.#planTranslations.find(
          translation =>
            translation.channelId === channelId && planTranslationLanguageKeysEqual(translation.language, this.#baseLanguageCode),
        );
    const name = isDefaultChannel ? (this.planDetail?.name ?? '') : (row?.name ?? '');
    const shortDescription = isDefaultChannel ? (this.planDetail?.shortDescription ?? '') : (row?.shortDescription ?? '');
    this.planNameFormControl.setValue(name, { emitEvent: false });
    this.planNameFormControl.markAsPristine();
    if (this.planShortDescriptionFormControl) {
      this.planShortDescriptionFormControl.setValue(shortDescription, { emitEvent: false });
      this.planShortDescriptionFormControl.markAsPristine();
    }
    const description = isDefaultChannel ? (this.planDetail?.description ?? '') : (row?.description ?? '');
    this.descriptionControl.setValue(centerTagToRichTextHtml(description), { emitEvent: false });
    this.descriptionControl.markAsPristine();
    this.hasComponentsDescriptionFormControl.setValue(this.#initialHasComponentsDescription, { emitEvent: false });
    this.#changeDetectorRef.markForCheck();
  }

  /**
   * "Add channel schema": reveals a blank, editable schema for the selected channel, in
   * memory only — nothing is persisted until the user saves.
   */
  onAddChannelSchema(): void {
    this.isAddingChannelOverride = true;
    this.initialContentSchema = [];
    this.contentSchema = [];
    this.#isContentSchemaDirty = false;
    this.#changeDetectorRef.markForCheck();
  }

  /**
   * "Discard override": drops the in-memory blank schema and restores the inherited,
   * read-only base schema. Client-only — no API call.
   */
  onDiscardChannelOverride(): void {
    this.isAddingChannelOverride = false;
    this.channelSchemaIsInherited = true;
    const base = this.planDetail?.contentSchema ?? [];
    this.initialContentSchema = base;
    this.contentSchema = base;
    this.#isContentSchemaDirty = false;
    this.#changeDetectorRef.markForCheck();
  }

  /**
   * "Remove override": deletes the channel's persisted schema behind a destructive
   * confirmation. Server-side this drops its fields and field translations and reverts
   * the channel's `description` to the base channel across every language.
   */
  onRemoveChannelOverride(): void {
    const channelId: string | null = this.channelIdFormControl.value || null;
    if (channelId === null) {
      return;
    }
    const modal = this.#modalService.open(MessageModalComponent, { backdrop: 'static' });
    const modalInstance = modal.componentInstance as MessageModalComponent;
    modalInstance.showWarningIcon = true;
    modalInstance.title = this.#translate.instant('planEdition.contentEdition.removeChannelSchemaModal.title');
    modalInstance.messages = [
      this.#translate.instant('planEdition.contentEdition.removeChannelSchemaModal.explanation'),
      this.#translate.instant('planEdition.contentEdition.removeChannelSchemaModal.consequences'),
    ];
    modalInstance.acceptButtonLabel = this.#translate.instant('planEdition.contentEdition.removeChannelSchemaModal.acceptButton');
    modalInstance.cancelButtonLabel = this.#translate.instant('planEdition.contentEdition.switchChannelUnsavedCancel');
    modalInstance.showDangerAcceptButton = true;

    modalInstance.responseEmitter.pipe(take(1), takeUntil(this.destroy$)).subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.#executeRemoveChannelOverride(channelId);
      }
    });
  }

  #executeRemoveChannelOverride(channelId: string): void {
    const partner = this.#partnerService.getPartner();
    const planId = this.planId;
    if (!partner?.id || !planId) {
      return;
    }
    const loadingModal = this.displayLoadingModal();
    this.#planContentService
      .deleteChannelContentSchema(partner.id, planId, channelId)
      .pipe(
        finalize(() => loadingModal.close()),
        catchError(() => {
          this.displayMessageModal('common.errorTitle', [
            'planEdition.contentEdition.savingChangesError',
            'planEdition.contentEdition.savingChangesErrorContact',
          ]);
          return EMPTY;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.isAddingChannelOverride = false;
        this.#channelTranslationsLoaded = false;
        this.#ensureChannelTranslationsLoaded();
        this.#planDetail$.next(this.planDetail);
        this.#loadMissingTranslations(this.planDetail);
      });
  }

  openEditChannelsSidebar(): void {
    this.showEditChannelsSidebar.set(true);
  }

  closeEditChannelsSidebar(): void {
    this.showEditChannelsSidebar.set(false);
    this.#pendingAddedChannels = [];
  }

  /**
   * Applies the "Edit channels" modal diff. Removals are destructive (they delete each
   * channel's `main_plan` translation) so they are confirmed first; additions are
   * local-only. A Save carrying both runs the removals, then the additions.
   */
  onSaveChannels(changes: { added: string[]; removed: string[] }): void {
    if (changes.removed.length > 0) {
      this.#pendingAddedChannels = changes.added;
      this.#showRemoveChannelsConfirmation(changes.removed);
    } else if (changes.added.length > 0) {
      this.#addChannels(changes.added);
      this.closeEditChannelsSidebar();
    } else {
      this.closeEditChannelsSidebar();
    }
  }

  /**
   * Locally lists the added channels and scopes the editor to the first one. Nothing is
   * persisted: a channel becomes permanent once its content is published. The scope
   * switch goes through `#applyChannelSelection` so the discard guard still applies.
   */
  #addChannels(addedChannels: string[]): void {
    const nextActive = new Set<string>(this.activeChannelIds);
    addedChannels.forEach(id => nextActive.add(id));
    this.activeChannelIds = Array.from(nextActive).sort();
    if (addedChannels.length > 0) {
      this.#applyChannelSelection(addedChannels[0]);
    }
  }

  #showRemoveChannelsConfirmation(removedChannels: string[]): void {
    const channelNames = removedChannels.map(id => this.#resolveChannelName(id)).join(', ');
    const modal = this.#modalService.open(MessageModalComponent, { backdrop: 'static' });
    const modalInstance = modal.componentInstance as MessageModalComponent;
    modalInstance.showWarningIcon = true;
    modalInstance.title = this.#translate.instant('planEdition.translationsEdition.deleteChannels.title');
    modalInstance.messages = [
      this.#translate.instant('planEdition.translationsEdition.deleteChannels.question', { channels: channelNames }),
      this.#translate.instant('planEdition.translationsEdition.deleteChannels.explanation'),
    ];
    modalInstance.acceptButtonLabel = this.#translate.instant('planEdition.translationsEdition.deleteChannels.acceptButton');
    modalInstance.cancelButtonLabel = this.#translate.instant('planEdition.translationsEdition.cancel');
    modalInstance.showDangerAcceptButton = true;

    modalInstance.responseEmitter.pipe(take(1), takeUntil(this.destroy$)).subscribe((confirmed: boolean) => {
      if (!confirmed) {
        this.#pendingAddedChannels = [];
        return;
      }
      this.#executeRemoveChannels(removedChannels);
    });
  }

  #executeRemoveChannels(removedChannels: string[]): void {
    const partner = this.#partnerService.getPartner();
    const planId = this.planId;
    if (!partner?.id || !planId) {
      return;
    }
    const partnerId = partner.id;
    const loadingModal = this.displayLoadingModal();
    const deleteRequests = removedChannels.map(channelId =>
      this.#planTranslationsService.deleteChannelTranslations(partnerId, planId, channelId, this.#baseLanguageCode).pipe(
        map(() => ({ success: true, channelId })),
        catchError(() => of({ success: false, channelId })),
      ),
    );

    forkJoin(deleteRequests)
      .pipe(
        finalize(() => loadingModal.close()),
        takeUntil(this.destroy$),
      )
      .subscribe((results: Array<{ success: boolean; channelId: string }>) => {
        const failures = results.filter(result => !result.success);
        const successes = results.filter(result => result.success).map(result => result.channelId);

        if (successes.length > 0) {
          this.#pruneRemovedChannels(successes);
        }

        if (failures.length > 0) {
          const failedChannels = failures.map(failure => this.#resolveChannelName(failure.channelId)).join(', ');
          const errorModal = this.#modalService.open(MessageModalComponent);
          const errorInstance = errorModal.componentInstance as MessageModalComponent;
          errorInstance.title = this.#translate.instant('common.errorTitle');
          errorInstance.messages = [
            this.#translate.instant('planEdition.translationsEdition.deleteChannels.error', { channels: failedChannels }),
          ];
        }

        const channelsToAdd = this.#pendingAddedChannels;
        this.#pendingAddedChannels = [];
        if (channelsToAdd.length > 0) {
          this.#addChannels(channelsToAdd);
        }
        this.closeEditChannelsSidebar();
      });
  }

  /**
   * Drops the removed channels from the list and, if the active channel was one of them,
   * falls back to the default scope directly — the destructive action is already
   * confirmed. Then refreshes the translations and the missing-translations banner.
   */
  #pruneRemovedChannels(removedChannels: string[]): void {
    const removedSet = new Set<string>(removedChannels);
    this.activeChannelIds = this.activeChannelIds.filter(id => !removedSet.has(id));
    const currentChannelId = this.channelIdFormControl.value ?? '';
    if (removedSet.has(currentChannelId)) {
      this.channelIdFormControl.setValue('');
    }
    this.#channelTranslationsLoaded = false;
    this.#ensureChannelTranslationsLoaded();
    // Do NOT re-emit `planDetail$`: the schema loader would discard an in-progress "Add channel schema".
    this.#loadMissingTranslations(this.planDetail);
    this.#changeDetectorRef.markForCheck();
  }

  #resolveChannelName(channelId: string): string {
    return this.allowedChannels.find(channel => channel.id === channelId)?.name ?? channelId;
  }

  #loadSchemaForChannel(planDetail: PlanDetail | null, channelId: string | null): Observable<{ blocks: Block[]; inherited: boolean }> {
    if (planDetail === null) {
      return EMPTY;
    }
    const baseSchema = planDetail.contentSchema ?? [];
    const isDefaultChannel = channelId === null || channelId === '';
    if (isDefaultChannel) {
      return of({ blocks: baseSchema, inherited: false });
    }
    const partnerId = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined || this.planId === null) {
      // Emit an empty result rather than EMPTY so the subscriber resets `isChannelSchemaLoading`.
      return of({ blocks: [], inherited: false });
    }
    return this.#planContentService.getContentSchema(partnerId, this.planId, channelId).pipe(
      map(result => (result.schemaId !== null ? { blocks: result.blocks, inherited: false } : { blocks: baseSchema, inherited: true })),
      // Falling back keeps the outer `combineLatest` alive; an error here would unsubscribe it for good.
      catchError(() => of({ blocks: baseSchema, inherited: true })),
    );
  }

  /**
   * Fetches the server-computed "any missing/invalid translation?" flag and drives the
   * warning banner. Resets to `false` on error — it must never block content editing.
   */
  #loadMissingTranslations(planDetail: PlanDetail | null): void {
    this.missingTranslations.set(false);
    const partnerId = this.#partnerService.getPartner()?.id;
    if (planDetail === null || partnerId === undefined || this.planId === null) {
      return;
    }
    this.#planContentService
      .getMissingTranslations(partnerId, this.planId)
      .pipe(
        catchError(() => of(false)),
        takeUntil(this.destroy$),
      )
      .subscribe(missing => {
        this.missingTranslations.set(missing);
        this.#changeDetectorRef.markForCheck();
      });
  }

  canEditPlan(): boolean {
    return this.#editingPlan.canEditPlan();
  }

  /**
   * The channel pill's "×". A channel with a published `main_plan` translation is removed
   * destructively (confirmation, then a backend delete); one only added locally is dropped
   * in memory, behind the unsaved-changes guard when it is the channel being edited.
   */
  onChannelRemoveClick(channelId: string): void {
    if (!channelId) {
      return;
    }
    if (this.channelsWithTranslations.has(channelId)) {
      this.#showRemoveChannelsConfirmation([channelId]);
      return;
    }
    const isSelected = (this.channelIdFormControl.value ?? '') === channelId;
    if (isSelected && this.#hasUnsavedChannelScopedEdits()) {
      this.#confirmDiscardChannelEdits(() => this.#removeLocalChannel(channelId));
      return;
    }
    this.#removeLocalChannel(channelId);
  }

  #removeLocalChannel(channelId: string): void {
    this.activeChannelIds = this.activeChannelIds.filter(id => id !== channelId);
    if ((this.channelIdFormControl.value ?? '') === channelId) {
      this.channelIdFormControl.setValue('');
    }
    this.#changeDetectorRef.markForCheck();
  }

  /**
   * Whether the "Create channel content" banner replaces the builder: an editable channel
   * still inheriting the base description, with no override being composed. Read-only
   * channels and the default scope keep the builder itself.
   */
  showChannelDefaultContentBanner(): boolean {
    return (
      Boolean(this.channelIdFormControl.value) &&
      this.channelSchemaIsInherited &&
      !this.isAddingChannelOverride &&
      this.canEditPlan() &&
      this.hasEditContentPermission()
    );
  }

  onHasComponentsDescriptionToggleChange(event: Event): void {
    const checked: boolean = (event.target as HTMLInputElement | null)?.checked ?? false;
    this.hasComponentsDescriptionFormControl.setValue(checked);
    if (checked) {
      // The builder remounts seeded from `initialContentSchema`; sync it or in-progress edits revert.
      this.initialContentSchema = this.contentSchema;
      this.#ensureChannelDataLoaded();
    } else {
      this.#confirmDisableComponentsDescription();
    }
    this.#changeDetectorRef.markForCheck();
  }

  /**
   * Warns that disabling the rich content builder swaps the description back to the
   * classic editor for all channels and languages. Cancelling restores the toggle.
   */
  #confirmDisableComponentsDescription(): void {
    const modal = this.#modalService.open(MessageModalComponent, { backdrop: 'static' });
    const modalInstance = modal.componentInstance as MessageModalComponent;
    modalInstance.showWarningIcon = true;
    modalInstance.title = this.#translate.instant('planEdition.contentEdition.disableBuilderModal.title');
    modalInstance.messages = [this.#translate.instant('planEdition.contentEdition.disableBuilderModal.message')];
    modalInstance.acceptButtonLabel = this.#translate.instant('planEdition.contentEdition.disableBuilderModal.acceptButton');
    modalInstance.cancelButtonLabel = this.#translate.instant('planEdition.contentEdition.disableBuilderModal.cancelButton');
    modalInstance.showDangerAcceptButton = true;

    modalInstance.responseEmitter.pipe(take(1), takeUntil(this.destroy$)).subscribe((confirmed: boolean) => {
      if (!confirmed) {
        this.hasComponentsDescriptionFormControl.setValue(true);
      }
      this.#changeDetectorRef.markForCheck();
    });
  }

  /**
   * Navigates to the sibling translations tab, preserving the `cityId`/`planId` query
   * params that carry the active plan.
   */
  goToTranslations(): void {
    this.#router.navigate(['../translations-edit'], { relativeTo: this.#route, queryParamsHandling: 'preserve' });
  }

  hasEditContentPermission(): boolean {
    return this.#userService.hasPermission(Permissions.CAN_EDIT_CONTENT) || this.#hasCreationOrReviewPermission();
  }

  areChangesUnsaved(): boolean {
    return (
      this.isUploadingAnImage ||
      this.isAddingChannelOverride ||
      this.hasNameChanged() ||
      this.hasDescriptionChanged() ||
      this.hasShortDescriptionChanged() ||
      this.#hasContentSchemaChanged() ||
      this.#hasHasComponentsDescriptionChanged()
    );
  }

  canPublish(): boolean {
    return (
      !this.isUploadingAnImage &&
      !this.#isChannelSchemaLoading &&
      (this.hasNameChanged() ||
        this.hasDescriptionChanged() ||
        this.hasShortDescriptionChanged() ||
        this.#hasContentSchemaChanged() ||
        this.#hasHasComponentsDescriptionChanged()) &&
      this.#channelContentComplete()
    );
  }

  /**
   * A non-default channel must carry a name plus either a meaningful rich-text description
   * or a component schema before it can be published. The default channel keeps the looser
   * rule: its description is not mandatory.
   */
  #channelContentComplete(): boolean {
    if (!this.channelIdFormControl.value) {
      return true;
    }
    const hasName = isTranslationTextPopulated(this.planNameFormControl.value);
    const hasContent = this.hasComponentsDescriptionFormControl.value
      ? this.#channelSchemaIsComplete()
      : isHtmlMeaningful(this.descriptionControl.value);
    return hasName && hasContent;
  }

  /**
   * A channel inheriting the base schema is persisted as `content_schema: []`, so it needs
   * no blocks of its own; an own or in-progress override needs at least one.
   */
  #channelSchemaIsComplete(): boolean {
    if (this.channelSchemaIsInherited && !this.isAddingChannelOverride) {
      return true;
    }
    return this.contentSchema.length > 0;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

  publish(): void {
    if (!this.canEditPlan() || !this.hasEditContentPermission() || !this.canPublish()) {
      this.saveFailed.emit();
      return;
    }

    const selectedChannelId: string | null = this.channelIdFormControl.value || null;
    const willSaveContentSchema = selectedChannelId === null || !this.channelSchemaIsInherited || this.isAddingChannelOverride;

    if (this.hasComponentsDescriptionFormControl.value && willSaveContentSchema) {
      const missing = collectMissingMandatory(this.contentSchema);
      if (missing.length > 0) {
        this.highlightMissingMandatory.set(true);
        this.#displayMissingMandatoryModal(missing);
        this.saveFailed.emit();
        return;
      }
    }

    if (selectedChannelId) {
      this.#publishChannelTranslation(selectedChannelId);
      return;
    }

    const newContent = this.getUpdatedContent();

    if (!newContent) {
      this.saveFailed.emit();
      return;
    }

    const contentToSave = this.#applyGeneratedDescription(newContent);

    const save$ = this.isDraftMode
      ? this.updatePlanContent(contentToSave)
      : this.askForUserConfirmation().pipe(mergeMap(() => this.updatePlanContent(contentToSave)));

    save$
      .pipe(
        catchError(() => {
          this.displayMessageModal('common.errorTitle', [
            'planEdition.contentEdition.savingChangesError',
            'planEdition.contentEdition.savingChangesErrorContact',
          ]);
          this.saveFailed.emit();
          return EMPTY;
        }),
      )
      .subscribe(() => {
        this.#editingPlan.triggerSelectedPlanChanged();
        this.descriptionControl.markAsPristine();
        this.#isContentSchemaDirty = false;
        this.highlightMissingMandatory.set(false);
        this.initialContentSchema = structuredClone(this.contentSchema);
        this.#initialHasComponentsDescription = Boolean(this.hasComponentsDescriptionFormControl.value);
        this.planNameFormControl.markAsPristine();
        this.planShortDescriptionFormControl?.markAsPristine();
        this.hasComponentsDescriptionFormControl.markAsPristine();

        if (!this.isDraftMode) {
          this.displayMessageModal('planEdition.contentEdition.savingModalTitle', ['planEdition.contentEdition.savingChangesSuccess']);
        }
        this.sendMixpanelEvent(contentToSave);
        this.saved.emit();
      });
  }

  /**
   * In component mode the backend renders the description from `content_schema.structure`,
   * so the client sends `description = null` and never frontend-generated HTML. Returned
   * unchanged in plain rich-text mode.
   */
  #applyGeneratedDescription(content: PlanContent): PlanContent {
    const hasComponentsDescription = Boolean(this.hasComponentsDescriptionFormControl.value);
    if (!hasComponentsDescription) return content;
    return { ...content, description: null };
  }

  updatePlanContent(newContent: PlanContent): Observable<void> {
    if (!newContent) {
      return EMPTY;
    }

    const contentToSend = newContent;

    const modal = this.displayLoadingModal();
    const partner = this.#partnerService.getPartner();
    const planId = this.planId;

    if (!partner?.id || !planId) {
      modal.close();
      return EMPTY;
    }

    return this.#planContentService.updatePlanContent(partner.id, planId, contentToSend).pipe(finalize(() => modal.close()));
  }

  /**
   * Persists the selected channel's content as a single `main_plan` translation for the
   * base language: title, short description and the builder's blocks (in
   * `additional_data.content_schema`). Replaces the base `updatePlanContent` path.
   */
  #publishChannelTranslation(channelId: string): void {
    const hasComponentsDescription = Boolean(this.hasComponentsDescriptionFormControl.value);
    const description = hasComponentsDescription ? '' : this.descriptionControl.value.trim();
    const contentSchema: Block[] =
      hasComponentsDescription && this.channelSchemaIsInherited && !this.isAddingChannelOverride ? [] : this.contentSchema;
    const translation: PlanTranslation = {
      channelId,
      language: this.#baseLanguageCode,
      name: this.planNameFormControl.value?.trim() || '',
      ...(hasComponentsDescription ? { contentSchema } : {}),
      ...(description.length > 0 ? { description } : {}),
      ...(this.planShortDescriptionFormControl ? { shortDescription: this.planShortDescriptionFormControl.value?.trim() || '' } : {}),
    };

    const save$ = this.isDraftMode
      ? this.#saveChannelTranslation(translation)
      : this.askForUserConfirmation().pipe(mergeMap(() => this.#saveChannelTranslation(translation)));

    save$
      .pipe(
        catchError(() => {
          this.displayMessageModal('common.errorTitle', [
            'planEdition.contentEdition.savingChangesError',
            'planEdition.contentEdition.savingChangesErrorContact',
          ]);
          this.saveFailed.emit();
          return EMPTY;
        }),
      )
      .subscribe(() => {
        this.#upsertCachedTranslation(translation);
        this.#recomputeChannelsWithTranslations();
        this.#isContentSchemaDirty = false;
        this.descriptionControl.markAsPristine();
        this.highlightMissingMandatory.set(false);
        this.initialContentSchema = structuredClone(this.contentSchema);
        this.planNameFormControl.markAsPristine();
        this.planShortDescriptionFormControl?.markAsPristine();
        this.isAddingChannelOverride = false;
        this.#planDetail$.next(this.planDetail);
        this.#loadMissingTranslations(this.planDetail);
        if (!this.isDraftMode) {
          this.displayMessageModal('planEdition.contentEdition.savingModalTitle', ['planEdition.contentEdition.savingChangesSuccess']);
        }
        this.saved.emit();
      });
  }

  #saveChannelTranslation(translation: PlanTranslation): Observable<void> {
    const partner = this.#partnerService.getPartner();
    const planId = this.planId;
    if (!partner?.id || !planId) {
      return EMPTY;
    }
    const modal = this.displayLoadingModal();
    return this.#planTranslationsService.savePlanTranslation(partner.id, planId, translation).pipe(finalize(() => modal.close()));
  }

  #upsertCachedTranslation(translation: PlanTranslation): void {
    const others = this.#planTranslations.filter(
      existing =>
        !(existing.channelId === translation.channelId && planTranslationLanguageKeysEqual(existing.language, translation.language)),
    );
    this.#planTranslations = [...others, translation];
  }

  uploadFileCallback = (file: File): Observable<string> => this.uploadImage(file);

  uploadContentImageCallback = (file: File): Observable<string> => this.#uploadContentImage(file);

  /**
   * Partner channels the plan is actually on: the partner catalog intersected with the
   * plan's and its session types' channels. Same set the translations view lists.
   */
  get allowedChannels(): PartnerChannel[] {
    return allowedChannelsForPlan(
      this.partnerChannels,
      (this.planDetail?.channels ?? []).map(channel => channel.id),
      this.sessionTypeChannelIds,
    );
  }

  #ensureChannelDataLoaded(): void {
    if (this.#channelDataLoaded || this.#channelDataLoading) return;
    const partnerId = this.#partnerService.getPartner()?.id;
    const planId = this.planId;
    if (!partnerId || !planId) return;
    this.#channelDataLoading = true;
    forkJoin({
      channels: this.#planTranslationsService.getPartnerAvailableChannels(partnerId),
      sessionTypes: this.#planTranslationsService.getPlanSessionTypes(partnerId, planId),
    })
      .pipe(
        catchError(() => of(null)),
        take(1),
        takeUntil(this.destroy$),
      )
      .subscribe(result => {
        if (this.planId !== planId) {
          return;
        }
        this.#channelDataLoading = false;
        if (result === null) return;
        this.#channelDataLoaded = true;
        this.partnerChannels = result.channels;
        this.sessionTypeChannelIds = result.sessionTypes.flatMap(sessionType => sessionType.channels ?? []);
        if (this.allowedChannels.length > 0) {
          this.#ensureChannelTranslationsLoaded();
        }
        this.#changeDetectorRef.markForCheck();
      });
  }

  /**
   * Lazily fetches the per-channel `main_plan` translations for the base language, the
   * only one editable here.
   */
  #ensureChannelTranslationsLoaded(): void {
    if (this.#channelTranslationsLoaded) return;
    const partnerId = this.#partnerService.getPartner()?.id;
    const planId = this.planId;
    if (!partnerId || !planId) return;
    this.#channelTranslationsLoaded = true;
    this.#planTranslationsService
      .getPlanTranslations(partnerId, TranslationEntity.MAIN_PLAN, planId, this.#baseLanguageCode || undefined)
      .pipe(
        map(response => response.data ?? []),
        catchError(() => {
          this.#channelTranslationsLoaded = false;
          return of([] as PlanTranslation[]);
        }),
        take(1),
        takeUntil(this.destroy$),
      )
      .subscribe(translations => {
        this.#planTranslations = translations;
        this.#recomputeChannelsWithTranslations();
        if (this.channelIdFormControl.value && !this.#hasUnsavedChannelScopedEdits()) {
          this.#applyChannelContent(this.channelIdFormControl.value);
        }
        this.#changeDetectorRef.markForCheck();
      });
  }

  #recomputeChannelsWithTranslations(): void {
    this.channelsWithTranslations = new Set<string>(
      this.#planTranslations
        .filter(
          translation => translation.channelId !== null && planTranslationLanguageKeysEqual(translation.language, this.#baseLanguageCode),
        )
        .map(translation => translation.channelId as string),
    );
    const nextActive = new Set<string>(this.activeChannelIds);
    this.channelsWithTranslations.forEach(id => nextActive.add(id));
    this.activeChannelIds = Array.from(nextActive).sort();
  }

  #applyCanEditPlanToControls(canEdit: boolean): void {
    if (canEdit) {
      this.planNameFormControl.enable({ emitEvent: false });
      this.planShortDescriptionFormControl?.enable({ emitEvent: false });
    } else {
      this.planNameFormControl.disable({ emitEvent: false });
      this.planShortDescriptionFormControl?.disable({ emitEvent: false });
    }
    if (canEdit && !this.channelIdFormControl.value) {
      this.hasComponentsDescriptionFormControl.enable({ emitEvent: false });
    } else {
      this.hasComponentsDescriptionFormControl.disable({ emitEvent: false });
    }
    // `channelIdFormControl` stays enabled without edit permissions: picking a channel only changes what is shown.
  }

  private sendMixpanelEvent(newContent: PlanContent): void {
    if (!this.planId || !this.planName) {
      return;
    }

    let mixpanelData: UpdateContentPlanData = {
      context: this.#editingPlan.getSaveContext(),
      event_type: this.planDetail?.type,
      plan_id: this.planId,
      plan_name: this.planName,
    };
    if (newContent.name) {
      mixpanelData = {
        ...mixpanelData,
        ...(this.planDetail?.name ? { previous_plan_name: this.planDetail.name } : {}),
        new_plan_name: newContent.name,
      };
    }

    if (newContent.description) {
      mixpanelData = {
        ...mixpanelData,
        ...(this.planDetail?.description ? { previous_plan_description: this.planDetail.description } : {}),
        new_plan_description: newContent.description,
      };
    }
    this.#trackingService.track(new UpdateContentPlanEvent(mixpanelData));
  }

  private getBestPracticesLink(): string {
    const clientLang = this.#translate.currentLang?.split('-')[0] as keyof typeof BEST_CONTENT_PRACTICES_LINK_LANG_MAP;
    const currentLang: string = BEST_CONTENT_PRACTICES_LINK_LANG_MAP[clientLang] ?? 'en-us';
    return `https://feverpartners.zendesk.com/hc/${currentLang}/articles/24434514427666`;
  }

  private displayLoadingModal(): NgbModalRef {
    if (!this.savingModal) {
      throw new Error('Saving modal template is not available');
    }
    return this.#modalService.open(this.savingModal, { backdrop: 'static' });
  }

  private requestPlanDetails(): Observable<PlanDetail | null> {
    this.componentState = ComponentStateEnum.loading;
    return this.#editingPlan.getSelectedPlanDetail$().pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data;
      }),
      tap(() => (this.componentState = ComponentStateEnum.ok)),
      catchError(() => {
        this.componentState = ComponentStateEnum.error;
        return of(null);
      }),
    );
  }

  private askForUserConfirmation(): Observable<unknown> {
    this.isConfirmationModalChecked = false;
    const modal = this.#modalService.open(EditionConfirmationModalComponent, { backdrop: 'static' });
    const component = modal.componentInstance as EditionConfirmationModalComponent;
    component.infoText = this.#translate.instant('planEdition.contentEdition.confirmModalMessage');
    component.confirmCheckboxText = this.#translate.instant('planEdition.contentEdition.confirmModalCheckbox');
    return component.response.pipe(
      take(1),
      takeUntil(this.destroy$),
      finalize(() => modal.close()),
      filter(response => response),
    );
  }

  private getUpdatedContent(): PlanContent | null {
    const name = this.hasNameChanged() ? this.planNameFormControl.value?.trim() || null : null;
    const description = this.hasDescriptionChanged() ? this.descriptionControl.value.trim() : null;
    const shortDescription = this.hasShortDescriptionChanged() ? this.planShortDescriptionFormControl?.value?.trim() || null : null;
    const hasComponentsDescription = Boolean(this.hasComponentsDescriptionFormControl.value);
    const contentSchema = hasComponentsDescription && this.#hasContentSchemaChanged() ? this.contentSchema : undefined;
    const includeHasComponentsDescription = this.#hasHasComponentsDescriptionChanged();
    const channelId: string | null = this.channelIdFormControl.value || null;

    if (!description && !name && !shortDescription && contentSchema === undefined && !includeHasComponentsDescription) {
      return null;
    }

    return {
      ...(name ? { name } : {}),
      ...(description ? { description } : {}),
      ...(shortDescription ? { shortDescription } : {}),
      ...(includeHasComponentsDescription || contentSchema !== undefined ? { hasComponentsDescription } : {}),
      ...(contentSchema !== undefined ? { contentSchema, channelId } : {}),
    };
  }

  private uploadImage(file: File): Observable<string> {
    const partnerId = this.#partnerService.getPartner()?.id;
    const planId = this.planDetail?.id;

    if (!partnerId || !planId) {
      this.displayMessageModal('common.errorTitle', ['planEdition.contentEdition.uploadingPhotoError']);
      return EMPTY;
    }

    this.isUploadingAnImage = true;

    return this.isValidImage(file).pipe(
      mergeMap(valid => {
        if (!valid) {
          this.displayMessageModal('common.errorTitle', ['planEdition.contentEdition.invalidImageMessage']);
          return EMPTY;
        }
        return this.#uploadPlanImageService.uploadFile(partnerId, planId, file);
      }),
      finalize(() => (this.isUploadingAnImage = false)),
      map(response => {
        if (!response.data) {
          this.displayMessageModal('common.errorTitle', ['planEdition.contentEdition.uploadingPhotoError']);
          throw response.error;
        }
        return response?.data?.fileUrl;
      }),
    );
  }

  #uploadContentImage(file: File): Observable<string> {
    const partnerId = this.#partnerService.getPartner()?.id;
    const planId = this.planDetail?.id;

    if (!partnerId || !planId) {
      this.displayMessageModal('common.errorTitle', ['planEdition.contentEdition.uploadingPhotoError']);
      return EMPTY;
    }

    const channelId: string | null = this.channelIdFormControl.value || null;
    return this.#contentFileUploadService.upload(partnerId, planId, file, null, channelId);
  }

  private isValidImage(file: File): Observable<boolean> {
    const validExtension = ['image/png', 'image/jpeg'].includes(file.type);
    if (!validExtension) {
      return of(false);
    }
    return new Observable(subscriber => {
      const img = new Image();
      img.src = window.URL.createObjectURL(file);
      img.onload = () => {
        subscriber.next(true);
        subscriber.complete();
      };
      img.onerror = () => {
        subscriber.next(false);
        subscriber.complete();
      };
    });
  }

  private displayMessageModal(titleKey: string, messageKeys: Array<string>): NgbModalRef {
    const modal = this.#modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.#translate.instant(titleKey);
    modal.componentInstance.messages = messageKeys.map(key => this.#translate.instant(key));
    return modal;
  }

  #displayMissingMandatoryModal(missing: MissingMandatoryField[]): NgbModalRef {
    const lines = missing.map(field => {
      const blockLabel: string = this.#translate.instant(field.blockLabelKey);
      const fieldLabel: string = this.#translate.instant(field.fieldLabelKey);
      const itemLabel: string =
        field.groupLabelKey !== undefined && field.itemIndexOneBased !== undefined
          ? ` (${this.#translate.instant(field.groupLabelKey, { index: field.itemIndexOneBased })})`
          : '';
      return `${blockLabel}${itemLabel} — ${fieldLabel}`;
    });
    const modal = this.#modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.#translate.instant('planEdition.contentEdition.builder.validation.missingTitle');
    modal.componentInstance.messages = [this.#translate.instant('planEdition.contentEdition.builder.validation.missingIntro'), ...lines];
    return modal;
  }

  private showPlanShortDescription(): boolean {
    return this.#optimizelyService.isFeatureEnabled('edit_content_has_short_description_field') || false;
  }

  #hasCreationOrReviewPermission(): boolean {
    return (
      this.#userService.hasPermission(Permissions.CAN_CREATE_PLANS) || this.#userService.hasPermission(Permissions.CAN_MANAGE_PLAN_REVIEWS)
    );
  }

  private hasNameChanged(): boolean {
    return this.planNameFormControl.valid && this.planNameFormControl.dirty;
  }

  private hasDescriptionChanged(): boolean {
    return !isEmptyRichTextHtml(this.descriptionControl.value) && this.descriptionControl.dirty;
  }

  private hasShortDescriptionChanged(): boolean {
    return Boolean(this.planShortDescriptionFormControl?.valid && this.planShortDescriptionFormControl?.dirty);
  }

  #hasContentSchemaChanged(): boolean {
    return this.#isContentSchemaDirty;
  }

  #hasHasComponentsDescriptionChanged(): boolean {
    return Boolean(this.hasComponentsDescriptionFormControl.value) !== this.#initialHasComponentsDescription;
  }
}

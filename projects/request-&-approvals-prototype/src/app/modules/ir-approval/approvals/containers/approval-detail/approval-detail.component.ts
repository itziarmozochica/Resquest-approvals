import { CommonModule, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { AlertConfigFormComponent } from '@fz-original/app/modules/ir-approval/shared/components/alert-config-form/alert-config-form.component';
import { DriveFolderButtonComponent } from '@fz-original/app/modules/ir-approval/shared/components/drive-folder-button/drive-folder-button.component';
import { DriveSyncBadgeComponent } from '@fz-original/app/modules/ir-approval/shared/components/drive-sync-badge/drive-sync-badge.component';
import { EditHistoryViewComponent } from '@fz-original/app/modules/ir-approval/shared/components/edit-history-view/edit-history-view.component';
import { FilePreviewDialogComponent } from '@fz-original/app/modules/ir-approval/shared/components/file-preview-dialog/file-preview-dialog.component';
import { FileThumbnailComponent } from '@fz-original/app/modules/ir-approval/shared/components/file-thumbnail/file-thumbnail.component';
import { UnsavedChangesExitDialogComponent } from '@fz-original/app/modules/ir-approval/shared/components/unsaved-changes-exit-dialog/unsaved-changes-exit-dialog.component';
import {
  AlertConfigFormValue,
  supportsValidationMode,
  validationModeNeedsRecipient,
} from '@fz-original/app/modules/ir-approval/shared/models/alert-config.model';
import { PreviewFile } from '@fz-original/app/modules/ir-approval/shared/models/file-preview-dialog.model';
import { UnsavedChangesExitChoice } from '@fz-original/app/modules/ir-approval/shared/models/unsaved-changes-exit-dialog.model';
import { fromAlertConfigPayload, toAlertConfigPayload } from '@fz-original/app/modules/ir-approval/shared/utils/alert-config-payload.util';
import { isBrowserViewable } from '@fz-original/app/modules/ir-approval/shared/utils/browser-preview.util';
import { driveSyncPollMaxIdlePolls, pollWhileVisible } from '@fz-original/app/modules/ir-approval/shared/utils/visible-polling.util';
import { ProjectsService } from '@fz-original/app/modules/project-management/services/projects.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
  ConfirmDialogResult,
} from '@fz-original/app/shared/components/confirm-dialog/confirm-dialog.component';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import {
  DriveSyncStatus,
  isDriveSyncInProgress,
  isDriveSyncStopped,
  isOutsideDrive,
} from '@fz-original/app/shared/models/drive-sync-status.enum';
import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { IgntButtonComponent, IgntButtonIcon, IgntDialogService, IgntTooltipDirective } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntTabsItemComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs-item/ignt-tabs-item.component';
import { IgntTabsComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs.component';
import { IgntTagComponent, TagSentiment } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { combineLatest, EMPTY, Observable, of } from 'rxjs';
import { catchError, defaultIfEmpty, exhaustMap, filter, finalize, map, switchMap, take, tap } from 'rxjs/operators';

import { ApprovalAddItemsComponent, ApprovalAddItemsKind } from '../../components/approval-add-items/approval-add-items.component';
import { ApprovalItemCommentsComponent } from '../../components/approval-item-comments/approval-item-comments.component';
import { ApprovalItemReviewComponent } from '../../components/approval-item-review/approval-item-review.component';
import {
  ApprovalRejectReasonDialogComponent,
  RejectReasonDialogData,
  RejectReasonDialogResult,
} from '../../components/approval-reject-reason-dialog/approval-reject-reason-dialog.component';
import {
  ApprovalResendDialogComponent,
  ResendDialogData,
  ResendDialogResult,
} from '../../components/approval-resend-dialog/approval-resend-dialog.component';
import { ApprovalReviewProgressComponent } from '../../components/approval-review-progress/approval-review-progress.component';
import { ApprovalSpreadsheetComponent } from '../../components/approval-spreadsheet/approval-spreadsheet.component';
import { supportsDriveFolder } from '../../components/subtype-payload-editor/subtype-payload-editor.types';
import {
  approvalReviewDecisionControl,
  ApprovalReviewFormGroup,
  approvalReviewItemGroup,
  ApprovalReviewItemSeed,
  buildApprovalReviewForm,
  reconcileApprovalReviewForm,
  setApprovalReviewDecision,
} from '../../models/approval-review-form.util';
import { ApprovalStatus } from '../../models/approval-status.enum';
import { mapReviewProgressByItem, parseApprovalStatus } from '../../models/approval.mapper';
import { Approval, ApprovalAction, ApprovalAsset, ApprovalReviewProgress, ApprovalRow } from '../../models/approval.model';
import { ApprovalItemCommentCountsService } from '../../services/approval-item-comment-counts.service';
import {
  ApprovalFileDriveSyncRetryResponse,
  ApprovalFileUrl,
  ApprovalItemRemovalResponse,
  ApprovalItemReviewDecision,
  ApprovalItemsReviewResponse,
  ApprovalsService,
} from '../../services/approvals.service';
import { ZiflowFoldersService } from '../../services/ziflow-folders.service';
import { ApprovalAssetTree, ApprovalAssetTreeFolder, buildApprovalAssetTree } from '../../utils/approval-asset-tree.util';
import {
  driveSyncFingerprint,
  hasDriveImportRunning,
  hasReachedReviewTool,
  isHubDecidableAsset,
  isOutdatedItemError,
  isRemovableBeforeDrive,
} from '../../utils/approval-items.util';
import { approvalStatusKey, approvalStatusSentiment } from '../../utils/approval-status.util';

type DetailErrorKey = 'loadFailed' | 'forbidden' | 'notFound';
interface ApprovalDetailField {
  id: string;
  label?: string;
  labelKey?: string;
  value: string;
  valueKey?: string;
}
interface ApprovalTemplateQuestion {
  id?: unknown;
  label?: unknown;
  type?: unknown;
  enabled?: unknown;
}
interface ApprovalItemReview {
  status?: unknown;
  feedback?: unknown;
  reviewer_email?: unknown;
  reviewed_at?: unknown;
}
type PendingFeedback = { kind: 'action'; action: ApprovalAction };
type ApprovalFolderRollup = 'approved' | 'rejected' | 'mixed';
type ApprovalDetailBusyAction = ApprovalAction | ApprovalItemReviewDecision | 'save_reviews' | 'remove_item' | 'retry_drive_sync';

interface ApprovalUrlItem {
  id: string;
  url: string;
  description: string;
  status: ApprovalStatus;
  informOnly: boolean;
}

@Component({
  selector: 'app-approval-detail',
  templateUrl: './approval-detail.component.html',
  styleUrls: ['./approval-detail.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    AlertConfigFormComponent,
    IgntButtonComponent,
    IgntTooltipDirective,
    IgntCheckboxComponent,
    IgntWrapperCardComponent,
    IgntTagComponent,
    IgntTabsComponent,
    IgntTabsItemComponent,
    IgntIconButtonComponent,
    IgntIconComponent,
    ApprovalItemCommentsComponent,
    ApprovalItemReviewComponent,
    ApprovalReviewProgressComponent,
    ApprovalAddItemsComponent,
    ApprovalSpreadsheetComponent,
    DriveFolderButtonComponent,
    DriveSyncBadgeComponent,
    EditHistoryViewComponent,
    FilePreviewDialogComponent,
    FileThumbnailComponent,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ApprovalItemCommentCountsService],
})
export class ApprovalDetailComponent {
  static readonly driveSyncPollIntervalMs = 5000;

  readonly approval = signal<Approval | null>(null);
  readonly loading = signal<boolean>(true);
  readonly error = signal<DetailErrorKey | null>(null);
  readonly launchId = signal<string>('');
  readonly partnerId = signal<number | null>(null);
  readonly activeTabIndex = signal<number>(0);
  readonly previewFile = signal<PreviewFile | null>(null);
  readonly previewingAssetId = signal<string | null>(null);
  protected readonly sheetUrl = computed<string | null>(() => this.#sheetUrl(this.approval()?.payload ?? {}));
  protected readonly isDriveButtonVisible = computed<boolean>(
    () => this.sheetUrl() !== null || supportsDriveFolder(this.approval()?.category),
  );
  protected readonly sheetInformOnly = computed<boolean>(() => this.approval()?.payload?.['partnerReviewMode'] === 'inform');
  readonly #retryingDriveSyncAssetId = signal<string | null>(null);
  protected readonly retryDriveSyncIcon: IgntButtonIcon = { name: 'arrows-repeat', variant: 'regular' };
  protected readonly commentsIcon: IgntButtonIcon = { name: 'comment', variant: 'regular' };
  readonly #openCommentThreadIds = signal<ReadonlySet<string>>(new Set<string>());
  readonly #postingCommentThreadIds = signal<ReadonlySet<string>>(new Set<string>());
  readonly #addingMentionAccessThreadIds = signal<ReadonlySet<string>>(new Set<string>());
  protected readonly commentThreads = viewChildren(ApprovalItemCommentsComponent);
  readonly #mountedCommentThreadIds = computed<ReadonlySet<string>>(() => new Set(this.commentThreads().map(thread => thread.itemId())));
  protected readonly isAddingMentionAccess = computed<boolean>(() => {
    const mounted = this.#mountedCommentThreadIds();
    return [...this.#addingMentionAccessThreadIds()].some(itemId => mounted.has(itemId));
  });
  readonly #unmountedAddingThreadIds = computed<string[]>(() => {
    const mounted = this.#mountedCommentThreadIds();
    return [...this.#addingMentionAccessThreadIds()].filter(itemId => !mounted.has(itemId));
  });
  #loadCommentCountRevision = 0;
  reviewForm: ApprovalReviewFormGroup = buildApprovalReviewForm([]);
  readonly actionInProgress = signal<ApprovalDetailBusyAction | null>(null);
  readonly actionError = signal<boolean>(false);
  readonly actionErrorMessage = signal<string | null>(null);
  readonly pendingFeedback = signal<PendingFeedback | null>(null);
  readonly feedbackText = signal<string>('');
  readonly selectedItemIds = signal<ReadonlySet<string>>(new Set<string>());
  readonly editingAlerts = signal<boolean>(false);
  readonly showingAlertDetails = signal<boolean>(false);
  readonly savingAlerts = signal<boolean>(false);
  private readonly alertConfigForm = viewChild(AlertConfigFormComponent);
  readonly isAlertConfigDirectoryLoaded = computed(() => this.alertConfigForm()?.isDirectoryLoaded() ?? false);
  readonly alertsSaveError = signal<boolean>(false);
  readonly isLifecycleUpdating = signal<boolean>(false);
  readonly #skippedItemReasons = signal<Record<string, string>>({});
  readonly alertConfigControl = new FormControl<AlertConfigFormValue | null>(null);
  #isAlertConfigStale = false;
  #alertConfigRevision = 0;
  #isAlertsReloadNoticePending = false;
  readonly #isReloadingAlerts = signal<boolean>(false);
  protected readonly isReloadingAlerts = this.#isReloadingAlerts.asReadonly();
  readonly #alertConfigValue = toSignal(this.alertConfigControl.valueChanges, {
    initialValue: null as AlertConfigFormValue | null,
  });
  readonly assetTree = computed<ApprovalAssetTree>(() => buildApprovalAssetTree(this.approval()?.assets ?? []));
  readonly #hasDriveSyncInProgress = computed<boolean>(
    () => this.approval()?.assets.some(asset => isDriveSyncInProgress(asset.driveSyncStatus)) ?? false,
  );
  readonly #idleDriveSyncPolls = signal<number>(0);
  readonly isDriveSyncStalled = computed<boolean>(
    () => this.#hasDriveSyncInProgress() && this.#idleDriveSyncPolls() >= driveSyncPollMaxIdlePolls,
  );
  readonly #hasFileOutsideDrive = computed<boolean>(
    () => this.approval()?.assets.some((asset: ApprovalAsset) => isOutsideDrive(asset.driveSyncStatus)) ?? false,
  );
  readonly #isPollingDriveSync = computed<boolean>(() => this.#hasDriveSyncInProgress() && !this.isDriveSyncStalled());
  readonly showValidationMode = computed(() => supportsValidationMode(this.approval()?.category));
  readonly #collapsedAssetFolders = signal<ReadonlySet<string>>(new Set<string>());
  // The review form is not a signal, so form-derived folder aggregates cannot be invalidated by it
  // directly. This version is bumped whenever THIS component stages decisions (folder/bulk approve,
  // reject dialog, per-item reset). Decisions staged inside a per-item pill never need it: those
  // pills only render under EXPANDED folders, whose rollups are hidden — and re-collapsing goes
  // through #collapsedAssetFolders, which the rollup map also tracks.
  readonly #reviewStagingVersion = signal<number>(0);
  /** Items covered by the decision currently in flight. Empty whenever nothing is being submitted. */
  readonly reviewingItemIds = signal<ReadonlySet<string>>(new Set<string>());
  /** Folder key → "every descendant asset is selected", recomputed only when selection or the tree changes. */
  readonly #folderSelection = computed<ReadonlyMap<string, boolean>>(() => {
    const selected = this.selectedItemIds();
    const map = new Map<string, boolean>();
    const visit = (folder: ApprovalAssetTreeFolder): void => {
      const decidable = this.#decidableDescendants(folder);
      map.set(folder.key, decidable.length > 0 && decidable.every(asset => selected.has(asset.id)));
      folder.folders.forEach(visit);
    };
    this.assetTree().folders.forEach(visit);
    return map;
  });
  /** Folder key → rollup state, recomputed on approval/tree, collapse-set, or staging changes — not per CD pass. */
  readonly #folderRollups = computed<ReadonlyMap<string, ApprovalFolderRollup | null>>(() => {
    this.#reviewStagingVersion();
    this.#collapsedAssetFolders();
    const approval = this.approval();
    const map = new Map<string, ApprovalFolderRollup | null>();
    if (!approval) {
      return map;
    }
    const visit = (folder: ApprovalAssetTreeFolder): void => {
      map.set(folder.key, this.#deriveFolderRollup(approval, folder));
      folder.folders.forEach(visit);
    };
    this.assetTree().folders.forEach(visit);
    return map;
  });
  readonly #folderCommentCounts = computed<ReadonlyMap<string, number>>(() => {
    const map = new Map<string, number>();
    const visit = (folder: ApprovalAssetTreeFolder): void => {
      map.set(folder.key, folder.descendants.filter(asset => this.hasItemComments(asset.id)).length);
      folder.folders.forEach(visit);
    };
    this.assetTree().folders.forEach(visit);
    return map;
  });

  readonly #userService = inject(UserService);
  readonly #optimizely = inject(OptimizelyService);
  readonly currentUserEmail: string | null = this.#userService.getUser()?.email ?? null;
  readonly #changeDetectorRef = inject(ChangeDetectorRef);
  readonly #destroyRef = inject(DestroyRef);
  readonly #service = inject(ApprovalsService);
  readonly #commentCounts = inject(ApprovalItemCommentCountsService);
  readonly #ziflowService = inject(ZiflowFoldersService);
  readonly #partnerService = inject(PartnerService);
  readonly #activatedRoute = inject(ActivatedRoute);
  readonly #dialogService = inject(IgntDialogService);
  readonly #toastService = inject(ToastService);
  readonly #translate = inject(TranslateService);
  readonly #projectsService = inject(ProjectsService);
  readonly #document = inject(DOCUMENT);
  /** Required items the backend reports as still undecided. Drives the completion confirmation. */
  readonly pendingRequiredItemIds = signal<ReadonlySet<string>>(new Set<string>());
  // Reasons typed for a rejection that never reached the backend. Kept off the review form: a
  // control's feedback renders as the item's comment, and a reason belongs to no decision yet.
  #draftRejectReasons = new Map<string, string>();
  #initialReviewFeedback = new Map<string, string>();
  #loadedApprovalId: string | null = null;
  #stateRevision = 0;
  #historyRevision = 0;

  constructor() {
    toObservable(this.#unmountedAddingThreadIds)
      .pipe(
        filter(itemIds => itemIds.length > 0),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(itemIds => {
        const unmounted = new Set(itemIds);
        this.#addingMentionAccessThreadIds.update(adding => new Set([...adding].filter(itemId => !unmounted.has(itemId))));
        this.onItemCommentMentionAccessGranted();
      });
    combineLatest([
      this.#partnerService.observePartner().pipe(filter((partner): partner is Partner => partner !== null)),
      this.#activatedRoute.paramMap,
    ])
      .pipe(
        switchMap(([partner, params]) => {
          this.loading.set(true);
          this.#stateRevision++;
          this.error.set(null);
          this.partnerId.set(partner.id);
          const launchId = this.#activatedRoute.parent?.snapshot.paramMap.get('projectId') ?? '';
          this.launchId.set(launchId);
          const approvalId = params.get('approvalId') ?? '';
          if (approvalId !== this.#loadedApprovalId) {
            this.#loadedApprovalId = approvalId;
            this.reviewForm = buildApprovalReviewForm([]);
            this.#initialReviewFeedback = new Map();
            this.#draftRejectReasons = new Map();
            this.selectedItemIds.set(new Set<string>());
            this.#collapsedAssetFolders.set(new Set<string>());
            this.#openCommentThreadIds.set(new Set<string>());
            this.#postingCommentThreadIds.set(new Set<string>());
            this.#addingMentionAccessThreadIds.set(new Set<string>());
            this.#alertConfigRevision++;
            this.#isAlertConfigStale = false;
            this.#isAlertsReloadNoticePending = false;
            this.#isReloadingAlerts.set(false);
            this.#commentCounts.reset();
          }
          this.#loadCommentCountRevision = this.#commentCounts.startRefresh();
          return this.#service.get(partner.id, launchId, approvalId);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (response: BaseResponse<Approval | null>) => {
          this.loading.set(false);
          if (response.error) {
            this.error.set(this.#mapErrorKey(response.error));
            this.approval.set(null);
            return;
          }
          if (!response.data) {
            this.error.set('notFound');
            this.approval.set(null);
            return;
          }
          this.#applyApproval(response.data);
          this.#commentCounts.accept(response.data.itemComments.counts, this.#loadCommentCountRevision);
          // When opened from the standalone route the projectId isn't in the URL; use the approval's
          // own project so the project-scoped review/resend/columns endpoints resolve correctly.
          if (!this.launchId() && response.data.launchId) {
            this.launchId.set(response.data.launchId);
          }
        },
        error: () => {
          this.loading.set(false);
          this.error.set('loadFailed');
          this.approval.set(null);
        },
      });

    pollWhileVisible(toObservable(this.#isPollingDriveSync), this.#document, ApprovalDetailComponent.driveSyncPollIntervalMs)
      .pipe(
        filter(() => this.#canRefreshInBackground()),
        exhaustMap(() => {
          const revision = this.#stateRevision;
          return this.#fetchShownApproval$().pipe(filter(() => revision === this.#stateRevision));
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(response => {
        this.#applyDriveSyncRefresh(response);
      });
  }

  #applyApproval(approval: Approval): void {
    this.#historyRevision++;
    this.#idleDriveSyncPolls.set(0);
    this.approval.set(approval);
    this.pendingRequiredItemIds.set(new Set(approval.pendingRequiredItemIds));
    this.#syncAlertConfigAccess(approval);
    this.#hydrateReviewForm(approval);
  }

  #applyDriveSyncRefresh(response: BaseResponse<Approval | null> | null): void {
    const errorKey = response !== null && response.error !== null ? this.#mapErrorKey(response.error) : null;
    if (errorKey === 'forbidden' || errorKey === 'notFound') {
      this.error.set(errorKey);
      this.approval.set(null);
      return;
    }
    if (response === null || response.data === null || errorKey !== null) {
      this.#idleDriveSyncPolls.update(polls => polls + 1);
      return;
    }
    this.#applyRefreshedApproval(response.data);
  }

  #applyRefreshedApproval(refreshed: Approval): void {
    const hasSyncMoved = hasDriveImportRunning(refreshed) || driveSyncFingerprint(refreshed) !== driveSyncFingerprint(this.approval());
    this.#idleDriveSyncPolls.update((polls: number) => (hasSyncMoved ? 0 : polls + 1));
    const wasAlertConfigFrozen = this.isAlertConfigFrozen();
    this.#historyRevision++;
    this.approval.set(refreshed);
    this.pendingRequiredItemIds.set(new Set(refreshed.pendingRequiredItemIds));
    if (this.#isFrozenStatus(refreshed.status) !== wasAlertConfigFrozen) {
      this.#syncAlertConfigAccess(refreshed);
      this.#discardUnsavedWorkIfFrozen(refreshed.status);
    }
    for (const seed of reconcileApprovalReviewForm(this.reviewForm, this.#reviewSeeds(refreshed))) {
      this.#initialReviewFeedback.set(seed.itemId, seed.feedback);
    }
    this.#keepSelectableItems(refreshed);
  }

  #canRefreshInBackground(): boolean {
    return !this.loading() && this.actionInProgress() === null;
  }

  #fetchShownApproval$(): Observable<BaseResponse<Approval | null> | null> {
    const approval = this.approval();
    const partnerId = this.partnerId();
    if (approval === null || partnerId === null) {
      return EMPTY;
    }
    const revision = this.#commentCounts.startRefresh();
    return this.#service.get(partnerId, this.launchId(), approval.id).pipe(
      catchError(() => of(null)),
      tap(response => {
        if (response?.data && !response.error && response.data.id === this.approval()?.id) {
          this.#commentCounts.accept(response.data.itemComments.counts, revision);
        }
      }),
    );
  }

  #keepSelectableItems(approval: Approval): void {
    const selectable = new Set(this.allItemIds(approval));
    const selected = [...this.selectedItemIds()];
    if (selected.every(itemId => selectable.has(itemId))) {
      return;
    }
    this.selectedItemIds.set(new Set(selected.filter(itemId => selectable.has(itemId))));
  }

  #hydrateReviewForm(approval: Approval): void {
    const seeds = this.#reviewSeeds(approval);
    this.reviewForm = buildApprovalReviewForm(seeds);
    this.#initialReviewFeedback = new Map(seeds.map(seed => [seed.itemId, seed.feedback]));
    this.#syncReviewFormDisabledState();
  }

  onTabChange(index: number): void {
    this.activeTabIndex.set(index);
  }

  canAddItems(): boolean {
    return this.#canCreate() && !this.isCancelled();
  }

  canManageAlerts(): boolean {
    return this.#canEditApproval();
  }

  #canEditApproval(): boolean {
    return this.#canCreate() && !this.isAlertConfigFrozen();
  }

  /**
   * Whether the alerts card renders at all. A frozen approval keeps it visible but read-only —
   * gating the card itself on `canManageAlerts()` would hide who was configured to be alerted.
   */
  canViewAlerts(): boolean {
    return this.#canCreate();
  }

  isAlertConfigFrozen(): boolean {
    return this.#isFrozenStatus(this.approval()?.status);
  }

  /** The statuses that render the approval read-only: every mutation on one is refused server-side. */
  #isFrozenStatus(status: ApprovalStatus | string | undefined): boolean {
    return status === ApprovalStatus.CANCELLED || status === ApprovalStatus.COMPLETED;
  }

  #canCreate(): boolean {
    return (
      this.#userService.hasPermission(Permissions.CAN_CREATE_APPROVAL) &&
      this.#optimizely.isFeatureEnabled(FeatureFlags.PROJECT_MANAGEMENT_FZ) === true
    );
  }

  /**
   * Mirrors the authorization on the endpoints these actions call, which are guarded by
   * `partner_that(["can_admin_hub_project_management_approval"])`. Gating on the create permission
   * instead would show the button to users the backend then rejects with a 403.
   */
  #canAdminLifecycle(): boolean {
    return (
      this.#userService.hasPermission(Permissions.CAN_ADMIN_APPROVAL) &&
      this.#optimizely.isFeatureEnabled(FeatureFlags.PROJECT_MANAGEMENT_FZ) === true
    );
  }

  canSubmit(): boolean {
    return (
      this.#userService.hasPermission(Permissions.CAN_SUBMIT_APPROVAL) &&
      this.#optimizely.isFeatureEnabled(FeatureFlags.PROJECT_MANAGEMENT_FZ) === true
    );
  }

  openAlertsEditor(): void {
    if (this.#isAlertConfigStale) {
      this.#reloadAlertsForEditor();
      return;
    }
    const approval = this.approval();
    if (!approval) return;
    this.alertConfigControl.setValue(fromAlertConfigPayload(approval.alertConfig));
    this.alertsSaveError.set(false);
    this.editingAlerts.set(true);
  }

  closeAlertsEditor(): void {
    this.editingAlerts.set(false);
    this.alertsSaveError.set(false);
  }

  readonly alertConfigIncomplete = computed(() => validationModeNeedsRecipient(this.#alertConfigValue()));

  toggleAlertDetails(): void {
    this.showingAlertDetails.update(showing => !showing);
  }

  saveAlertConfig(): void {
    const approval = this.approval();
    const partnerId = this.partnerId();
    if (
      !approval ||
      partnerId === null ||
      this.savingAlerts() ||
      this.isAddingMentionAccess() ||
      this.alertConfigIncomplete() ||
      !this.isAlertConfigDirectoryLoaded()
    )
      return;
    const payload = toAlertConfigPayload(this.alertConfigControl.value) ?? {};
    this.savingAlerts.set(true);
    this.alertsSaveError.set(false);
    this.#service
      .updateAlertConfig(partnerId, approval.id, payload)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: response => {
          this.savingAlerts.set(false);
          if (response.error) {
            this.alertsSaveError.set(true);
            return;
          }
          this.editingAlerts.set(false);
          this.#reloadApproval();
        },
        error: () => {
          this.savingAlerts.set(false);
          this.alertsSaveError.set(true);
        },
      });
  }

  isDecidedStatus(status: ApprovalStatus | string): boolean {
    return status === ApprovalStatus.APPROVED || status === ApprovalStatus.REJECTED;
  }

  // Formats a timestamp like "19th June 2026, 23:03 UTC" for the history view.
  historyDateTime(value: Date | string | undefined): string {
    if (!value) {
      return '';
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const day = date.getUTCDate();
    const ones = day % 10;
    const tens = Math.floor(day / 10) % 10;
    const suffix = tens === 1 ? 'th' : ones === 1 ? 'st' : ones === 2 ? 'nd' : ones === 3 ? 'rd' : 'th';
    const hours = `${date.getUTCHours()}`.padStart(2, '0');
    const minutes = `${date.getUTCMinutes()}`.padStart(2, '0');
    return `${day}${suffix} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}, ${hours}:${minutes} UTC`;
  }

  // The overall approval status is shown as just Pending / Completed / Cancelled; per-item statuses
  // keep approve/reject.
  overallStatusKey(status: ApprovalStatus | string): 'pending' | 'completed' | 'cancelled' {
    if (status === ApprovalStatus.CANCELLED) {
      return 'cancelled';
    }
    return this.#isCompletedStatus(status) ? 'completed' : 'pending';
  }

  overallStatusSentiment(status: ApprovalStatus | string): TagSentiment {
    if (status === ApprovalStatus.CANCELLED) {
      return 'disable';
    }
    return this.#isCompletedStatus(status) ? 'positive' : 'warning';
  }

  #isCompletedStatus(status: ApprovalStatus | string): boolean {
    return status === ApprovalStatus.COMPLETED || status === ApprovalStatus.APPROVED || status === ApprovalStatus.REJECTED;
  }

  statusKey(status: ApprovalStatus | string): string {
    return approvalStatusKey(status);
  }

  statusTagSentiment(status: ApprovalStatus | string): TagSentiment {
    return approvalStatusSentiment(status);
  }

  isCancelled(): boolean {
    return this.approval()?.status === ApprovalStatus.CANCELLED;
  }

  /**
   * The FE translates the backend's PENDING/FEEDBACK into IN_REVIEW/CHANGES_REQUESTED, so those are
   * the two statuses that map to the backend's cancellable states.
   */
  canCancel(): boolean {
    const status = this.approval()?.status;
    return this.#canAdminLifecycle() && (status === ApprovalStatus.IN_REVIEW || status === ApprovalStatus.CHANGES_REQUESTED);
  }

  canReactivate(): boolean {
    return this.#canAdminLifecycle() && this.isCancelled();
  }

  cancel(): void {
    this.#confirmLifecycleChange('cancel');
  }

  reactivate(): void {
    this.#confirmLifecycleChange('reactivate');
  }

  #confirmLifecycleChange(action: 'cancel' | 'reactivate'): void {
    const approval = this.approval();
    const partnerId = this.partnerId();
    if (!approval || partnerId === null || this.isLifecycleUpdating()) {
      return;
    }
    this.#dialogService
      .openConfirmModal(
        this.#translate.instant(`approvals.detail.${action}Dialog.title`),
        this.#translate.instant(`approvals.detail.${action}Dialog.message`),
        { isDestructive: action === 'cancel' },
      )
      .closed$.pipe(
        filter(confirmed => confirmed === true),
        take(1),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => this.#applyLifecycleChange(action, partnerId, approval.id));
  }

  #applyLifecycleChange(action: 'cancel' | 'reactivate', partnerId: number, approvalId: string): void {
    this.isLifecycleUpdating.set(true);
    const request$ = action === 'cancel' ? this.#service.cancel(partnerId, approvalId) : this.#service.reactivate(partnerId, approvalId);
    request$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      error: () => {
        this.isLifecycleUpdating.set(false);
        this.#showLifecycleError(action);
      },
      next: response => {
        this.isLifecycleUpdating.set(false);
        // The projects list is cached and its pending-action counters are derived server-side from
        // the approval's status, so that cache has to be dropped whenever the status may have moved.
        // That covers both outcomes here: a success moved it ourselves, and a rejection means the
        // status had already moved underneath us — so the cached counters are suspect either way.
        this.#projectsService.invalidate(partnerId);
        if (response.error) {
          this.#showLifecycleError(action, response.error.code);
          this.#reloadApproval();
          return;
        }
        if (action === 'cancel') {
          this.#discardUnsavedWork();
        }
        this.#toastService.addSuccess(this.#translate.instant(`approvals.detail.${action}Success`));
        this.#reloadApproval();
      },
    });
  }

  /**
   * A cancelled approval is read-only and the backend rejects every mutation on it, so pending
   * review decisions can never be saved again. Drop them, otherwise the exit guard keeps offering a
   * "Save" that always fails — and because a failed save resolves canDeactivate to false, it traps
   * the user on the page. Marking the group pristine also lets the reload rehydrate the form
   * instead of preserving the stale decisions.
   */
  #discardUnsavedWork(): void {
    this.reviewForm.markAsPristine();
    this.editingAlerts.set(false);
    this.alertConfigControl.markAsPristine();
  }

  /**
   * A cancelled or completed approval renders its alert config read-only, so seed the control from
   * the server and disable it. Reactivating a cancelled approval re-enables it for the normal edit flow.
   */
  #syncAlertConfigAccess(approval: Approval): void {
    if (this.#isFrozenStatus(approval.status)) {
      this.alertConfigControl.setValue(fromAlertConfigPayload(approval.alertConfig), { emitEvent: false });
      this.alertConfigControl.disable({ emitEvent: false });
      return;
    }
    this.showingAlertDetails.set(false);
    this.alertConfigControl.enable({ emitEvent: false });
  }

  #showLifecycleError(action: 'cancel' | 'reactivate', code?: string | number): void {
    const key = code === 'illegal_status_transition' ? `approvals.detail.${action}Conflict` : `approvals.detail.${action}Failed`;
    this.#toastService.addError(this.#translate.instant(key));
  }

  detailFields(approval: Approval): ApprovalDetailField[] {
    const payload = approval.payload ?? {};
    const questions = this.#templateQuestions(payload);
    const questionFields = questions
      .filter(question => question.enabled !== false)
      .map(question => this.#fieldFromQuestion(question, approval))
      .filter((field): field is ApprovalDetailField => field !== null);
    if (questionFields.length) {
      return questionFields;
    }
    return this.#payloadSummaryFields(approval);
  }

  hasSpreadsheetRows(approval: Approval): boolean {
    return this.spreadsheetRows(approval).length > 0;
  }

  /** Which kind of item this approval accepts more of, or null when it's not extendable (marketing copy). */
  addItemsKind(approval: Approval): ApprovalAddItemsKind | null {
    if (this.hasSpreadsheetRows(approval)) {
      return null;
    }
    if (this.hasUrlItems(approval)) {
      return 'url';
    }
    return approval.assets.length > 0 ? 'asset' : null;
  }

  onItemsAdded(): void {
    const partnerId = this.partnerId();
    if (partnerId !== null) {
      this.#projectsService.invalidate(partnerId);
    }
    this.#reloadApproval();
  }

  #sheetUrl(payload: Record<string, unknown>): string | null {
    const spreadsheetId = payload['spreadsheetId'];
    const sheetTabId = payload['sheetTabId'];
    if (typeof spreadsheetId === 'string' && spreadsheetId.trim().length > 0 && typeof sheetTabId === 'number') {
      return `https://docs.google.com/spreadsheets/d/${spreadsheetId.trim()}/edit#gid=${sheetTabId}`;
    }
    const spreadsheetUrl = payload['spreadsheetUrl'];
    return typeof spreadsheetUrl === 'string' && spreadsheetUrl.trim().length > 0 ? spreadsheetUrl.trim() : null;
  }

  spreadsheetRows(approval: Approval): ApprovalRow[] {
    const rows = approval.rows.length > 0 ? approval.rows : this.#sheetPreviewRows(approval);
    return rows.map(row => ({ ...row, status: this.#reviewStatus(approval, row.id) }));
  }

  #reviewSeeds(approval: Approval): ApprovalReviewItemSeed[] {
    const seeds: ApprovalReviewItemSeed[] = [];
    for (const asset of approval.assets) {
      seeds.push({
        itemId: asset.id,
        decision: this.#decisionFromStatus(asset.reviewStatus) ?? this.#decisionFromStatus(this.itemReviewProgress(asset.id)?.ownDecision),
        feedback: asset.reviewFeedback ?? '',
      });
    }
    for (const item of this.#urlItems(approval, false).filter(urlItem => !urlItem.informOnly)) {
      const review = this.#reviewFor(approval, item.id);
      seeds.push({
        itemId: item.id,
        decision: this.#decisionFromReviewStatus(review.status) ?? this.#decisionFromStatus(this.itemReviewProgress(item.id)?.ownDecision),
        feedback: typeof review.feedback === 'string' ? review.feedback : '',
      });
    }
    const rows = approval.rows.length > 0 ? approval.rows : this.#sheetPreviewRows(approval, false);
    for (const row of rows) {
      const review = this.#reviewFor(approval, row.id);
      seeds.push({
        itemId: row.id,
        decision:
          this.#decisionFromStatus(row.status) ??
          this.#decisionFromReviewStatus(review.status) ??
          this.#decisionFromStatus(this.itemReviewProgress(row.id)?.ownDecision),
        feedback: row.comment ?? (typeof review.feedback === 'string' ? review.feedback : ''),
      });
    }
    return seeds;
  }

  hiddenColumns(approval: Approval): number[] {
    const raw = approval.payload?.['hiddenColumns'] ?? approval.payload?.['hidden_columns'];
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.filter((value): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0);
  }

  canEditColumns(approval: Approval): boolean {
    return this.#isFeverUser() && this.hasSpreadsheetRows(approval) && approval.status !== ApprovalStatus.CANCELLED;
  }

  onColumnToggle(approval: Approval, columnIndex: number): void {
    const partnerId = this.partnerId();
    if (partnerId === null) {
      return;
    }
    const current = this.hiddenColumns(approval);
    const next = current.includes(columnIndex)
      ? current.filter(index => index !== columnIndex)
      : [...current, columnIndex].sort((a, b) => a - b);
    this.approval.set({ ...approval, payload: { ...(approval.payload ?? {}), hiddenColumns: next } });
    this.#service
      .setHiddenColumns(partnerId, this.launchId(), approval.id, next, this.currentUserEmail ?? '')
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: response => {
          if (response.error) {
            this.#revertHiddenColumns(current);
          }
        },
        error: () => {
          this.#revertHiddenColumns(current);
        },
      });
  }

  // Revert only the hidden-columns key on the latest approval state so a
  // failed request doesn't clobber other fields updated in the meantime.
  #revertHiddenColumns(columns: number[]): void {
    this.actionError.set(true);
    const latest = this.approval();
    if (latest) {
      this.approval.set({ ...latest, payload: { ...(latest.payload ?? {}), hiddenColumns: columns } });
    }
  }

  #isFeverUser(): boolean {
    return (this.currentUserEmail ?? '').toLowerCase().endsWith('@example.com');
  }

  readonly resending = signal<boolean>(false);
  readonly groupAfterResend = signal<boolean>(false);

  canResend(approval: Approval): boolean {
    return this.#isFeverUser() && this.rejectedRows(approval).length > 0 && approval.status !== ApprovalStatus.CANCELLED;
  }

  rejectedRows(approval: Approval): ApprovalRow[] {
    // Resend targets rejections already saved on the server. Unsaved pending rejections can still
    // be changed, so they must not surface the resend action (or appear in the dialog) yet.
    if (approval.rows.length > 0) {
      return approval.rows.filter(row => row.status === ApprovalStatus.REJECTED);
    }
    return this.#sheetPreviewRows(approval).filter(row => this.#reviewFor(approval, row.id).status === 'REJECTED');
  }

  rowResendLabel(approval: Approval, row: ApprovalRow): string {
    return this.#resendPreviewColumns(approval)
      .map(column => this.#cellValue(row, column))
      .filter(Boolean)
      .join(' · ');
  }

  openResendDialog(approval: Approval): void {
    if (this.resending()) {
      return;
    }
    const items = this.rejectedRows(approval).map(row => ({ id: row.id, label: this.rowResendLabel(approval, row) || row.id }));
    if (items.length === 0) {
      return;
    }
    this.#dialogService
      .openModal<ResendDialogResult, ResendDialogData>(ApprovalResendDialogComponent, { data: { items } })
      .closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(itemIds => {
        if (itemIds && itemIds.length > 0) {
          this.#resend(approval, itemIds);
        }
      });
  }

  #resend(approval: Approval, itemIds: string[]): void {
    const partnerId = this.partnerId();
    if (partnerId === null || this.resending() || itemIds.length === 0) {
      return;
    }
    this.resending.set(true);
    this.actionError.set(false);
    this.#skippedItemReasons.set({});
    this.actionErrorMessage.set(null);
    this.#service
      .resendForReview(partnerId, this.launchId(), approval.id, itemIds, this.currentUserEmail ?? '')
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: response => {
          this.resending.set(false);
          if (response.error) {
            this.actionError.set(true);
            return;
          }
          this.groupAfterResend.set(true);
          this.#reloadApproval();
        },
        error: () => {
          this.resending.set(false);
          this.actionError.set(true);
        },
      });
  }

  #resendPreviewColumns(approval: Approval): string[] {
    const keys = new Set<string>();
    for (const row of this.spreadsheetRows(approval)) {
      Object.keys(row.values ?? {}).forEach(key => keys.add(key));
    }
    return Array.from(keys).slice(0, 4);
  }

  #cellValue(row: ApprovalRow, column: string): string {
    const value = row.values?.[column];
    return value === null || value === undefined ? '' : String(value);
  }

  hasAction(approval: Approval, action: ApprovalAction): boolean {
    return approval.availableActions.includes(action);
  }

  canInformOpen(approval: Approval): boolean {
    return this.#canCreate() && this.hasAction(approval, 'inform_open');
  }

  canReviewItems(approval: Approval): boolean {
    return (
      this.canSubmit() &&
      this.#isOneOfTheReviewers(approval) &&
      approval.status !== ApprovalStatus.APPROVED &&
      approval.status !== ApprovalStatus.REJECTED &&
      approval.status !== ApprovalStatus.COMPLETED &&
      approval.status !== ApprovalStatus.CANCELLED
    );
  }

  #isOneOfTheReviewers(approval: Approval): boolean {
    return approval.ownCanReview;
  }

  isReviewing(itemId: string): boolean {
    return this.reviewingItemIds().has(itemId);
  }

  // Any action in flight refuses every decision, not just the items it covers, so every pill has to
  // look it. Leaving the untouched ones clickable made those clicks vanish with no feedback.
  reviewsBlocked(itemId: string): boolean {
    return this.actionInProgress() !== null || this.isReviewing(itemId);
  }

  reviewItem(itemId: string, decision: ApprovalItemReviewDecision): void {
    this.reviewItems([itemId], decision);
  }

  canRemoveItem(approval: Approval, itemId: string): boolean {
    const asset = this.#findAsset(approval, itemId);
    if (asset !== undefined && isRemovableBeforeDrive(asset)) {
      return this.#canActBeforeDrive();
    }
    if (!this.#canCreate()) {
      return false;
    }
    if (asset !== undefined ? !hasReachedReviewTool(asset) : !this.urlItems(approval).some(item => item.id === itemId)) {
      return false;
    }
    const undecided = !this.isDecidedStatus(this.#persistedItemStatus(approval, itemId));
    const nobodyDecided = (this.itemReviewProgress(itemId)?.decidedReviewers ?? 0) === 0;
    return undecided && nobodyDecided;
  }

  canCommentOnAsset(approval: Approval, asset: ApprovalAsset): boolean {
    return approval.itemComments.enabled && hasReachedReviewTool(asset);
  }

  canCommentOnUrl(approval: Approval): boolean {
    return approval.itemComments.enabled;
  }

  itemCommentCount(itemId: string): number {
    return this.#commentCounts.counts()[itemId] ?? 0;
  }

  isCommentThreadOpen(itemId: string): boolean {
    return this.#openCommentThreadIds().has(itemId);
  }

  isCommentThreadMounted(itemId: string): boolean {
    return this.isCommentThreadOpen(itemId) || this.#postingCommentThreadIds().has(itemId);
  }

  hasItemComments(itemId: string): boolean {
    return this.itemCommentCount(itemId) > 0;
  }

  commentToggleLabel(itemId: string): string {
    const count = this.itemCommentCount(itemId);
    return count > 0
      ? this.#translate.instant('approvals.detail.comments.toggle', { count })
      : this.#translate.instant('approvals.detail.comments.toggleEmpty');
  }

  folderCommentedItemCount(folder: ApprovalAssetTreeFolder): number {
    return this.#folderCommentCounts().get(folder.key) ?? 0;
  }

  onItemCommentSubmittingChange(itemId: string, submitting: boolean): void {
    const next = new Set(this.#postingCommentThreadIds());
    if (submitting) {
      next.add(itemId);
    } else {
      next.delete(itemId);
    }
    this.#postingCommentThreadIds.set(next);
  }

  toggleCommentThread(itemId: string): void {
    const next = new Set(this.#openCommentThreadIds());
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    this.#openCommentThreadIds.set(next);
  }

  onItemCommentCountChange(itemId: string, count: number): void {
    this.#commentCounts.set(itemId, count);
  }

  onItemCommentAccessChanged(): void {
    this.#stateRevision++;
    this.#refreshShownApproval$().pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
  }

  protected onItemCommentMentionAccessAddingChange(itemId: string, isAdding: boolean): void {
    const next = new Set(this.#addingMentionAccessThreadIds());
    if (isAdding) {
      next.add(itemId);
    } else {
      next.delete(itemId);
    }
    this.#addingMentionAccessThreadIds.set(next);
  }

  protected onItemCommentMentionAccessGranted(): void {
    this.#stateRevision++;
    this.#alertConfigRevision++;
    this.#isAlertConfigStale = true;
    if (this.editingAlerts()) {
      this.closeAlertsEditor();
      this.alertConfigControl.markAsPristine();
      this.#isAlertsReloadNoticePending = true;
    }
    this.#refreshShownApproval$()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(isApplied => {
        if (!isApplied && this.#isAlertsReloadNoticePending) {
          this.#isAlertsReloadNoticePending = false;
          this.#toastService.addError(this.#translate.instant('approvals.detail.comments.alertsReloadError'));
        }
      });
  }

  #reloadAlertsForEditor(): void {
    if (this.#isReloadingAlerts()) {
      return;
    }
    this.#isReloadingAlerts.set(true);
    const approvalId = this.#loadedApprovalId;
    this.#refreshShownApproval$()
      .pipe(defaultIfEmpty(null), takeUntilDestroyed(this.#destroyRef))
      .subscribe(isApplied => {
        if (approvalId !== this.#loadedApprovalId) {
          return;
        }
        this.#isReloadingAlerts.set(false);
        if (isApplied === false) {
          this.#toastService.addError(this.#translate.instant('approvals.detail.comments.alertsReloadError'));
          return;
        }
        if (this.canManageAlerts() && !this.editingAlerts()) {
          this.openAlertsEditor();
        }
      });
  }

  #refreshShownApproval$(): Observable<boolean> {
    const revision = this.#alertConfigRevision;
    return this.#fetchShownApproval$().pipe(
      defaultIfEmpty(null),
      filter(response => revision === this.#alertConfigRevision && (!response?.data || response.data.id === this.approval()?.id)),
      map(response => this.#applyShownApprovalRefresh(response)),
    );
  }

  #applyShownApprovalRefresh(response: BaseResponse<Approval | null> | null): boolean {
    if (response === null || response.error !== null || response.data === null) {
      return false;
    }
    this.#isAlertConfigStale = false;
    this.#applyRefreshedApproval(response.data);
    this.#showAlertsReloadNotice();
    return true;
  }

  #showAlertsReloadNotice(): void {
    if (!this.#isAlertsReloadNoticePending) {
      return;
    }
    this.#isAlertsReloadNoticePending = false;
    this.#toastService.add({
      autoHide: true,
      message: this.#translate.instant('approvals.detail.comments.alertsReloadedAfterMentionAccess'),
      sentiment: 'info',
    });
  }

  onItemCommentEdited(): void {
    const partnerId = this.partnerId();
    const approvalId = this.approval()?.id;
    if (partnerId === null || approvalId === undefined) {
      return;
    }
    this.#stateRevision++;
    const revision = ++this.#historyRevision;
    this.#service
      .get(partnerId, this.launchId(), approvalId)
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((response: BaseResponse<Approval | null> | null) => {
        const refreshed = response?.data;
        const current = this.approval();
        const isStale = revision !== this.#historyRevision || current?.id !== approvalId || refreshed?.id !== approvalId;
        if (response?.error || !refreshed || !current || isStale) {
          return;
        }
        this.approval.set({ ...current, editHistory: refreshed.editHistory });
      });
  }

  urlTableColumnCount(approval: Approval): number {
    return 3 + (this.canReviewItems(approval) ? 1 : 0) + (this.canRemoveAnyUrlItem(approval) ? 1 : 0);
  }

  canRemoveAnyUrlItem(approval: Approval): boolean {
    return this.urlItems(approval).some(item => this.canRemoveItem(approval, item.id));
  }

  removeItem(itemId: string): void {
    const approval = this.approval();
    const partnerId = this.partnerId();
    if (!approval || partnerId === null || this.actionInProgress() !== null || !this.canRemoveItem(approval, itemId)) {
      return;
    }
    const isBeforeDrive = this.#isRemovableBeforeDrive(approval, itemId);
    this.#dialogService
      .openConfirmModal(this.#translate.instant('approvals.detail.removeItem.title'), this.#removeItemMessage(approval, itemId), {
        isDestructive: true,
      })
      .closed$.pipe(
        filter((isConfirmed: boolean | undefined) => isConfirmed === true),
        take(1),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.#applyRemoveItem(partnerId, approval.id, itemId, isBeforeDrive);
      });
  }

  #removeItemMessage(approval: Approval, itemId: string): string {
    const message = this.#translate.instant(this.#removeItemMessageKey(approval, itemId), { name: this.#itemLabel(approval, itemId) });
    if (!this.#removalCancelsApproval(approval)) {
      return message;
    }
    return `${message} ${this.#translate.instant('approvals.detail.removeItem.lastItemWarning')}`;
  }

  #removeItemMessageKey(approval: Approval, itemId: string): string {
    if (this.#isZiflowItem(itemId)) {
      return 'approvals.detail.removeItem.ziflowMessage';
    }
    const asset = this.#findAsset(approval, itemId);
    if (asset?.isDriveLinkImport === true) {
      return 'approvals.detail.removeItem.failedLinkImportMessage';
    }
    if (asset !== undefined && isDriveSyncStopped(asset.driveSyncStatus)) {
      return 'approvals.detail.removeItem.failedSyncMessage';
    }
    if (asset?.driveSyncStatus === DriveSyncStatus.SYNCING_TO_DRIVE) {
      return 'approvals.detail.removeItem.syncingMessage';
    }
    if (asset !== undefined) {
      return 'approvals.detail.removeItem.fileMessage';
    }
    return 'approvals.detail.removeItem.message';
  }

  #removalCancelsApproval(approval: Approval): boolean {
    return this.#isOpenForReview(approval.status) && approval.assets.length + this.urlItems(approval).length === 1;
  }

  // A removal can freeze the approval server-side (cancelled when it emptied, completed when the
  // survivors are all decided), so the projects cache and any unsaved alert-config edit must go.
  #applyRemoveItem(partnerId: number, approvalId: string, itemId: string, isBeforeDrive: boolean): void {
    this.#setActionInProgress('remove_item');
    this.#removeItemRequest$(partnerId, approvalId, itemId, isBeforeDrive)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response: BaseResponse<ApprovalItemRemovalResponse | null>) => {
          if (response.error !== null && isOutdatedItemError(response.error.code)) {
            this.#refreshAfterItemAction();
            return;
          }
          if (response.error !== null) {
            this.#setActionInProgress(null);
            this.#showRemoveItemError(response.error.code);
            return;
          }
          this.#projectsService.invalidate(partnerId);
          this.#forgetItem(itemId);
          this.#reloadApproval(() => {
            this.#discardUnsavedWorkIfFrozen(this.approval()?.status);
            this.#toastService.addSuccess(this.#translate.instant('approvals.detail.removeItem.success'));
          });
        },
        error: () => {
          this.#setActionInProgress(null);
          this.#showRemoveItemError();
        },
      });
  }

  #removeItemRequest$(
    partnerId: number,
    approvalId: string,
    itemId: string,
    isBeforeDrive: boolean,
  ): Observable<BaseResponse<ApprovalItemRemovalResponse | null>> {
    return isBeforeDrive
      ? this.#service.removeUnsyncedFile(partnerId, this.launchId(), approvalId, itemId)
      : this.#service.removeItem(partnerId, this.launchId(), approvalId, itemId);
  }

  #isRemovableBeforeDrive(approval: Approval, itemId: string): boolean {
    const asset = this.#findAsset(approval, itemId);
    return asset !== undefined && isRemovableBeforeDrive(asset);
  }

  #findAsset(approval: Approval, itemId: string): ApprovalAsset | undefined {
    return approval.assets.find((asset: ApprovalAsset) => asset.id === itemId);
  }

  #discardUnsavedWorkIfFrozen(status: ApprovalStatus | string | undefined): void {
    if (this.#isFrozenStatus(status)) {
      this.#discardUnsavedWork();
    }
  }

  #showRemoveItemError(code?: string | number): void {
    const key = code === 'item_already_decided' ? 'approvals.detail.removeItem.alreadyDecided' : 'approvals.detail.removeItem.failed';
    this.#toastService.addError(this.#translate.instant(key));
  }

  protected canRetryDriveSync(asset: ApprovalAsset): boolean {
    return isDriveSyncStopped(asset.driveSyncStatus) && this.#canActBeforeDrive();
  }

  #canActBeforeDrive(): boolean {
    return this.#canEditApproval() && this.#isOpenForReview(this.approval()?.status);
  }

  #isOpenForReview(status: ApprovalStatus | undefined): boolean {
    return status === ApprovalStatus.IN_REVIEW || status === ApprovalStatus.CHANGES_REQUESTED;
  }

  protected isRetryingDriveSync(asset: ApprovalAsset): boolean {
    return this.actionInProgress() === 'retry_drive_sync' && this.#retryingDriveSyncAssetId() === asset.id;
  }

  protected retryDriveSync(asset: ApprovalAsset): void {
    const approval = this.approval();
    const partnerId = this.partnerId();
    if (approval === null || partnerId === null || this.actionInProgress() !== null || !this.canRetryDriveSync(asset)) {
      return;
    }
    this.#retryingDriveSyncAssetId.set(asset.id);
    this.#setActionInProgress('retry_drive_sync');
    this.#service
      .retryFileDriveSync(partnerId, this.launchId(), approval.id, asset.id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response: BaseResponse<ApprovalFileDriveSyncRetryResponse | null>) => {
          if (response.error !== null && !isOutdatedItemError(response.error.code)) {
            this.#failDriveSyncRetry(asset);
            return;
          }
          this.#refreshAfterItemAction();
        },
        error: () => {
          this.#failDriveSyncRetry(asset);
        },
      });
  }

  #failDriveSyncRetry(asset: ApprovalAsset): void {
    this.#setActionInProgress(null);
    const message =
      asset.isDriveLinkImport === true
        ? this.#translate.instant('approvals.detail.retryDriveSync.linkImportFailed', { name: asset.fileName })
        : this.#translate.instant('approvals.detail.retryDriveSync.failed');
    this.#toastService.addError(message);
  }

  #refreshAfterItemAction(): void {
    this.#fetchShownApproval$()
      .pipe(defaultIfEmpty(null), takeUntilDestroyed(this.#destroyRef))
      .subscribe((response: BaseResponse<Approval | null> | null) => {
        this.#setActionInProgress(null);
        this.#applyDriveSyncRefresh(response);
      });
  }

  #forgetItem(itemId: string): void {
    this.selectedItemIds.set(new Set<string>());
    this.#draftRejectReasons.delete(itemId);
    if (itemId.startsWith('url-')) {
      [...this.#draftRejectReasons.keys()].filter(key => key.startsWith('url-')).forEach(key => this.#draftRejectReasons.delete(key));
    }
  }

  reviewRows(event: { itemIds: string[]; decision: ApprovalItemReviewDecision }): void {
    this.reviewItems(event.itemIds, event.decision);
  }

  bulkReviewItems(decision: ApprovalItemReviewDecision): void {
    const itemIds = [...this.selectedItemIds()];
    if (itemIds.length === 0) {
      return;
    }
    this.reviewItems(itemIds, decision, { clearSelection: true });
  }

  reviewItems(itemIds: string[], decision: ApprovalItemReviewDecision, options?: { clearSelection?: boolean }): void {
    const approval = this.approval();
    const decidable = itemIds.filter(itemId => !this.#isZiflowItem(itemId));
    if (!approval || decidable.length === 0 || this.actionInProgress() !== null) {
      return;
    }
    if (decision === 'REJECT') {
      this.#openRejectReasonDialog(approval, decidable, options?.clearSelection ?? false);
      return;
    }
    const items = decidable.map(itemId => ({ itemId, decision, feedback: '' }));
    this.#confirmCompletionThenSubmit(approval, items, options?.clearSelection ?? false);
  }

  /** Would this action leave the approval with no required item left to review? */
  #wouldCompleteApproval(items: { itemId: string; decision: ApprovalItemReviewDecision }[]): boolean {
    const pending = this.pendingRequiredItemIds();
    if (this.#hasFileOutsideDrive() || pending.size === 0 || items.some(item => item.decision === 'PENDING')) {
      return false;
    }
    const byId = new Map(items.map(item => [item.itemId, item.decision]));
    return [...pending].every(itemId => {
      const decision = byId.get(itemId);
      return decision !== undefined && this.#decisionSettlesItem(itemId, decision);
    });
  }

  itemReviewProgress(itemId: string): ApprovalReviewProgress | undefined {
    return this.approval()?.reviewProgressByItem?.[itemId];
  }

  readonly skippedReasonKeys = computed<string[]>(() => {
    const keys = new Set<string>();
    for (const reason of Object.values(this.#skippedItemReasons())) {
      keys.add(reason === 'cannot_be_undone' ? 'approvals.detail.skipped.cannotBeUndone' : 'approvals.detail.skipped.notAReviewer');
    }
    return [...keys];
  });

  #decisionSettlesItem(itemId: string, decision: ApprovalItemReviewDecision): boolean {
    const progress = this.itemReviewProgress(itemId);
    if (progress?.ownCanDecide === false) {
      return false;
    }
    if (!progress || progress.totalReviewers === 0) {
      return true;
    }
    if (decision === 'REJECT') {
      return true;
    }
    if (this.#isZiflowItem(itemId) && !progress.ownReachesZiflow) {
      return false;
    }
    if (progress.mode === 'only_one') {
      return true;
    }
    if (progress.ownDecision) {
      return false;
    }
    return progress.decidedReviewers === progress.totalReviewers - 1;
  }

  #isZiflowItem(itemId: string): boolean {
    return !!this.approval()?.assets.some(asset => asset.id === itemId && asset.isZiflow);
  }

  canDecideItem(approval: Approval, itemId: string): boolean {
    return this.canReviewItems(approval) && this.itemReviewProgress(itemId)?.ownCanDecide !== false;
  }

  canDecideAsset(approval: Approval, asset: ApprovalAsset): boolean {
    return isHubDecidableAsset(asset) && this.canDecideItem(approval, asset.id);
  }

  reviewProgress(asset: ApprovalAsset): ApprovalReviewProgress | undefined {
    return this.itemReviewProgress(asset.id);
  }

  #confirmCompletionThenSubmit(
    approval: Approval,
    items: { itemId: string; decision: ApprovalItemReviewDecision; feedback: string }[],
    clearSelection: boolean,
  ): void {
    if (!this.#wouldCompleteApproval(items)) {
      this.#submitReviews(approval, items, clearSelection);
      return;
    }
    this.#dialogService
      .openModal<ConfirmDialogResult, ConfirmDialogData>(ConfirmDialogComponent, {
        size: 'sm',
        data: {
          messageKey: 'approvals.detail.confirmComplete.message',
          titleKey: 'approvals.detail.confirmComplete.title',
        },
      })
      .closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(result => {
        if (result?.confirmed) {
          this.#submitReviews(approval, items, clearSelection);
        }
      });
  }

  #submitReviews(
    approval: Approval,
    items: { itemId: string; decision: ApprovalItemReviewDecision; feedback: string }[],
    clearSelection: boolean,
  ): void {
    const partnerId = this.partnerId();
    if (partnerId === null || items.length === 0) {
      return;
    }
    if (this.actionInProgress() !== null) {
      // The reason and confirmation dialogs are async, so another action can start while the
      // reviewer types. Dropping their input with no message reads as the click never happening.
      this.#keepDraftReasons(items);
      this.actionError.set(true);
      this.actionErrorMessage.set(null);
      this.#changeDetectorRef.markForCheck();
      return;
    }
    const previousSelection = new Set(this.selectedItemIds());
    const previous = new Map(
      items.map(item => [item.itemId, approvalReviewItemGroup(this.reviewForm, item.itemId)?.controls.decision.value ?? null]),
    );
    for (const item of items) {
      if (item.decision === 'PENDING') {
        // Not #restoreReviews: the stored decision is the one being undone, so restoring it would
        // leave the pill showing exactly what the click is clearing.
        this.#clearReviewItem(item.itemId);
      } else {
        setApprovalReviewDecision(this.reviewForm, item.itemId, item.decision, item.feedback);
      }
    }
    if (clearSelection) {
      this.selectedItemIds.set(new Set<string>());
    }
    this.reviewingItemIds.set(new Set(items.map(item => item.itemId)));
    this.#setActionInProgress('save_reviews');
    this.actionError.set(false);
    this.actionErrorMessage.set(null);
    this.#skippedItemReasons.set({});
    this.#reviewStagingVersion.update(version => version + 1);
    this.#changeDetectorRef.markForCheck();
    this.#service
      .reviewItemsBatch(partnerId, this.launchId(), approval.id, items, this.currentUserEmail ?? '')
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: response => {
          // Deciding the last required item derives COMPLETED server-side, which changes the cached
          // pending counters; an error means the status may have moved underneath us either way.
          this.#projectsService.invalidate(partnerId);
          if (response.error) {
            this.#revertReviews(previous, items, previousSelection);
            this.actionError.set(true);
            this.actionErrorMessage.set(typeof response.error.message === 'string' ? response.error.message : null);
            this.#finishReviewSubmission();
            return;
          }
          this.reviewForm.markAsPristine();
          const refused = this.#applyReviewResponse(approval, response.data ?? null, items);
          items.filter(item => !refused.has(item.itemId)).forEach(item => this.#draftRejectReasons.delete(item.itemId));
          this.#revertSkippedReviews(previous, items, refused, previousSelection, clearSelection);
          this.#finishReviewSubmission();
          this.#refreshItemComments(
            items
              .filter(item => !refused.has(item.itemId) && item.decision === 'REJECT' && item.feedback.trim().length > 0)
              .map(item => item.itemId),
          );
        },
        error: () => {
          this.#revertReviews(previous, items, previousSelection);
          this.actionError.set(true);
          this.#finishReviewSubmission();
        },
      });
  }

  // The endpoint already returns the recomputed approval, so local state is patched from it instead
  // of re-fetching. A reload would re-read assets and import jobs on every click — and on a
  // spreadsheet approval it also costs another Google Sheets round trip.
  #applyReviewResponse(
    approval: Approval,
    data: ApprovalItemsReviewResponse | null,
    items: { itemId: string; decision: ApprovalItemReviewDecision; feedback: string }[],
  ): ReadonlySet<string> {
    const skipped = data?.skipped_items ?? {};
    this.#skippedItemReasons.set({ ...skipped });
    const refused = new Set(Object.keys(skipped));
    for (const item of items) {
      if (refused.has(item.itemId)) {
        continue;
      }
      this.#initialReviewFeedback.set(item.itemId, item.feedback);
    }
    if (data === null) {
      return refused;
    }
    const latest = this.approval();
    const base = latest !== null && latest.id === approval.id ? latest : approval;
    const itemReviews = (data.item_reviews ?? {}) as Record<string, unknown>;
    const progressByItem = data.review_progress_by_item ? mapReviewProgressByItem(data.review_progress_by_item) : base.reviewProgressByItem;
    this.pendingRequiredItemIds.set(new Set(data.pending_required_item_ids ?? []));
    this.approval.set({
      ...base,
      status: parseApprovalStatus(data.status),
      payload: { ...(base.payload ?? {}), item_reviews: itemReviews },
      // item_reviews is the complete map, so an item missing from it is undecided. Falling back to
      // the previous value would keep a decision the reviewer just cleared.
      assets: base.assets.map(asset => ({
        ...asset,
        reviewStatus: this.#reviewStatusFrom(itemReviews, asset.id),
        reviewFeedback: this.#reviewFeedbackFrom(itemReviews, asset.id),
      })),
      rows: base.rows.map(row => ({
        ...row,
        status: this.#reviewStatusFrom(itemReviews, row.id) ?? ApprovalStatus.IN_REVIEW,
        comment: this.#reviewFeedbackFrom(itemReviews, row.id),
      })),
      reviewProgressByItem: progressByItem,
      pendingRequiredItemIds: data.pending_required_item_ids ?? base.pendingRequiredItemIds,
    });
    this.#syncReviewFormDisabledState();
    const next = this.approval();
    if (next) {
      this.#syncAlertConfigAccess(next);
      if (this.isAlertConfigFrozen()) {
        this.closeAlertsEditor();
        this.alertConfigControl.markAsPristine();
      }
    }
    return refused;
  }

  // item_reviews only ever holds APPROVED or REJECTED; anything else means the item is undecided,
  // so the asset keeps no review status rather than being mapped to some unrelated one.
  #reviewFeedbackFrom(itemReviews: Record<string, unknown>, itemId: string): string | undefined {
    const review = itemReviews[itemId];
    const feedback = review && typeof review === 'object' ? (review as { feedback?: unknown }).feedback : undefined;
    return typeof feedback === 'string' && feedback.length > 0 ? feedback : undefined;
  }

  #reviewStatusFrom(itemReviews: Record<string, unknown>, itemId: string): ApprovalStatus | undefined {
    const review = itemReviews[itemId];
    const status = review && typeof review === 'object' ? (review as { status?: unknown }).status : undefined;
    if (status === ApprovalStatus.APPROVED || status === ApprovalStatus.REJECTED) {
      return status;
    }
    return undefined;
  }

  // The decision did not land, so it goes back. What the reviewer typed did not fail at anything,
  // so it stays: retyping eight reasons is not a reasonable price for a failed request. The
  // selection comes back for the same reason.
  #revertReviews(
    previous: Map<string, ApprovalItemReviewDecision | null>,
    submitted: { itemId: string; feedback: string }[],
    previousSelection: ReadonlySet<string>,
  ): void {
    this.#restoreReviews(previous, submitted, true);
    this.selectedItemIds.set(previousSelection);
  }

  #revertSkippedReviews(
    previous: Map<string, ApprovalItemReviewDecision | null>,
    submitted: { itemId: string; feedback: string }[],
    refused: ReadonlySet<string>,
    previousSelection: ReadonlySet<string>,
    selectionWasCleared: boolean,
  ): void {
    const skipped = submitted.filter(item => refused.has(item.itemId));
    if (skipped.length === 0) {
      return;
    }
    this.#restoreReviews(previous, skipped, true);
    if (selectionWasCleared) {
      this.selectedItemIds.set(new Set([...previousSelection].filter(itemId => refused.has(itemId))));
    }
  }

  #restoreReviews(
    previous: Map<string, ApprovalItemReviewDecision | null>,
    items: { itemId: string; feedback: string }[],
    pristine: boolean,
  ): void {
    this.#keepDraftReasons(items);
    for (const item of items) {
      const decision = previous.get(item.itemId) ?? null;
      const feedback = this.#initialReviewFeedback.get(item.itemId) ?? '';
      if (decision === null) {
        this.#clearReviewItem(item.itemId, feedback);
        continue;
      }
      setApprovalReviewDecision(this.reviewForm, item.itemId, decision, feedback);
      if (pristine) {
        approvalReviewItemGroup(this.reviewForm, item.itemId)?.markAsPristine();
      }
    }
  }

  #keepDraftReasons(items: { itemId: string; feedback: string }[]): void {
    for (const item of items) {
      if (item.feedback) {
        this.#draftRejectReasons.set(item.itemId, item.feedback);
      }
    }
  }

  #refreshItemComments(reviewedItemIds: string[]): void {
    if (reviewedItemIds.length === 0 || !this.approval()?.itemComments.enabled) {
      return;
    }
    const reviewed = new Set(reviewedItemIds);
    this.commentThreads()
      .filter(thread => reviewed.has(thread.itemId()))
      .forEach(thread => thread.reload());
    this.#fetchShownApproval$().pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
  }

  #finishReviewSubmission(): void {
    this.reviewingItemIds.set(new Set<string>());
    this.#setActionInProgress(null);
    this.#reviewStagingVersion.update(version => version + 1);
    this.#changeDetectorRef.markForCheck();
  }

  #openRejectReasonDialog(approval: Approval, itemIds: string[], clearSelection = false): void {
    const data: RejectReasonDialogData = {
      items: itemIds.map(itemId => ({ id: itemId, label: this.#itemLabel(approval, itemId) })),
      // A retry after a failed or blocked submit starts from what was typed, not an empty form.
      initialReasons: Object.fromEntries(itemIds.map(itemId => [itemId, this.#draftRejectReasons.get(itemId) ?? ''])),
    };
    this.#dialogService
      .openModal<RejectReasonDialogResult, RejectReasonDialogData>(ApprovalRejectReasonDialogComponent, { data })
      .closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(reasons => {
        if (!reasons) {
          return;
        }
        const items = itemIds.map(itemId => ({
          itemId,
          decision: 'REJECT' as ApprovalItemReviewDecision,
          feedback: reasons[itemId] ?? '',
        }));
        this.#confirmCompletionThenSubmit(approval, items, clearSelection);
      });
  }

  #itemLabel(approval: Approval, itemId: string): string {
    const asset = approval.assets.find(item => item.id === itemId);
    if (asset) {
      return asset.fileName;
    }
    const urlItem = this.urlItems(approval).find(item => item.id === itemId);
    if (urlItem) {
      return urlItem.url;
    }
    const row = this.spreadsheetRows(approval).find(item => item.id === itemId);
    if (row) {
      return this.rowResendLabel(approval, row) || itemId;
    }
    return itemId;
  }

  // Review decisions are persisted as they are taken, so the only work that can be lost on the way
  // out is an unsaved alert-config edit.
  canDeactivate(): boolean | Observable<boolean> {
    if (!this.hasAlertEdits()) {
      return true;
    }
    return this.#dialogService.openModal<UnsavedChangesExitChoice>(UnsavedChangesExitDialogComponent, { size: 'sm' }).closed$.pipe(
      take(1),
      switchMap(choice => {
        if (choice === 'discard') {
          return of(true);
        }
        if (choice === 'save') {
          return this.#saveAlertConfig$();
        }
        return of(false);
      }),
    );
  }

  hasAlertEdits(): boolean {
    return this.editingAlerts() && this.alertConfigControl.dirty;
  }

  #saveAlertConfig$(): Observable<boolean> {
    const approval = this.approval();
    const partnerId = this.partnerId();
    if (!this.hasAlertEdits() || !approval || partnerId === null) {
      return of(true);
    }
    if (this.isAddingMentionAccess()) {
      return of(false);
    }
    if (validationModeNeedsRecipient(this.alertConfigControl.value)) {
      return of(false);
    }
    if (!this.isAlertConfigDirectoryLoaded()) {
      this.alertsSaveError.set(true);
      return of(false);
    }
    const payload = toAlertConfigPayload(this.alertConfigControl.value) ?? {};
    this.savingAlerts.set(true);
    return this.#service.updateAlertConfig(partnerId, approval.id, payload).pipe(
      map(response => !response.error),
      catchError(() => of(false)),
      finalize(() => this.savingAlerts.set(false)),
    );
  }

  assetDisplayStatus(asset: ApprovalAsset, approval: Approval): ApprovalStatus | string {
    const decision = approvalReviewItemGroup(this.reviewForm, asset.id)?.controls.decision.value;
    if (decision && this.#decisionSettlesItem(asset.id, decision)) {
      return this.#decisionStatus(decision);
    }
    return asset.reviewStatus ?? approval.status;
  }

  // Same icons as the information-request file tree (ir-file-tree-branch), so both trees look alike.
  readonly assetFolderIcon: IgntButtonIcon = { name: 'folder', variant: 'light' };
  readonly approveActionIcon: IgntButtonIcon = { name: 'check-circle', variant: 'solid' };
  readonly rejectActionIcon: IgntButtonIcon = { name: 'times-circle', variant: 'solid' };
  readonly ziflowReviewIcon: IgntButtonIcon = { name: 'arrow-up-right-from-square', variant: 'regular' };

  assetFolderChevron(folderKey: string): IgntButtonIcon {
    return { name: this.isAssetFolderExpanded(folderKey) ? 'chevron-down' : 'chevron-right', variant: 'light' };
  }

  isAssetFolderExpanded(folderKey: string): boolean {
    return !this.#collapsedAssetFolders().has(folderKey);
  }

  toggleAssetFolder(folderKey: string): void {
    const next = new Set(this.#collapsedAssetFolders());
    if (next.has(folderKey)) {
      next.delete(folderKey);
    } else {
      next.add(folderKey);
    }
    this.#collapsedAssetFolders.set(next);
  }

  // Folder bulk review is a frontend convenience: it stages one decision per asset under the
  // folder (nested subfolders included) in the review form; saving submits them all in the
  // single existing batch review request. The backend keeps recording per-file reviews only.
  canReviewFolder(approval: Approval, folder: ApprovalAssetTreeFolder): boolean {
    return this.canReviewItems(approval) && this.#decidableDescendants(folder).length > 0;
  }

  reviewFolderAssets(folder: ApprovalAssetTreeFolder, decision: ApprovalItemReviewDecision): void {
    this.reviewItems(
      this.#decidableDescendants(folder).map(asset => asset.id),
      decision,
    );
  }

  #decidableDescendants(folder: ApprovalAssetTreeFolder): ApprovalAsset[] {
    const approval = this.approval();
    if (!approval) {
      return [];
    }
    return folder.descendants.filter(asset => this.canDecideAsset(approval, asset));
  }

  // A folder is "selected" only when every asset under it (nested subfolders included) is selected.
  isAssetFolderSelected(folder: ApprovalAssetTreeFolder): boolean {
    return this.#folderSelection().get(folder.key) ?? false;
  }

  toggleAssetFolderSelected(folder: ApprovalAssetTreeFolder, selected: boolean): void {
    const next = new Set(this.selectedItemIds());
    for (const asset of this.#decidableDescendants(folder)) {
      if (selected) {
        next.add(asset.id);
      } else {
        next.delete(asset.id);
      }
    }
    this.selectedItemIds.set(next);
  }

  folderRollup(folder: ApprovalAssetTreeFolder): ApprovalFolderRollup | null {
    return this.#folderRollups().get(folder.key) ?? null;
  }

  // Rollup state derived client-side from the per-asset outcomes (staged or persisted):
  // every asset approved / every asset rejected / some decided → mixed / none decided → null (no tag).
  #deriveFolderRollup(approval: Approval, folder: ApprovalAssetTreeFolder): ApprovalFolderRollup | null {
    if (folder.descendants.length === 0) {
      return null;
    }
    const statuses = folder.descendants.map(asset => this.assetDisplayStatus(asset, approval));
    if (statuses.every(status => status === ApprovalStatus.APPROVED)) {
      return 'approved';
    }
    if (statuses.every(status => status === ApprovalStatus.REJECTED)) {
      return 'rejected';
    }
    if (statuses.some(status => status === ApprovalStatus.APPROVED || status === ApprovalStatus.REJECTED)) {
      return 'mixed';
    }
    return null;
  }

  folderRollupSentiment(rollup: ApprovalFolderRollup): TagSentiment {
    switch (rollup) {
      case 'approved':
        return 'positive';
      case 'rejected':
        return 'danger';
      case 'mixed':
        return 'warning';
    }
  }

  urlItems(approval: Approval): ApprovalUrlItem[] {
    return this.#urlItems(approval, true);
  }

  #urlItems(approval: Approval, includeFormState: boolean): ApprovalUrlItem[] {
    const payload = approval.payload ?? {};
    const urls = Array.isArray(payload['urls']) ? (payload['urls'] as unknown[]) : [];
    const descriptions = Array.isArray(payload['urlDescriptions']) ? (payload['urlDescriptions'] as unknown[]) : [];
    const modes = Array.isArray(payload['urlPartnerReviewModes']) ? (payload['urlPartnerReviewModes'] as unknown[]) : [];
    const legacyInform = payload['partnerReviewMode'] === 'inform';
    const items: ApprovalUrlItem[] = [];
    urls.forEach((rawUrl, originalIndex) => {
      const url = this.#formatValue(rawUrl).trim();
      if (!url) {
        return;
      }
      const id = `url-${originalIndex}`;
      const mode = modes[originalIndex];
      const informOnly = mode === 'inform' || (mode === undefined && legacyInform);
      items.push({
        id,
        url,
        description: this.#formatValue(descriptions[originalIndex]),
        status: includeFormState ? this.#reviewStatus(approval, id) : this.#persistedReviewStatus(approval, id),
        informOnly,
      });
    });
    return items;
  }

  // Inform-only items need no partner decision, so they never enter selection or completion counts.
  reviewableUrlItems(approval: Approval): ApprovalUrlItem[] {
    return this.urlItems(approval).filter(item => !item.informOnly);
  }

  hasUrlItems(approval: Approval): boolean {
    return this.urlItems(approval).length > 0;
  }

  allItemIds(approval: Approval): string[] {
    return [
      ...approval.assets.filter(asset => this.canDecideAsset(approval, asset)).map(asset => asset.id),
      ...this.reviewableUrlItems(approval)
        .filter(item => this.canDecideItem(approval, item.id))
        .map(item => item.id),
      // Inform-only sheet rows need no partner decision, so they stay out of bulk selection.
      ...(this.sheetInformOnly() ? [] : this.spreadsheetRows(approval).map(row => row.id)),
    ];
  }

  allItemsSelected(approval: Approval): boolean {
    const ids = this.allItemIds(approval);
    const selected = this.selectedItemIds();
    return ids.length > 0 && ids.every(id => selected.has(id));
  }

  selectedItemCount(): number {
    return this.selectedItemIds().size;
  }

  toggleSelectAllItems(approval: Approval): void {
    this.selectedItemIds.set(this.allItemsSelected(approval) ? new Set<string>() : new Set(this.allItemIds(approval)));
  }

  isItemSelected(itemId: string): boolean {
    return this.selectedItemIds().has(itemId);
  }

  toggleItemSelected(itemId: string, selected: boolean): void {
    const next = new Set(this.selectedItemIds());
    if (selected) {
      next.add(itemId);
    } else {
      next.delete(itemId);
    }
    this.selectedItemIds.set(next);
  }

  commentFor(itemId: string, fallback?: string): string {
    return approvalReviewItemGroup(this.reviewForm, itemId)?.controls.feedback.value || fallback || '';
  }

  runAction(action: ApprovalAction): void {
    const approval = this.approval();
    if (!approval || this.partnerId() === null || this.actionInProgress() !== null) {
      return;
    }
    if (action === 'inform_open' && !this.#canCreate()) {
      return;
    }
    if (action === 'reject' || action === 'request_changes') {
      this.#openFeedback({ kind: 'action', action });
      return;
    }
    this.#executeAction(action, '');
  }

  #executeAction(action: ApprovalAction, feedback: string): void {
    const approval = this.approval();
    const partnerId = this.partnerId();
    if (!approval || partnerId === null) {
      return;
    }
    this.#setActionInProgress(action);
    this.actionError.set(false);
    this.actionErrorMessage.set(null);

    const request = this.#actionRequest(action, partnerId, approval.id, feedback);

    request.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: response => {
        // Same reasoning as #applyLifecycleChange: every one of these actions can move the approval
        // in or out of pending (inform_open included, since it leaves DRAFT), and the cached projects
        // list carries server-derived pending counters.
        this.#projectsService.invalidate(partnerId);
        if (response.error) {
          this.actionError.set(true);
          this.#setActionInProgress(null);
          return;
        }
        this.#reloadApproval();
      },
      error: () => {
        this.actionError.set(true);
        this.#setActionInProgress(null);
      },
    });
  }

  canPreviewAsset(asset: ApprovalAsset): boolean {
    return asset.driveSyncStatus === DriveSyncStatus.IN_DRIVE && !!asset.driveFileId;
  }

  protected canViewAsset(asset: ApprovalAsset): boolean {
    return !asset.isZiflow && (asset.hasS3Copy ? isBrowserViewable(asset.mimeType, asset.fileName) : this.canPreviewAsset(asset));
  }

  /** A settled approval is read-only, so Ziflow is somewhere to look rather than to decide. */
  ziflowActionLabelKey(): string {
    const status = this.approval()?.status;
    const settled = status === ApprovalStatus.COMPLETED || status === ApprovalStatus.CANCELLED;
    return settled ? 'approvals.detail.viewInZiflow' : 'approvals.detail.reviewInZiflow';
  }

  canViewZiflow(asset: ApprovalAsset): boolean {
    return !!asset.isZiflow && !!asset.folderId;
  }

  canOpenInDrive(asset: ApprovalAsset): boolean {
    return asset.driveSyncStatus === DriveSyncStatus.IN_DRIVE && !!asset.driveUrl;
  }

  openDriveUrl(url: string | undefined): void {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  openZiflowReview(asset: ApprovalAsset): void {
    const partnerId = this.partnerId();
    const approvalId = this.#loadedApprovalId;
    if (partnerId === null || !approvalId || !asset.folderId || this.previewingAssetId() !== null) {
      return;
    }
    this.previewingAssetId.set(asset.id);
    this.actionError.set(false);
    this.actionErrorMessage.set(null);
    this.#ziflowService
      .getReviewUrl(partnerId, this.launchId(), approvalId, asset.folderId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: response => {
          this.previewingAssetId.set(null);
          if (response.data) {
            window.open(response.data, '_blank', 'noopener,noreferrer');
          } else {
            this.#setZiflowOpenError();
          }
        },
        error: () => {
          this.previewingAssetId.set(null);
          this.#setZiflowOpenError();
        },
      });
  }

  #setZiflowOpenError(): void {
    this.actionError.set(true);
    this.actionErrorMessage.set(this.#translate.instant('approvals.detail.openZiflowError'));
  }

  openAssetPreview(asset: ApprovalAsset): void {
    if (!asset.hasS3Copy) {
      this.#clearActionError();
      this.#openDrivePreview(asset);
      return;
    }
    const approvalId = this.approval()?.id;
    const partnerId = this.partnerId();
    if (partnerId === null || approvalId === undefined || this.previewingAssetId() !== null) {
      return;
    }
    const launchId = this.launchId();
    const fetchUrl = (): Observable<BaseResponse<ApprovalFileUrl | null>> =>
      this.#service.fetchFileUrl(partnerId, launchId, approvalId, asset.id);
    this.previewingAssetId.set(asset.id);
    this.#clearActionError();
    fetchUrl()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.previewingAssetId.set(null);
          this.#failAssetPreview(asset);
        },
        next: (response: BaseResponse<ApprovalFileUrl | null>) => {
          this.previewingAssetId.set(null);
          if (response.data != null) {
            this.#openS3Preview(asset, response.data, fetchUrl);
          } else {
            this.#failAssetPreview(asset);
          }
        },
      });
  }

  closePreview(): void {
    this.previewFile.set(null);
  }

  #clearActionError(): void {
    this.actionError.set(false);
    this.actionErrorMessage.set(null);
  }

  #failAssetPreview(asset: ApprovalAsset): void {
    if (this.canPreviewAsset(asset)) {
      this.#openDrivePreview(asset);
      return;
    }
    this.actionError.set(true);
    this.actionErrorMessage.set(this.#translate.instant('approvals.detail.openFileError'));
  }

  #openDrivePreview(asset: ApprovalAsset): void {
    this.previewFile.set({
      driveFileId: asset.driveFileId ?? '',
      mimeType: asset.mimeType ?? '',
      originalName: asset.fileName,
      webViewLink: asset.driveUrl ?? '',
    });
  }

  #openS3Preview(asset: ApprovalAsset, file: ApprovalFileUrl, fetchUrl: () => Observable<BaseResponse<ApprovalFileUrl | null>>): void {
    this.previewFile.set({
      driveFileId: '',
      mimeType: file.contentType || asset.mimeType || '',
      originalName: asset.fileName,
      refreshSignedUrl: () =>
        fetchUrl().pipe(
          map((response: BaseResponse<ApprovalFileUrl | null>) => response.data?.url ?? ''),
          filter((url: string) => url !== ''),
        ),
      signedUrl: file.url,
      webViewLink: this.canOpenInDrive(asset) ? (asset.driveUrl ?? '') : '',
    });
  }

  #reloadApproval(onSuccess?: () => void): void {
    const approval = this.approval();
    const partnerId = this.partnerId();
    if (!approval || partnerId === null) {
      this.#setActionInProgress(null);
      return;
    }
    const revision = this.#commentCounts.startRefresh();
    this.#service
      .get(partnerId, this.launchId(), approval.id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: response => {
          this.#setActionInProgress(null);
          if (response.error || !response.data) {
            this.actionError.set(true);
            return;
          }
          this.#applyApproval(response.data);
          this.#commentCounts.accept(response.data.itemComments.counts, revision);
          onSuccess?.();
        },
        error: () => {
          this.#setActionInProgress(null);
          this.actionError.set(true);
        },
      });
  }

  setFeedbackText(value: string): void {
    this.feedbackText.set(value);
  }

  confirmFeedback(): void {
    const pending = this.pendingFeedback();
    if (!pending) {
      return;
    }
    const feedback = this.feedbackText().trim();
    this.pendingFeedback.set(null);
    this.feedbackText.set('');
    this.#executeAction(pending.action, feedback);
  }

  cancelFeedback(): void {
    this.pendingFeedback.set(null);
    this.feedbackText.set('');
  }

  #openFeedback(pending: PendingFeedback): void {
    this.pendingFeedback.set(pending);
    this.feedbackText.set('');
  }

  #actionRequest(action: ApprovalAction, partnerId: number, approvalId: string, feedback: string) {
    switch (action) {
      case 'approve':
        return this.#service.approve(partnerId, approvalId);
      case 'reject':
        return this.#service.reject(partnerId, approvalId, feedback);
      case 'request_changes':
        return this.#service.requestChanges(partnerId, approvalId, feedback);
      case 'inform_open':
        return this.#service.informOpen(partnerId, approvalId);
    }
  }

  #clearReviewItem(itemId: string, feedback = ''): void {
    const group = approvalReviewItemGroup(this.reviewForm, itemId);
    if (!group) {
      return;
    }
    group.reset({ decision: null, feedback });
    group.markAsPristine();
  }

  reviewDecisionControl(itemId: string): FormControl<ApprovalItemReviewDecision | null> {
    return approvalReviewDecisionControl(this.reviewForm, itemId);
  }

  #setActionInProgress(action: ApprovalDetailBusyAction | null): void {
    this.#stateRevision++;
    if (action !== null) {
      this.#idleDriveSyncPolls.set(0);
    }
    this.actionInProgress.set(action);
    this.#syncReviewFormDisabledState();
  }

  #syncReviewFormDisabledState(): void {
    if (this.actionInProgress() === null) {
      this.reviewForm.enable({ emitEvent: false });
      return;
    }
    this.reviewForm.disable({ emitEvent: false });
  }

  #mapErrorKey(error: { code: string | number }): DetailErrorKey {
    if (error.code === 403 || error.code === '403') {
      return 'forbidden';
    }
    if (error.code === 404 || error.code === '404' || error.code === 'approval_not_found') {
      return 'notFound';
    }
    return 'loadFailed';
  }

  #templateQuestions(payload: Record<string, unknown>): ApprovalTemplateQuestion[] {
    const raw = payload['template_questions'];
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.filter((question): question is ApprovalTemplateQuestion => typeof question === 'object' && question !== null);
  }

  #fieldFromQuestion(question: ApprovalTemplateQuestion, approval: Approval): ApprovalDetailField | null {
    const id = typeof question.id === 'string' ? question.id : '';
    const label = typeof question.label === 'string' ? question.label : id;
    if (!label) {
      return null;
    }

    const value = this.#questionValue(question, approval);
    return { id: id || label, label, value: value || '-' };
  }

  #payloadSummaryFields(approval: Approval): ApprovalDetailField[] {
    const fields: ApprovalDetailField[] = [];
    if (approval.title) {
      fields.push({ id: 'title', labelKey: 'approvals.new.summary.title', value: approval.title });
    }
    if (approval.category) {
      fields.push({
        id: 'category',
        labelKey: 'approvals.new.summary.subtype',
        value: approval.category,
        valueKey: `approvals.new.metadata.subtype.options.${approval.category}`,
      });
    }
    if (approval.dueDate) {
      fields.push({ id: 'dueDate', labelKey: 'approvals.new.summary.dueDate', value: approval.dueDate });
    }
    const payload = approval.payload ?? {};
    const links = this.#urlListValue(payload);
    if (links) {
      fields.push({ id: 'urls', labelKey: 'approvals.new.summary.links', value: links });
    }
    const spreadsheetUrl = this.#formatValue(payload['spreadsheetUrl']);
    if (spreadsheetUrl) {
      fields.push({ id: 'spreadsheetUrl', labelKey: 'approvals.new.payload.sheet.tabId', value: spreadsheetUrl });
    }
    return fields;
  }

  #questionValue(question: ApprovalTemplateQuestion, approval: Approval): string {
    const payload = approval.payload ?? {};
    const directKeys = [
      typeof question.id === 'string' ? question.id : '',
      typeof question.label === 'string' ? question.label : '',
      typeof question.label === 'string' ? this.#toCamelCase(question.label) : '',
    ].filter(Boolean);

    for (const key of directKeys) {
      if (key in payload) {
        return this.#formatValue(payload[key]);
      }
    }

    if (question.type === 'website') {
      const spreadsheetUrl = this.#formatValue(payload['spreadsheetUrl']);
      if (spreadsheetUrl) {
        return spreadsheetUrl;
      }
      return this.#formatArrayItem(payload['urls'], 0);
    }
    if (question.type === 'textarea') {
      return this.#formatArrayItem(payload['urlDescriptions'], 0);
    }
    if (question.type === 'date' && typeof question.label === 'string' && this.#toCamelCase(question.label) === 'dueDate') {
      return approval.dueDate ?? '';
    }
    return '';
  }

  #formatArrayItem(value: unknown, index: number): string {
    if (!Array.isArray(value)) {
      return '';
    }
    return this.#formatValue(value[index]);
  }

  #reviewFor(approval: Approval, itemId: string): ApprovalItemReview {
    const raw = approval.payload?.['item_reviews'];
    if (typeof raw !== 'object' || raw === null) {
      return {};
    }
    const review = (raw as Record<string, unknown>)[itemId];
    if (typeof review !== 'object' || review === null) {
      return {};
    }
    return review as ApprovalItemReview;
  }

  #reviewStatus(approval: Approval, itemId: string): ApprovalStatus {
    const decision = approvalReviewItemGroup(this.reviewForm, itemId)?.controls.decision.value;
    if (decision) {
      return this.#decisionStatus(decision);
    }
    return this.#persistedReviewStatus(approval, itemId);
  }

  #persistedReviewStatus(approval: Approval, itemId: string): ApprovalStatus {
    const rawStatus = this.#reviewFor(approval, itemId).status;
    if (rawStatus === 'APPROVED') {
      return ApprovalStatus.APPROVED;
    }
    if (rawStatus === 'REJECTED') {
      return ApprovalStatus.REJECTED;
    }
    return ApprovalStatus.IN_REVIEW;
  }

  #persistedItemStatus(approval: Approval, itemId: string): ApprovalStatus {
    const asset = approval.assets.find(item => item.id === itemId);
    if (asset?.reviewStatus === ApprovalStatus.APPROVED || asset?.reviewStatus === ApprovalStatus.REJECTED) {
      return asset.reviewStatus;
    }
    const row = approval.rows.find(item => item.id === itemId);
    if (row?.status === ApprovalStatus.APPROVED || row?.status === ApprovalStatus.REJECTED) {
      return row.status;
    }
    return this.#persistedReviewStatus(approval, itemId);
  }

  #decisionFromReviewStatus(status: unknown): ApprovalItemReviewDecision | null {
    if (status === 'APPROVED') {
      return 'APPROVE';
    }
    if (status === 'REJECTED') {
      return 'REJECT';
    }
    return null;
  }

  #decisionFromStatus(status: ApprovalStatus | string | undefined): ApprovalItemReviewDecision | null {
    if (status === ApprovalStatus.APPROVED) {
      return 'APPROVE';
    }
    if (status === ApprovalStatus.REJECTED) {
      return 'REJECT';
    }
    return null;
  }

  #decisionStatus(decision: ApprovalItemReviewDecision): ApprovalStatus {
    if (decision === 'APPROVE') {
      return ApprovalStatus.APPROVED;
    }
    if (decision === 'REJECT') {
      return ApprovalStatus.REJECTED;
    }
    return ApprovalStatus.IN_REVIEW;
  }

  #urlListValue(payload: Record<string, unknown>): string {
    const urls = payload['urls'];
    if (!Array.isArray(urls)) {
      return '';
    }
    const descriptions = Array.isArray(payload['urlDescriptions']) ? payload['urlDescriptions'] : [];
    return urls
      .map((url, index) => {
        const value = this.#formatValue(url);
        const description = this.#formatValue(descriptions[index]);
        return [value, description].filter(Boolean).join(' - ');
      })
      .filter(Boolean)
      .join('\n');
  }

  #formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (Array.isArray(value)) {
      return value
        .map(item => this.#formatValue(item))
        .filter(Boolean)
        .join(', ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  #toCamelCase(value: string): string {
    return value
      .trim()
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, char: string) => char.toUpperCase())
      .replace(/^[A-Z]/, char => char.toLowerCase());
  }

  #sheetPreviewRows(approval: Approval, includeFormState = true): ApprovalRow[] {
    const preview = approval.payload?.['sheetPreview'];
    if (!this.#hasSheetPreviewRows(preview)) {
      return [];
    }
    const [header, ...rows] = preview.rows;
    return rows.map((row, rowIndex) => ({
      id: `sheet-preview-${rowIndex}`,
      rowIndex,
      values: this.#sheetPreviewValues(header, row),
      status: includeFormState
        ? this.#reviewStatus(approval, `sheet-preview-${rowIndex}`)
        : this.#persistedReviewStatus(approval, `sheet-preview-${rowIndex}`),
    }));
  }

  #hasSheetPreviewRows(value: unknown): value is { rows: string[][] } {
    if (typeof value !== 'object' || value === null || !('rows' in value)) {
      return false;
    }
    const rows = (value as { rows?: unknown }).rows;
    return Array.isArray(rows) && rows.length > 1 && rows.every(row => Array.isArray(row));
  }

  #sheetPreviewValues(header: string[], row: string[]): Record<string, string> {
    const values: Record<string, string> = {};
    header.forEach((column, index) => {
      const label = column.trim() || `Column ${index + 1}`;
      values[label] = row[index] ?? '';
    });
    return values;
  }
}

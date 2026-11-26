import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Injector, Input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import {
  ApprovalRejectReasonDialogComponent,
  RejectReasonDialogData,
  RejectReasonDialogResult,
} from '@fz-original/app/modules/ir-approval/approvals/components/approval-reject-reason-dialog/approval-reject-reason-dialog.component';
import { Approval } from '@fz-original/app/modules/ir-approval/approvals/models/approval.model';
import { ApprovalItemReviewDecision, ApprovalsService } from '@fz-original/app/modules/ir-approval/approvals/services/approvals.service';
import {
  approvalResult,
  ApprovalResult,
  collectHubDecidableItemIds,
  hasHubDecidableItem,
} from '@fz-original/app/modules/ir-approval/approvals/utils/approval-items.util';
import { informationRequestStatusLabelKey } from '@fz-original/app/modules/ir-approval/information-requests/models/information-request-status-label.util';
import { InformationRequestStatus } from '@fz-original/app/modules/ir-approval/information-requests/models/information-request-status.enum';
import { InformationRequest } from '@fz-original/app/modules/ir-approval/information-requests/models/information-request.model';
import { InformationRequestsService } from '@fz-original/app/modules/ir-approval/information-requests/services/information-requests.service';
import { IgntButtonComponent, IgntDialogService } from '@ignite/common';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntTagComponent, TagSentiment } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import {
  IgntTableColumnComponent,
  IgntTableColumnTemplateDirective,
  IgntTableComponent,
  IgntTableHeaderTemplateDirective,
} from '@ignite/table';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { combineLatest, forkJoin, Observable } from 'rxjs';
import { filter, switchMap, take } from 'rxjs/operators';

import {
  ConfirmDialogComponent,
  ConfirmDialogData,
  ConfirmDialogResult,
} from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { BaseResponse } from '../../../../shared/models/base-response';
import { Partner } from '../../../../shared/models/partner/partner.model';
import { FeatureFlags } from '../../../../shared/optimizely/feature-flags';
import { OptimizelyService } from '../../../../shared/optimizely/optimizely.service';
import { PartnerService } from '../../../../shared/services/partner/partner.service';
import { ToastService } from '../../../../shared/services/toast/toast.service';
import { Permissions } from '../../../../shared/services/user/permissions';
import { UserService } from '../../../../shared/services/user/user.service';
import type {
  CreateEventQuickSetupWizardCloseResult,
  CreateEventQuickSetupWizardData,
} from '../../../plan/list-plan/components/create-event-modal/components/create-event-quick-setup-wizard/create-event-quick-setup-wizard.model';
import { CreateRecordModalComponent } from '../../components/create-record-modal/create-record-modal.component';
import { CreateRecordModalData, CreateRecordModalResult } from '../../components/create-record-modal/create-record-modal.model';
import { Project } from '../../models/project.model';
import { RequestStatusVm } from '../../models/request-status-vm.model';
import { PROJECT_MANAGEMENT_QUICK_SETUP_FROM_IR_FLAG } from '../../project-management.optimizely-features';
import { ProjectsService } from '../../services/projects.service';
import {
  irStatusSentiment,
  isCancelledApproval,
  isCancelledRequest,
  isDraftApproval,
  isOutOfCirculationApproval,
  isPendingApproval,
  isPendingRequest,
  sortByCreatedAtDesc,
} from '../../utils/launch-records.utils';
import {
  canCreatePlanFromRequest,
  canOpenPlanDashboard,
  canResumeRequestPlan,
  isQuickSetupInformationRequest,
} from '../../utils/quick-setup-launch.utils';

/**
 * The quick setup wizard lives in the `plan` lazy chunk. Typing the launcher module through `typeof import()`
 * keeps the reference in type space only, so nothing of that graph is pulled into the project-management chunk.
 */
type QuickSetupWizardLauncherModule =
  typeof import('../../../plan/list-plan/components/create-event-modal/components/create-event-quick-setup-wizard/open-create-event-quick-setup-wizard.util');

export type RecordKind = 'request' | 'approval';
export type RecordStatusMode = 'all' | 'pending' | 'completed' | 'cancelled';

interface RecordVm {
  kind: RecordKind;
  id: string;
  title: string;
  recordType: string;
  launchId: string;
  launchName: string;
  createdAt: Date;
  dueDate: string | null;
  pending: boolean;
  cancelled: boolean;
  draft: boolean;
  outOfCirculation: boolean;
  reviewable: boolean;
  result: ApprovalResult | null;
  requestStatus: RequestStatusVm | null;
  approval?: Approval;
  request?: InformationRequest;
}

@Component({
  selector: 'app-records-list',
  templateUrl: './records-list.component.html',
  styleUrls: ['./records-list.component.scss'],
  imports: [
    CommonModule,
    TranslateModule,
    IgntButtonComponent,
    IgntIconButtonComponent,
    IgntTableColumnComponent,
    IgntTableColumnTemplateDirective,
    IgntTableComponent,
    IgntTableHeaderTemplateDirective,
    IgntTagComponent,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordsListComponent implements OnInit {
  // Route param (projects/:projectId) or @Input when embedded — empty means "all launches".
  @Input() projectId = '';
  // Route data: which record types and status to show by default per entry point.
  @Input() defaultTypes: RecordKind[] = ['request', 'approval'];
  @Input() defaultStatus: RecordStatusMode = 'pending';
  @Input() status?: string;

  readonly approvals = signal<Approval[]>([]);
  readonly requests = signal<InformationRequest[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<boolean>(false);
  readonly actionInProgress = signal<boolean>(false);
  readonly actionError = signal<boolean>(false);
  readonly hasSkippedItems = signal<boolean>(false);
  readonly selectedApprovalIds = signal<ReadonlySet<string>>(new Set<string>());

  readonly showRequests = signal<boolean>(true);
  readonly showApprovals = signal<boolean>(true);
  readonly statusMode = signal<RecordStatusMode>('pending');
  readonly titleFilter = signal<string>('');
  readonly launchFilter = signal<string>('');
  readonly createdFilter = signal<string>('');
  readonly dueFilter = signal<string>('');

  readonly #launchId = signal<string>('');
  readonly #partnerId = signal<number | null>(null);
  readonly #projectNames = signal<ReadonlyMap<string, string>>(new Map<string, string>());
  readonly launch = signal<Project | null>(null);

  readonly #destroyRef = inject(DestroyRef);
  readonly #approvalsService = inject(ApprovalsService);
  readonly #requestsService = inject(InformationRequestsService);
  readonly #projectsService = inject(ProjectsService);
  readonly #partnerService = inject(PartnerService);
  readonly #dialogService = inject(IgntDialogService);
  readonly #injector = inject(Injector);
  readonly #router = inject(Router);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);
  readonly #userService = inject(UserService);
  readonly #optimizely = inject(OptimizelyService);

  readonly canCreateApproval =
    this.#userService.hasPermission(Permissions.CAN_CREATE_APPROVAL) &&
    this.#optimizely.isFeatureEnabled(FeatureFlags.PROJECT_MANAGEMENT_FZ) === true;
  readonly canCreateInformationRequest =
    this.#userService.hasPermission(Permissions.CAN_CREATE_INFORMATION_REQUEST) &&
    this.#optimizely.isFeatureEnabled(FeatureFlags.PROJECT_MANAGEMENT_FZ) === true;
  readonly canCreateAny = this.canCreateApproval || this.canCreateInformationRequest;

  readonly rows = computed<RecordVm[]>(() => {
    const title = this.titleFilter().trim().toLowerCase();
    const launch = this.launchFilter().trim().toLowerCase();
    const created = this.createdFilter();
    const due = this.dueFilter();
    const status = this.statusMode();
    const merged: RecordVm[] = [];
    if (this.showRequests()) {
      merged.push(...this.requests().map(request => this.#requestVm(request)));
    }
    if (this.showApprovals()) {
      merged.push(...this.approvals().map(approval => this.#approvalVm(approval)));
    }
    return merged
      .filter(row => {
        // Cancelled rows — and draft approvals, which await their author rather than a reviewer — are
        // out of circulation: they belong to neither Pending nor Completed. Only All shows them, plus
        // Cancelled for the cancelled ones.
        if (status === 'pending' && (!row.pending || row.outOfCirculation)) return false;
        if (status === 'completed' && (row.pending || row.outOfCirculation)) return false;
        if (status === 'cancelled' && !row.cancelled) return false;
        if (title && !row.title.toLowerCase().includes(title)) return false;
        if (launch && !row.launchName.toLowerCase().includes(launch)) return false;
        if (created && this.#dateKey(row.createdAt) !== created) return false;
        if (due && (!row.dueDate || this.#dateKey(row.dueDate) !== due)) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  });

  /** Row sample that types the cell templates of the table (see igntTableColumnTemplateType). */
  protected readonly rowSample = computed<RecordVm>(() => this.rows()[0] as RecordVm);

  readonly reviewableRows = computed<RecordVm[]>(() => this.rows().filter(row => row.reviewable));
  readonly selectedCount = computed<number>(() => this.selectedApprovalIds().size);
  readonly allSelected = computed<boolean>(() => {
    const reviewable = this.reviewableRows();
    const selected = this.selectedApprovalIds();
    return reviewable.length > 0 && reviewable.every(row => selected.has(row.id));
  });

  // The quick setup launcher is fetched over the network, so 100–500 ms separate the click from the `import()`
  // settling. These two guard that window: the component may be gone by then, and a second click inside it would
  // start a second, independent launch. `DestroyRef` exposes no `destroyed` flag in Angular 18.2, hence the field.
  #destroyed = false;
  #quickSetupWizardLoading = false;

  constructor() {
    this.#destroyRef.onDestroy(() => {
      this.#destroyed = true;
    });
  }

  ngOnInit(): void {
    this.#launchId.set(this.projectId ?? '');
    this.showRequests.set(this.defaultTypes.includes('request'));
    this.showApprovals.set(this.defaultTypes.includes('approval'));
    this.statusMode.set(this.#initialStatusMode());
    this.#partnerService
      .observePartner()
      .pipe(
        filter((partner): partner is Partner => partner !== null),
        take(1),
        switchMap(partner => {
          this.#partnerId.set(partner.id);
          this.#loadProjectNames(partner.id);
          if (this.#launchId()) {
            this.#loadLaunch(partner.id, this.#launchId());
          }
          return this.#fetch(partner.id, this.#launchId());
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: ([approvals, requests]) => this.#applyData(approvals, requests),
        error: () => {
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }

  toggleType(kind: RecordKind): void {
    const signalRef = kind === 'request' ? this.showRequests : this.showApprovals;
    const other = kind === 'request' ? this.showApprovals : this.showRequests;
    // Keep at least one type active.
    if (signalRef() && !other()) {
      return;
    }
    signalRef.set(!signalRef());
    this.selectedApprovalIds.set(new Set<string>());
    this.#clearActionNotes();
  }

  setStatusMode(mode: RecordStatusMode): void {
    this.statusMode.set(mode);
    this.selectedApprovalIds.set(new Set<string>());
    this.#clearActionNotes();
  }

  setTitleFilter(value: string): void {
    this.titleFilter.set(value);
  }

  setLaunchFilter(value: string): void {
    this.launchFilter.set(value);
  }

  setCreatedFilter(value: string): void {
    this.createdFilter.set(value);
  }

  setDueFilter(value: string): void {
    this.dueFilter.set(value);
  }

  clearFilters(): void {
    this.titleFilter.set('');
    this.launchFilter.set('');
    this.createdFilter.set('');
    this.dueFilter.set('');
  }

  // Pastel result chips (outline variant): approved & partially approved = green, rejected = red.
  resultSentiment(result: ApprovalResult): TagSentiment {
    return result === 'rejected' ? 'danger' : 'positive';
  }

  isSelected(row: RecordVm): boolean {
    return this.selectedApprovalIds().has(row.id);
  }

  toggleSelect(row: RecordVm, event: Event): void {
    event.stopPropagation();
    const next = new Set(this.selectedApprovalIds());
    if ((event.target as HTMLInputElement).checked) {
      next.add(row.id);
    } else {
      next.delete(row.id);
    }
    this.selectedApprovalIds.set(next);
  }

  toggleSelectAll(): void {
    this.selectedApprovalIds.set(this.allSelected() ? new Set<string>() : new Set(this.reviewableRows().map(row => row.id)));
  }

  openRecord(row: RecordVm): void {
    const request = row.request;
    // Read at click time, never as a field initialiser: this decides a single click, and `isFeatureEnabled()`
    // answers `null` while the SDK is still uninitialised — which must read as OFF, hence `=== true`.
    const quickSetupFromIr = this.#optimizely.isFeatureEnabled(PROJECT_MANAGEMENT_QUICK_SETUP_FROM_IR_FLAG) === true;

    if (row.kind !== 'request' || request === undefined || !quickSetupFromIr || !isQuickSetupInformationRequest(request)) {
      this.#navigateToRecordDetail(row);
      return;
    }

    // `=== null`, never truthiness: plan id `0` is a linked plan, not an unlinked request.
    const mainPlanId = request.mainPlanId ?? null;

    if (mainPlanId === null) {
      this.#openQuickSetupToCreatePlan(row, request);
      return;
    }

    // The plan exists. Either lifecycle stamp closes the creation window, and a closed window grants the
    // responder persona nothing anywhere — so this branch asks no information-request capability at all, only
    // whether the user clears the `/plans/dashboard` guard.
    if (request.quickSetupUsed || request.advancedSetupUsed) {
      this.#navigateToPlanDashboard(row, mainPlanId);
      return;
    }

    this.#openQuickSetupToResumePlan(row, request, mainPlanId);
  }

  approveRow(row: RecordVm, event: Event): void {
    event.stopPropagation();
    this.#confirmApprove([row.id]);
  }

  rejectRow(row: RecordVm, event: Event): void {
    event.stopPropagation();
    this.#openReject([row.id]);
  }

  bulkApprove(): void {
    this.#confirmApprove([...this.selectedApprovalIds()]);
  }

  bulkReject(): void {
    this.#openReject([...this.selectedApprovalIds()]);
  }

  openCreate(): void {
    const launchId = this.#launchId();
    if (!launchId) {
      return;
    }
    this.#dialogService
      .openModal<CreateRecordModalResult, CreateRecordModalData>(CreateRecordModalComponent, {
        data: {
          canCreateInformationRequest: this.canCreateInformationRequest,
          canCreateApproval: this.canCreateApproval,
        },
      })
      .closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(result => {
        if (!result) {
          return;
        }
        const segment = result.type === 'request' ? 'information-requests' : 'approvals';
        void this.#router.navigate(['/project-management/projects', launchId, segment, 'new']);
      });
  }

  /**
   * The one seam onto the `plan` chunk. It must stay a dynamic `import()`: a static one would drag the wizard and
   * its ~15 sibling imports into the project-management chunk, which is the whole reason the launcher util exists.
   * The real split is verified by the production build; specs drive both the resolved and the rejected path by
   * mocking the launcher module, so nothing here needs to be reachable from outside the class.
   */
  #loadQuickSetupWizardLauncher(): Promise<QuickSetupWizardLauncherModule> {
    return import(
      '../../../plan/list-plan/components/create-event-modal/components/create-event-quick-setup-wizard/open-create-event-quick-setup-wizard.util'
    );
  }

  /**
   * Create mode — the only place that opens the wizard without a `resumePlanId`. Reachable exclusively from the
   * `mainPlanId === null` branch of `openRecord`, which is what keeps a second plan from ever being created
   * against an information request that already has one.
   */
  #openQuickSetupToCreatePlan(row: RecordVm, request: InformationRequest): void {
    if (!canCreatePlanFromRequest(request, this.#userService)) {
      this.#navigateToRecordDetail(row);
      return;
    }

    this.#openQuickSetupWizard(row, {
      eventType: 'standard',
      informationRequestId: request.id,
      source: 'project_management',
    });
  }

  /**
   * Resume mode. Keyed on `canResumeQuickSetup` rather than `canCreateMainPlan`, which the backend turns off the
   * moment the link is stamped — gating resume on it would make this branch dead code for the responder persona.
   * The request id travels along so the whole resumed funnel still reports `information_request_id`; the wizard
   * never re-links it, because a resume skips plan creation entirely.
   */
  #openQuickSetupToResumePlan(row: RecordVm, request: InformationRequest, mainPlanId: number): void {
    if (!canResumeRequestPlan(request, this.#userService)) {
      this.#navigateToRecordDetail(row);
      return;
    }

    this.#openQuickSetupWizard(row, {
      eventType: 'standard',
      informationRequestId: request.id,
      resumePlanId: mainPlanId,
      source: 'project_management',
    });
  }

  #openQuickSetupWizard(row: RecordVm, data: CreateEventQuickSetupWizardData): void {
    // Clicks that land while the chunk is still in flight would each open their own wizard, each with its own
    // `closed$` — two dialogs stacked, two reloads, and the completion toast raised twice.
    if (this.#quickSetupWizardLoading) {
      return;
    }
    this.#quickSetupWizardLoading = true;

    void this.#loadQuickSetupWizardLauncher().then(
      ({ openCreateEventQuickSetupWizard }) => {
        this.#quickSetupWizardLoading = false;
        // The view can have been destroyed during the fetch — and a user who has already left the page must not
        // have a modal thrown up in front of whatever they navigated to.
        if (this.#destroyed) {
          return;
        }
        // Deliberately no `takeUntilDestroyed`. The wizard is a body-level CDK overlay whose view is attached to
        // `ApplicationRef`, not to this component's view, so navigating away (sidebar, browser back) destroys this
        // list and leaves the wizard on screen. Tying the close handler to the list's lifetime would then drop the
        // only completion feedback the project-management source has — the wizard suppresses its own dashboard
        // toast for us. Not a leak either: `closed$` is a `Subject` that emits once and completes on close, and
        // `take(1)` tears the subscription down even on the theoretical dispose-without-close path.
        openCreateEventQuickSetupWizard(this.#dialogService, this.#injector, data)
          .closed$.pipe(take(1))
          .subscribe(result => this.#onQuickSetupWizardClosed(result));
      },
      // A chunk the browser cannot fetch must not leave the click dead. `reloadIfChunkLoadError` is the route
      // convention, but it reloads the whole page, and here there is a better answer: the detail form the row
      // opened before this feature existed.
      () => {
        this.#quickSetupWizardLoading = false;
        // `Router` is root-scoped, so destruction does not disarm this: without the guard a failed fetch would
        // yank a user who has already navigated elsewhere back to the record detail.
        if (this.#destroyed) {
          return;
        }
        this.#navigateToRecordDetail(row);
      },
    );
  }

  #onQuickSetupWizardClosed(result: CreateEventQuickSetupWizardCloseResult | null | undefined): void {
    // Reload unless the list is gone: the request's `mainPlanId` and lifecycle flags may have moved, and the row's
    // next click reads exactly those. Once destroyed there is no row left to refresh, and `#reload()` pipes
    // `takeUntilDestroyed`, so going ahead would throw NG0911 before the toast below ever ran. The toast itself is
    // safe either way — `ToastService` is root-scoped and its host is the app layout, not this view.
    if (!this.#destroyed) {
      this.#reload();
    }

    // `'back'` still reaches us from the wizard header on step 0. The events-list flow answers it by reopening
    // the setup modal, which does not exist here — so for project management it is a plain incomplete close.
    if (result === null || result === undefined || result === 'back' || !result.completed || result.planId === null) {
      return;
    }

    this.#showQuickSetupCompletedToast(result.planId);
  }

  /**
   * Permission-aware completion toast. Linking unconditionally would send a user without the plan permissions to
   * `/plans/dashboard`, where the route guard bounces them to `getFirstActiveUrlByPermission()` — a link that
   * lands somewhere unrelated. So the link is offered only to users who clear the guard, and everyone else is
   * told which permission they are missing.
   */
  #showQuickSetupCompletedToast(planId: number): void {
    if (!canOpenPlanDashboard(this.#userService)) {
      this.#toastService.addSuccess(this.#translateService.instant('projectManagement.records.quickSetup.completedWithoutPlanAccess'));
      return;
    }

    // The copy still carries the `{{link}}` placeholder for every locale, so it is interpolated away rather
    // than re-translated: the words it used to wrap are now the action button's label.
    const message = (this.#translateService.instant('projectManagement.records.quickSetup.completedToast', { link: '' }) as string).trim();

    this.#toastService.add({
      actionLabel: this.#translateService.instant('projectManagement.records.quickSetup.completedToastLink'),
      actionClicked: () => {
        void this.#router.navigate(['/plans/dashboard'], { queryParams: { planId } });
      },
      autoHide: true,
      message,
      sentiment: 'positive',
    });
  }

  #navigateToPlanDashboard(row: RecordVm, planId: number): void {
    if (!canOpenPlanDashboard(this.#userService)) {
      this.#navigateToRecordDetail(row);
      return;
    }

    void this.#router.navigate(['/plans/dashboard'], { queryParams: { planId } });
  }

  #navigateToRecordDetail(row: RecordVm): void {
    const segment = row.kind === 'approval' ? 'approvals' : 'information-requests';
    const base = row.launchId ? ['/project-management/projects', row.launchId, segment, row.id] : ['/project-management', segment, row.id];
    void this.#router.navigate(base);
  }

  #confirmApprove(ids: string[]): void {
    if (ids.length === 0 || this.actionInProgress()) {
      return;
    }
    this.#dialogService
      .openModal<ConfirmDialogResult, ConfirmDialogData>(ConfirmDialogComponent, {
        size: 'sm',
        data: { messageKey: 'approvals.list.confirmApprove.message', titleKey: 'approvals.list.confirmApprove.title' },
      })
      .closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(result => {
        if (result?.confirmed) {
          this.#runReview(ids.map(id => ({ id, decision: 'APPROVE' as const, feedback: '' })));
        }
      });
  }

  #openReject(ids: string[]): void {
    if (ids.length === 0 || this.actionInProgress()) {
      return;
    }
    const items = ids
      .map(id => this.approvals().find(approval => approval.id === id))
      .filter((approval): approval is Approval => approval !== undefined)
      .map(approval => ({ id: approval.id, label: approval.title ?? approval.id }));
    if (items.length === 0) {
      return;
    }
    this.#dialogService
      .openModal<RejectReasonDialogResult, RejectReasonDialogData>(ApprovalRejectReasonDialogComponent, { data: { items } })
      .closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(reasons => {
        if (reasons) {
          this.#runReview(Object.keys(reasons).map(id => ({ id, decision: 'REJECT' as const, feedback: reasons[id] ?? '' })));
        }
      });
  }

  // Decide every inner item of each approval (same path the detail uses) so the overall status is derived correctly.
  #clearActionNotes(): void {
    this.actionError.set(false);
    this.hasSkippedItems.set(false);
  }

  #runReview(decisions: { id: string; decision: ApprovalItemReviewDecision; feedback: string }[]): void {
    const partnerId = this.#partnerId();
    if (partnerId === null || decisions.length === 0 || this.actionInProgress()) {
      return;
    }
    const requests = decisions
      .map((entry): Observable<BaseResponse<unknown>> | null => {
        const approval = this.approvals().find(item => item.id === entry.id);
        if (!approval) {
          return null;
        }
        if (!hasHubDecidableItem(approval)) {
          return null;
        }
        const launchId = this.#launchId() || approval.launchId;
        const itemIds = collectHubDecidableItemIds(approval);
        if (itemIds.length > 0) {
          const items = itemIds.map(itemId => ({ itemId, decision: entry.decision, feedback: entry.feedback }));
          return this.#approvalsService.reviewItemsBatch(partnerId, launchId, approval.id, items);
        }
        return entry.decision === 'APPROVE'
          ? this.#approvalsService.approve(partnerId, approval.id)
          : this.#approvalsService.reject(partnerId, approval.id, entry.feedback);
      })
      .filter((request): request is Observable<BaseResponse<unknown>> => request !== null);
    if (requests.length === 0) {
      return;
    }
    this.actionInProgress.set(true);
    this.#clearActionNotes();
    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: responses => {
          this.selectedApprovalIds.set(new Set<string>());
          // Reviewing moves approvals out of pending, and the projects list is cached with its
          // pending-action counters computed server-side. A failed review is no safer to keep: it
          // usually means the status already moved underneath us.
          this.#projectsService.invalidate(partnerId);
          if (responses.some(response => response.error)) {
            this.actionError.set(true);
          }
          this.hasSkippedItems.set(responses.some(response => this.#leftUndecided(response)));
          this.#reload();
        },
        error: () => {
          this.actionInProgress.set(false);
          this.actionError.set(true);
        },
      });
  }

  #leftUndecided(response: BaseResponse<unknown>): boolean {
    const data = response.data;
    if (typeof data !== 'object' || data === null || !('skipped_items' in data)) {
      return false;
    }
    const skipped = data.skipped_items;
    return typeof skipped === 'object' && skipped !== null && Object.keys(skipped).length > 0;
  }

  #reload(): void {
    const partnerId = this.#partnerId();
    if (partnerId === null) {
      this.actionInProgress.set(false);
      return;
    }
    this.#fetch(partnerId, this.#launchId())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: ([approvals, requests]) => {
          this.actionInProgress.set(false);
          this.#applyData(approvals, requests);
        },
        error: () => {
          this.actionInProgress.set(false);
          this.actionError.set(true);
        },
      });
  }

  #fetch(partnerId: number, launchId: string): Observable<[BaseResponse<Approval[] | null>, BaseResponse<InformationRequest[] | null>]> {
    const approvals$ = launchId ? this.#approvalsService.list(partnerId, launchId) : this.#approvalsService.listForPartner(partnerId);
    const requests$ = launchId ? this.#requestsService.list(partnerId, launchId) : this.#requestsService.listForPartner(partnerId);
    return combineLatest([approvals$, requests$]);
  }

  #applyData(approvals: BaseResponse<Approval[] | null>, requests: BaseResponse<InformationRequest[] | null>): void {
    this.loading.set(false);
    if (approvals.error && requests.error) {
      this.error.set(true);
      return;
    }
    this.approvals.set(sortByCreatedAtDesc(approvals.data ?? []));
    this.requests.set(sortByCreatedAtDesc(requests.data ?? []));
  }

  #loadProjectNames(partnerId: number): void {
    this.#projectsService
      .list(partnerId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(response => {
        const names = new Map<string, string>();
        for (const project of response.data ?? []) {
          names.set(project.id, project.name);
        }
        this.#projectNames.set(names);
      });
  }

  #loadLaunch(partnerId: number, launchId: string): void {
    this.#projectsService
      .get(partnerId, launchId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(response => this.launch.set(response.data ?? null));
  }

  #initialStatusMode(): RecordStatusMode {
    const status = this.status;
    switch (status) {
      case 'all':
      case 'pending':
      case 'completed':
      case 'cancelled':
        return status;
      default:
        return this.defaultStatus;
    }
  }

  #requestVm(request: InformationRequest): RecordVm {
    return {
      kind: 'request',
      id: request.id,
      title: request.title,
      recordType: request.serviceName || request.type || '—',
      launchId: request.launchId,
      launchName: this.#launchNameFor(request.launchId),
      createdAt: request.createdAt,
      dueDate: request.dueDate ?? null,
      pending: isPendingRequest(request),
      cancelled: isCancelledRequest(request),
      draft: false,
      outOfCirculation: isCancelledRequest(request),
      reviewable: false,
      request,
      result: null,
      requestStatus: this.#requestStatusVm(request.status),
    };
  }

  #requestStatusVm(status: InformationRequestStatus): RequestStatusVm | null {
    if (status !== InformationRequestStatus.SUBMITTED && status !== InformationRequestStatus.COMPLETED) {
      return null;
    }
    return { labelKey: informationRequestStatusLabelKey(status), slug: status.toLowerCase(), sentiment: irStatusSentiment(status) };
  }

  #approvalVm(approval: Approval): RecordVm {
    const pending = isPendingApproval(approval);
    const cancelled = isCancelledApproval(approval);
    const draft = isDraftApproval(approval);
    const outOfCirculation = isOutOfCirculationApproval(approval);
    return {
      kind: 'approval',
      id: approval.id,
      title: approval.title ?? approval.assets[0]?.fileName ?? approval.id,
      recordType: this.#humanizeType((approval.payload?.['subtype'] as string) || approval.category || ''),
      launchId: approval.launchId,
      launchName: this.#launchNameFor(approval.launchId),
      createdAt: approval.createdAt,
      dueDate: approval.dueDate ?? null,
      pending,
      cancelled,
      draft,
      outOfCirculation,
      reviewable: pending && approval.ownCanReview && approval.availableActions.includes('approve') && hasHubDecidableItem(approval),
      result: pending || outOfCirculation ? null : approvalResult(approval),
      requestStatus: null,
      approval,
    };
  }

  #launchNameFor(launchId: string): string {
    return this.#projectNames().get(launchId) ?? this.launch()?.name ?? '—';
  }

  // Approval subtypes/categories arrive as snake_case keys (e.g. "marketing_landings"); show them cleanly.
  #humanizeType(value: string): string {
    const cleaned = value.replace(/[_-]+/g, ' ').trim();
    return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : '—';
  }

  #dateKey(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }
}

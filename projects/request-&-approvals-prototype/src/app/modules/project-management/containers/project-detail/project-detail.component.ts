import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Approval } from '@fz-original/app/modules/ir-approval/approvals/models/approval.model';
import { ApprovalsService } from '@fz-original/app/modules/ir-approval/approvals/services/approvals.service';
import { informationRequestStatusLabelKey } from '@fz-original/app/modules/ir-approval/information-requests/models/information-request-status-label.util';
import { InformationRequest } from '@fz-original/app/modules/ir-approval/information-requests/models/information-request.model';
import { InformationRequestsService } from '@fz-original/app/modules/ir-approval/information-requests/services/information-requests.service';
import { IgntButtonComponent, IgntDialogService } from '@ignite/common';
import { IgntTabsItemComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs-item/ignt-tabs-item.component';
import { IgntTabsComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs.component';
import { TagSentiment } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule } from '@ngx-translate/core';
import { combineLatest } from 'rxjs';
import { filter, switchMap, take } from 'rxjs/operators';

import { PermissionBaseModule } from '../../../../shared/directives/permission-based/permission-base.module';
import { BaseResponse } from '../../../../shared/models/base-response';
import { Partner } from '../../../../shared/models/partner/partner.model';
import { FeatureFlags } from '../../../../shared/optimizely/feature-flags';
import { PartnerService } from '../../../../shared/services/partner/partner.service';
import { Permissions } from '../../../../shared/services/user/permissions';
import { UserService } from '../../../../shared/services/user/user.service';
import { CreateRecordModalComponent } from '../../components/create-record-modal/create-record-modal.component';
import { CreateRecordModalData, CreateRecordModalResult } from '../../components/create-record-modal/create-record-modal.model';
import { LaunchRecordMetric, LaunchRecordRowComponent } from '../../components/launch-record-row/launch-record-row.component';
import { Project } from '../../models/project.model';
import { ProjectsService } from '../../services/projects.service';
import {
  approvalStatusSentiment,
  countApprovedAssets,
  irRequiredProgress,
  irStatusSentiment,
  isCancelledRequest,
  isOutOfCirculationApproval,
  isPendingApproval,
  isPendingRequest,
  sortByCreatedAtDesc,
} from '../../utils/launch-records.utils';

type LaunchDetailErrorKey = 'loadFailed' | 'forbidden' | 'notFound';
type FilterMode = 'pending' | 'completed' | 'all';

interface RecordRowVm {
  id: string;
  name: string;
  subtitleKey: string;
  statusLabelKey: string;
  statusKey: string;
  statusSentiment: TagSentiment;
  createdAt: Date;
  metric: LaunchRecordMetric;
  routerLink: unknown[];
}

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss'],
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    PermissionBaseModule,
    IgntButtonComponent,
    IgntTabsComponent,
    IgntTabsItemComponent,
    LaunchRecordRowComponent,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailComponent {
  readonly launch = signal<Project | null>(null);
  readonly loading = signal<boolean>(true);
  readonly error = signal<LaunchDetailErrorKey | null>(null);

  readonly requests = signal<InformationRequest[]>([]);
  readonly approvals = signal<Approval[]>([]);
  readonly requestsError = signal<boolean>(false);
  readonly approvalsError = signal<boolean>(false);

  readonly filterMode = signal<FilterMode>('pending');
  readonly activeTabIndex = signal<number>(0);

  readonly Permissions = Permissions;
  readonly FeatureFlags = FeatureFlags;

  readonly #destroyRef = inject(DestroyRef);
  readonly #launchesService = inject(ProjectsService);
  readonly #requestsService = inject(InformationRequestsService);
  readonly #approvalsService = inject(ApprovalsService);
  readonly #partnerService = inject(PartnerService);
  readonly #activatedRoute = inject(ActivatedRoute);
  readonly #userService = inject(UserService);
  readonly #dialogService = inject(IgntDialogService);
  readonly #router = inject(Router);
  readonly canViewAdminFields = this.#userService.hasPermission('can_view_create_event');
  readonly canCreateInformationRequest = true;
  readonly canCreateApproval = true;
  readonly canCreateAny = this.canCreateInformationRequest || this.canCreateApproval;

  readonly requestsCount = computed<number>(() => this.requests().length);
  readonly approvalsCount = computed<number>(() => this.approvals().length);

  readonly requestRows = computed<RecordRowVm[]>(() => {
    const launchId = this.launch()?.id ?? '';
    return this.#applyFilter(this.requests(), isPendingRequest, isCancelledRequest).map(request => {
      const progress = irRequiredProgress(request);
      return {
        id: request.id,
        name: request.title,
        subtitleKey: `informationRequests.type.${request.type.toLowerCase()}`,
        statusLabelKey: informationRequestStatusLabelKey(request.status),
        statusKey: request.status.toLowerCase(),
        statusSentiment: irStatusSentiment(request.status),
        createdAt: request.createdAt,
        metric: { mode: 'progress', completed: progress.completed, total: progress.total },
        routerLink: ['/project-management/projects', launchId, 'information-requests', request.id],
      };
    });
  });

  readonly approvalRows = computed<RecordRowVm[]>(() => {
    const launchId = this.launch()?.id ?? '';
    return this.#applyFilter(this.approvals(), isPendingApproval, isOutOfCirculationApproval).map(approval => ({
      id: approval.id,
      name: approval.title ?? approval.assets[0]?.fileName ?? approval.id,
      subtitleKey: approval.category ? `approvals.new.metadata.category.options.${approval.category}` : '',
      statusLabelKey: `approvals.status.${approval.status.toLowerCase()}`,
      statusKey: approval.status.toLowerCase(),
      statusSentiment: approvalStatusSentiment(approval.status),
      createdAt: approval.createdAt,
      metric: { mode: 'count', count: countApprovedAssets(approval) },
      routerLink: ['/project-management/projects', launchId, 'approvals', approval.id],
    }));
  });

  constructor() {
    combineLatest([
      this.#partnerService.observePartner().pipe(filter((partner): partner is Partner => partner !== null)),
      this.#activatedRoute.paramMap,
    ])
      .pipe(
        switchMap(([partner, params]) => {
          this.loading.set(true);
          this.error.set(null);
          this.requestsError.set(false);
          this.approvalsError.set(false);
          const projectId = params.get('projectId') ?? '';
          return combineLatest([
            this.#launchesService.get(partner.id, projectId),
            this.#requestsService.list(partner.id, projectId),
            this.#approvalsService.list(partner.id, projectId),
          ]);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: ([projectResponse, requestsResponse, approvalsResponse]) => {
          this.loading.set(false);
          this.#applyProject(projectResponse);
          this.#applyRequests(requestsResponse);
          this.#applyApprovals(approvalsResponse);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('loadFailed');
          this.launch.set(null);
        },
      });
  }

  onTabChange(index: number): void {
    this.activeTabIndex.set(index);
  }

  setFilter(mode: FilterMode): void {
    this.filterMode.set(mode);
  }

  openCreateModal(): void {
    const launchId = this.launch()?.id;
    if (!launchId) {
      return;
    }
    const data: CreateRecordModalData = {
      canCreateInformationRequest: this.canCreateInformationRequest,
      canCreateApproval: this.canCreateApproval,
    };
    this.#dialogService
      .openModal<CreateRecordModalResult, CreateRecordModalData>(CreateRecordModalComponent, { data })
      .closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(result => {
        if (!result) {
          return;
        }
        const segment = result.type === 'request' ? 'information-requests' : 'approvals';
        void this.#router.navigate(['/project-management/projects', launchId, segment, 'new']);
      });
  }

  #applyFilter<T>(items: T[], isPending: (item: T) => boolean, isOutOfCirculation: (item: T) => boolean): T[] {
    const mode = this.filterMode();
    if (mode === 'all') {
      return items;
    }
    // Cancelled records — and draft approvals, which await their author rather than a reviewer — are
    // out of circulation, so they belong to neither bucket. Without this they would fall through the
    // `!isPending` branch and be reported as Completed.
    const active = items.filter(item => !isOutOfCirculation(item));
    return mode === 'pending' ? active.filter(isPending) : active.filter(item => !isPending(item));
  }

  #applyProject(response: BaseResponse<Project | null>): void {
    if (response.error) {
      this.error.set(this.#mapErrorKey(response.error));
      this.launch.set(null);
      return;
    }
    if (!response.data) {
      this.error.set('notFound');
      this.launch.set(null);
      return;
    }
    this.launch.set(response.data);
  }

  #applyRequests(response: BaseResponse<InformationRequest[] | null>): void {
    if (response.error) {
      this.requestsError.set(true);
      this.requests.set([]);
      return;
    }
    this.requests.set(sortByCreatedAtDesc(response.data ?? []));
  }

  #applyApprovals(response: BaseResponse<Approval[] | null>): void {
    if (response.error) {
      this.approvalsError.set(true);
      this.approvals.set([]);
      return;
    }
    this.approvals.set(sortByCreatedAtDesc(response.data ?? []));
  }

  #mapErrorKey(error: { code: string | number }): LaunchDetailErrorKey {
    if (error.code === 403 || error.code === '403') {
      return 'forbidden';
    }
    if (error.code === 404 || error.code === '404') {
      return 'notFound';
    }
    return 'loadFailed';
  }
}

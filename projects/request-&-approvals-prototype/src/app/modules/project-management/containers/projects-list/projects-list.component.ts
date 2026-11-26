import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';

import { InfiniteScrollLoaderDirective } from '../../../../shared/directives/infinite-scroll-loader/infinite-scroll-loader.directive';
import { BaseResponse } from '../../../../shared/models/base-response';
import { Partner } from '../../../../shared/models/partner/partner.model';
import { FeatureFlags } from '../../../../shared/optimizely/feature-flags';
import { OptimizelyService } from '../../../../shared/optimizely/optimizely.service';
import { PartnerService } from '../../../../shared/services/partner/partner.service';
import { Permissions } from '../../../../shared/services/user/permissions';
import { UserService } from '../../../../shared/services/user/user.service';
import { ProjectMigrationBannerComponent } from '../../components/project-migration-banner/project-migration-banner.component';
import { Project, ProjectsPendingTotals } from '../../models/project.model';
import { ProjectsService } from '../../services/projects.service';
import { closedGatesTime, hasPendingEvaluationRecords, hasPendingRecords, isUpcomingCloseDate } from '../../utils/launch-records.utils';
import type { RecordStatusMode } from '../records-list/records-list.component';

type LaunchesListErrorKey = 'loadFailed' | 'forbidden';

// B27: lazy-load launches in pages of 15 (≈ 3 rows × 5 cards on a wide screen).
const LAUNCHES_PAGE_SIZE = 15;

@Component({
  selector: 'app-projects-list',
  templateUrl: './projects-list.component.html',
  styleUrls: ['./projects-list.component.scss'],
  imports: [CommonModule, RouterLink, TranslateModule, ProjectMigrationBannerComponent, InfiniteScrollLoaderDirective],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsListComponent {
  readonly usersRoute = '/settings/users';
  readonly launches = signal<Project[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<LaunchesListErrorKey | null>(null);
  readonly searchTerm = signal<string>('');
  // B27: upcoming launches (close-gates date today or later) first, soonest-ending first. Past or
  // undated launches stay listed only while they hold pending records, so the grid backs the summary
  // counts: past ones most recently closed first, then undated ones in backend order.
  readonly sortedLaunches = computed<Project[]>(() => {
    const now = new Date();
    const upcoming: { launch: Project; closesAt: number }[] = [];
    const pastWithPending: { launch: Project; closesAt: number }[] = [];
    const undatedWithPending: Project[] = [];
    for (const launch of this.launches()) {
      const closesAt = closedGatesTime(launch);
      if (closesAt === null) {
        if (this.#hasPendingWork(launch)) {
          undatedWithPending.push(launch);
        }
      } else if (isUpcomingCloseDate(closesAt, now)) {
        upcoming.push({ launch, closesAt });
      } else if (this.#hasPendingWork(launch)) {
        pastWithPending.push({ launch, closesAt });
      }
    }
    upcoming.sort((a, b) => a.closesAt - b.closesAt);
    pastWithPending.sort((a, b) => b.closesAt - a.closesAt);
    return [...upcoming.map(({ launch }) => launch), ...pastWithPending.map(({ launch }) => launch), ...undatedWithPending];
  });
  readonly filteredLaunches = computed<Project[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const launches = this.sortedLaunches();
    if (!term) {
      return launches;
    }
    return launches.filter(launch => [launch.name, launch.city, launch.displayCode].some(field => field?.toLowerCase().includes(term)));
  });
  readonly visibleCount = signal<number>(LAUNCHES_PAGE_SIZE);
  readonly visibleLaunches = computed<Project[]>(() => this.filteredLaunches().slice(0, this.visibleCount()));

  readonly #destroyRef = inject(DestroyRef);
  readonly #launchesService = inject(ProjectsService);
  readonly #partnerService = inject(PartnerService);
  readonly #partner$: Observable<Partner> = this.#partnerService
    .observePartner()
    .pipe(filter((partner): partner is Partner => partner !== null));
  // The backend totals also count the records with no launch, which no launch counter holds.
  readonly #pendingTotals = toSignal<ProjectsPendingTotals | null>(
    this.#partner$.pipe(switchMap(partner => this.#launchesService.pendingTotals(partner.id))),
    { initialValue: null },
  );
  // Until every backend sends the totals, the sum of the launch counters stands in for a missing one.
  readonly totalPendingInformationRequests = computed<number>(
    () =>
      this.#pendingTotals()?.informationRequests ??
      this.launches().reduce((sum, launch) => sum + (launch.pendingInformationRequestsCount ?? 0), 0),
  );
  readonly totalPendingApprovals = computed<number>(
    () => this.#pendingTotals()?.approvals ?? this.launches().reduce((sum, launch) => sum + (launch.pendingApprovalsCount ?? 0), 0),
  );
  protected readonly totalPendingEvaluationInformationRequests = computed<number>(
    () =>
      this.#pendingTotals()?.evaluationInformationRequests ??
      this.launches().reduce((sum, launch) => sum + launch.pendingEvaluationInformationRequestsCount, 0),
  );
  protected readonly totalPendingEvaluationApprovals = computed<number>(
    () =>
      this.#pendingTotals()?.evaluationApprovals ??
      this.launches().reduce((sum, launch) => sum + launch.pendingEvaluationApprovalsCount, 0),
  );
  readonly #router = inject(Router);
  readonly #userService = inject(UserService);
  readonly #optimizely = inject(OptimizelyService);
  readonly canViewAdminFields = this.#userService.hasPermission('can_view_create_event');
  protected readonly canEvaluate = this.#userService.hasPermission(Permissions.CAN_ADMIN_INFORMATION_REQUEST);
  protected readonly pendingEvaluationQueryParams: { status: RecordStatusMode } = { status: 'completed' };
  readonly canCreateApproval =
    this.#userService.hasPermission(Permissions.CAN_CREATE_APPROVAL) &&
    this.#optimizely.isFeatureEnabled(FeatureFlags.PROJECT_MANAGEMENT_FZ) === true;
  readonly canCreateInformationRequest =
    this.#userService.hasPermission(Permissions.CAN_CREATE_INFORMATION_REQUEST) &&
    this.#optimizely.isFeatureEnabled(FeatureFlags.PROJECT_MANAGEMENT_FZ) === true;

  // Drives the infinite-scroll directive: emits true once the list is loaded; a
  // partner switch toggles loading and re-emits, resetting the visible page.
  readonly active$: Observable<boolean> = toObservable(computed(() => !this.loading() && !this.error()));

  /** Page callback for the infinite-scroll directive; grows the client-side window and reports whether more remain. */
  readonly loadMoreLaunches = (page: number): Observable<boolean> => {
    this.visibleCount.set(page * LAUNCHES_PAGE_SIZE);
    return of(page * LAUNCHES_PAGE_SIZE < this.filteredLaunches().length);
  };

  constructor() {
    this.#partner$
      .pipe(
        switchMap(partner => {
          this.loading.set(true);
          this.error.set(null);
          return this.#launchesService.list(partner.id);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (response: BaseResponse<Project[] | null>) => {
          this.loading.set(false);
          if (response.error) {
            this.error.set(this.#mapErrorKey(response.error));
            this.launches.set([]);
            return;
          }
          this.launches.set(response.data ?? []);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('loadFailed');
          this.launches.set([]);
        },
      });
  }

  onLaunchClick(launch: Project): void {
    if (this.canEvaluate && !hasPendingRecords(launch) && hasPendingEvaluationRecords(launch)) {
      this.#router.navigate(['/project-management/projects', launch.id], { queryParams: this.pendingEvaluationQueryParams });
      return;
    }
    this.#router.navigate(['/project-management/projects', launch.id]);
  }

  #mapErrorKey(error: { code: string | number }): LaunchesListErrorKey {
    return error.code === 403 || error.code === '403' ? 'forbidden' : 'loadFailed';
  }

  #hasPendingWork(launch: Project): boolean {
    return hasPendingRecords(launch) || (this.canEvaluate && hasPendingEvaluationRecords(launch));
  }
}

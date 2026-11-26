import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { SessionsFiltersService } from '@fz-original/app/modules/sessions/sessions-filters.service';
import { ProgressBarComponent } from '@fz-original/app/shared/components/progress-bar/progress-bar.component';
import { SharedComponentsModule } from '@fz-original/app/shared/components/shared-components.module';
import { TableHeader } from '@fz-original/app/shared/components/table/model/table-header';
import { TableType } from '@fz-original/app/shared/components/table/table.component';
import { PageTitleModule } from '@fz-original/app/shared/layout/page-title/page-title.module';
import { PaginationWithNumbersComponent } from '@fz-original/app/shared/layout/pagination-with-numbers/pagination-with-numbers.component';
import { PipesModule } from '@fz-original/app/shared/pipes/pipes.module';
import { SearchBarFilter } from '@fz-original/app/shared/search-bar/enums/search-bar-filter.enum';
import { SearchFilter } from '@fz-original/app/shared/search-bar/models/search-filter.model';
import { SearchBarModule } from '@fz-original/app/shared/search-bar/search-bar.module';
import { IgntIconComponent } from '@ignite/icon';
import { IgntTagComponent, TagSentiment } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { CancellationDetail, PartnerCancellation } from '../../../shared/services/sessions/partner-cancellations';
import { SessionsService } from '../../../shared/services/sessions/sessions.service';

const REASON_LABEL_PREFIX = 'sessions.cancellation.reasons.';
const COMPENSATION_LABEL_PREFIX = 'sessions.cancellation.reimbursement.';
const COMPENSATION_DESCRIPTION_PREFIX = 'partnerCancellations.compensation.';
const STATUS_LABEL_PREFIX = 'sessions.cancellationHistory.status.';
const JOB_TYPE_PREFIX = 'cancel-multiple-sessions-';

const STATUS_TAG_SENTIMENT: Record<string, TagSentiment> = {
  completed: 'positive',
  failed: 'danger',
  partially_completed: 'warning',
  processing: 'warning',
};

const CARET_HEADER: TableHeader = { alignment: 'start', columnSize: '3%', hasBorderLeft: false, label: '', paddingLeft: '0' };
const EVENT_HEADER: TableHeader = {
  alignment: 'start',
  columnSize: '9%',
  hasBorderLeft: false,
  label: 'partnerCancellations.columns.event',
  paddingLeft: '0',
};
const CONTENT_HEADERS: TableHeader[] = [
  { alignment: 'start', columnSize: '12%', hasBorderLeft: false, label: 'partnerCancellations.columns.date', paddingLeft: '0' },
  { alignment: 'start', columnSize: '15%', hasBorderLeft: false, label: 'partnerCancellations.columns.requestedBy', paddingLeft: '0' },
  { alignment: 'start', columnSize: '14%', hasBorderLeft: false, label: 'partnerCancellations.columns.reason', paddingLeft: '0' },
  { alignment: 'start', columnSize: '14%', hasBorderLeft: false, label: 'partnerCancellations.columns.compensation', paddingLeft: '0' },
  { alignment: 'end', columnSize: '9%', hasBorderLeft: false, label: 'partnerCancellations.columns.orders', paddingLeft: '0' },
  { alignment: 'end', columnSize: '9%', hasBorderLeft: false, label: 'partnerCancellations.columns.tickets', paddingLeft: '0' },
  { alignment: 'start', columnSize: '15%', hasBorderLeft: false, label: 'partnerCancellations.columns.status', paddingLeft: '0' },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    PageTitleModule,
    SearchBarModule,
    SharedComponentsModule,
    ProgressBarComponent,
    PaginationWithNumbersComponent,
    PipesModule,
    IgntIconComponent,
    IgntTagComponent,
    TranslateModule,
  ],
  selector: 'app-partner-cancellations',
  standalone: true,
  styleUrl: './partner-cancellations.component.scss',
  templateUrl: './partner-cancellations.component.html',
})
export class PartnerCancellationsComponent implements OnInit {
  readonly #sessionsService = inject(SessionsService);
  readonly #sessionsFiltersService = inject(SessionsFiltersService);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly embedded: boolean = this.#route.snapshot.data['embedded'] === true;
  protected readonly showEventColumn: boolean = !this.embedded;
  protected readonly TableType = TableType;
  protected readonly pageSize = 10;
  protected readonly mandatoryFilters: SearchBarFilter[] = [];
  protected readonly timezone = signal<string>(Intl.DateTimeFormat().resolvedOptions().timeZone);
  protected readonly headers: TableHeader[] = this.showEventColumn
    ? [CARET_HEADER, EVENT_HEADER, ...CONTENT_HEADERS]
    : [CARET_HEADER, ...CONTENT_HEADERS];
  protected readonly columnCount = this.headers.length;

  protected readonly cancellations = signal<PartnerCancellation[]>([]);
  protected readonly details = signal<Record<string, CancellationDetail | null>>({});
  protected readonly detailLoadingIds = signal<Set<string>>(new Set());
  protected readonly expandedIds = signal<Set<string>>(new Set());
  protected readonly isLoading = signal<boolean>(true);
  protected readonly hasError = signal<boolean>(false);
  protected readonly noEventSelected = signal<boolean>(false);
  protected readonly totalCount = signal<number>(0);
  protected readonly selectedPage = signal<number>(1);
  protected readonly nextPage = signal<number | null>(null);
  protected readonly prevPage = signal<number | null>(null);

  protected readonly trackById = (_: number, cancellation: PartnerCancellation): string => cancellation.id;

  #mainPlanId: number | undefined = undefined;
  #pendingUrlPlanReconcile = false;
  #embeddedInitialized = false;
  #loadSubscription?: Subscription;

  loadNewSearch(filters: SearchFilter): void {
    if (filters?.timezone) {
      this.timezone.set(filters.timezone);
    }
    const mainPlanId = filters?.selectedPlan?.id ?? undefined;
    if (this.#pendingUrlPlanReconcile) {
      this.#pendingUrlPlanReconcile = false;
      if (mainPlanId === undefined) {
        return;
      }
    }
    if (mainPlanId === this.#mainPlanId && !this.hasError()) {
      return;
    }
    this.#mainPlanId = mainPlanId;
    this.#load(1);
  }

  ngOnInit(): void {
    if (this.embedded) {
      this.#sessionsFiltersService
        .getFilters()
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe(filters => this.#applyEmbeddedFilters(filters));
      return;
    }
    const planId = Number(this.#route.snapshot.queryParamMap.get('planId'));
    this.#mainPlanId = Number.isFinite(planId) && planId > 0 ? planId : undefined;
    this.#pendingUrlPlanReconcile = this.#mainPlanId !== undefined;
    this.#load(1);
  }

  onPageSelected(page: number): void {
    this.#load(page);
  }

  toggleExpanded(cancellation: PartnerCancellation): void {
    const expanded = new Set(this.expandedIds());
    if (expanded.has(cancellation.id)) {
      expanded.delete(cancellation.id);
    } else {
      expanded.add(cancellation.id);
      this.#ensureDetail(cancellation.id);
    }
    this.expandedIds.set(expanded);
  }

  protected compensationDescriptionKey(compensation: string): string {
    return COMPENSATION_DESCRIPTION_PREFIX + compensation;
  }

  protected compensationLabelKey(compensation: string): string {
    return COMPENSATION_LABEL_PREFIX + compensation;
  }

  protected countLabel(value: number | null): string {
    return value !== null ? String(value) : '—';
  }

  protected detailFor(cancellationBatchId: string): CancellationDetail | null {
    return this.details()[cancellationBatchId] ?? null;
  }

  protected isDetailLoading(id: string): boolean {
    return this.detailLoadingIds().has(id);
  }

  protected isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  protected isNoOp(status: string): boolean {
    return status === 'DISCARDED';
  }

  protected jobLabel(type: string): string {
    return type.startsWith(JOB_TYPE_PREFIX) ? type.slice(JOB_TYPE_PREFIX.length).replace(/-/g, ' ') : type;
  }

  protected openInCalendar(cancellation: PartnerCancellation): void {
    void this.#router.navigate(['/sessions/calendar'], {
      queryParams: { planId: cancellation.mainPlanId, venueId: cancellation.placeId },
    });
  }

  protected reasonLabelKey(reason: string): string {
    return REASON_LABEL_PREFIX + reason;
  }

  protected statusLabelKey(status: string): string {
    return STATUS_LABEL_PREFIX + status;
  }

  protected statusSentiment(status: string): TagSentiment {
    return STATUS_TAG_SENTIMENT[status] ?? 'info';
  }

  #applyEmbeddedFilters(filters: SearchFilter | null): void {
    if (filters?.timezone) {
      this.timezone.set(filters.timezone);
    }
    const mainPlanId = filters?.selectedPlan?.id ?? undefined;
    if (this.#embeddedInitialized && mainPlanId === this.#mainPlanId && !this.hasError()) {
      return;
    }
    this.#embeddedInitialized = true;
    this.#mainPlanId = mainPlanId;
    if (mainPlanId === undefined) {
      this.#resetState();
      this.noEventSelected.set(true);
      this.isLoading.set(false);
      return;
    }
    this.noEventSelected.set(false);
    this.#load(1);
  }

  #ensureDetail(cancellationBatchId: string): void {
    if (this.details()[cancellationBatchId] || this.detailLoadingIds().has(cancellationBatchId)) {
      return;
    }
    this.detailLoadingIds.update(current => new Set(current).add(cancellationBatchId));
    this.#sessionsService
      .getCancellationDetail(cancellationBatchId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(detail => {
        this.details.update(current => ({ ...current, [cancellationBatchId]: detail }));
        this.detailLoadingIds.update(current => {
          const next = new Set(current);
          next.delete(cancellationBatchId);
          return next;
        });
      });
  }

  #load(page: number): void {
    this.#loadSubscription?.unsubscribe();
    this.isLoading.set(true);
    this.hasError.set(false);
    this.selectedPage.set(page);

    this.#loadSubscription = this.#sessionsService
      .getPartnerCancellations(page, this.#mainPlanId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.#setErrorState();
        },
        next: response => {
          if (response.error) {
            this.#setErrorState();
            return;
          }
          this.cancellations.set(response.data?.cancellations ?? []);
          this.totalCount.set(response.data?.totalCount ?? 0);
          this.nextPage.set(response.getNextPaginationPage());
          this.prevPage.set(page > 1 ? page - 1 : null);
          this.expandedIds.set(new Set());
          this.details.set({});
          this.detailLoadingIds.set(new Set());
          this.isLoading.set(false);
        },
      });
  }

  #resetState(): void {
    this.hasError.set(false);
    this.cancellations.set([]);
    this.totalCount.set(0);
    this.expandedIds.set(new Set());
    this.details.set({});
    this.detailLoadingIds.set(new Set());
  }

  #setErrorState(): void {
    this.#resetState();
    this.hasError.set(true);
    this.isLoading.set(false);
  }
}

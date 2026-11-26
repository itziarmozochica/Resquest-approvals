import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  Input,
  OnChanges,
  signal,
  SimpleChanges,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { LoadReportEvent } from '@fz-original/app/core/tracking/core/events/load-report';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { FzAssistantBannerComponent } from '@fz-original/app/shared/components/fz-assistant-banner/fz-assistant-banner.component';
import { HelpTopicBannerComponent } from '@fz-original/app/shared/components/help-topic-banner/help-topic-banner.component';
import { QueuePanelComponent } from '@fz-original/app/shared/components/plan-metrics/queue-panel/queue-panel.component';
import { SharedComponentsModule } from '@fz-original/app/shared/components/shared-components.module';
import { HideWrapperOnHelpTopicCloseDirective } from '@fz-original/app/shared/directives/hide-wrapper-on-help-topic-close/hide-wrapper-on-help-topic-close.directive';
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';
import { PlanDetail } from '@fz-original/app/shared/models/plan/plan-detail.model';
import { ChatbotFacade } from '@fz-original/app/shared/services/chatbot/chatbot.facade';
import { Channel } from '@fz/channel';
import { IgntAlertComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { IFrameResizerModule } from '../../directives/iframe-resizer/iframe-resizer.module';
import { BaseResponse } from '../../models/base-response';
import { GraphDataFreshness } from '../../models/graph/graph.data-freshness';
import { GraphGroup } from '../../models/graph/graph.group';
import { Graph } from '../../models/graph/graph.model';
import { Outage } from '../../models/outage/outage.model';
import { Partner } from '../../models/partner/partner.model';
import { Plan } from '../../models/plan/plan.model';
import { FeatureFlags } from '../../optimizely/feature-flags';
import { OptimizelyService } from '../../optimizely/optimizely.service';
import { PipesModule } from '../../pipes/pipes.module';
import { GraphService } from '../../services/graph/graph.service';
import { SearchGraphFilters } from '../../services/graph/models/search-graphs';
import { OutageService } from '../../services/outage/outage.service';
import { PartnerService } from '../../services/partner/partner.service';
import { Permissions } from '../../services/user/permissions';
import { UserService } from '../../services/user/user.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntAlertComponent,
    SharedComponentsModule,
    IconsModule,
    FzAssistantBannerComponent,
    TranslateModule,
    HelpTopicBannerComponent,
    PipesModule,
    IFrameResizerModule,
    HideWrapperOnHelpTopicCloseDirective,
    QueuePanelComponent,
  ],
  selector: 'app-plan-metrics',
  standalone: true,
  styleUrls: ['./plan-metrics.component.scss'],
  templateUrl: './plan-metrics.component.html',
})
export class PlanMetricsComponent implements OnChanges {
  #changeDetectorRef = inject(ChangeDetectorRef);
  #chatbotFacade = inject(ChatbotFacade);
  #destroyRef = inject(DestroyRef);
  #graphService = inject(GraphService);
  #optimizelyService = inject(OptimizelyService);
  #outageService = inject(OutageService);
  #partner: Partner | null = null;
  #partnerService = inject(PartnerService);
  #selectedGraphForFreshness$ = new Subject<Graph>();
  #trackingService = inject(TrackingService);
  #userService = inject(UserService);

  @Input() channelId?: string;
  errorGraphs = signal(false);
  graphs = signal<Graph[]>([]);
  isFzAssistantEligible = false;
  loadingGraphs = signal(false);
  outage = signal<Outage | null>(null);
  dataFreshness = signal<GraphDataFreshness | null>(null);
  isDataFreshnessVisible = computed<boolean>(() => {
    const freshness = this.dataFreshness();
    return freshness !== null && (freshness.lastData !== null || freshness.lastRefresh !== null);
  });
  @Input({ required: true }) plan!: Plan | PlanDetail;
  selectedGraph = signal<Graph | null>(null);

  constructor() {
    this.#partner = this.#partnerService.getPartner();
    this.#setupDataFreshnessStream();
    this.#chatbotFacade
      .isEligible$()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((eligible: boolean) => {
        this.isFzAssistantEligible = eligible && !this.#chatbotFacade.isFzAssistantBannerDismissed();
        this.#changeDetectorRef.markForCheck();
      });
  }

  get isQueueSectionVisible(): boolean {
    return (
      (this.#optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.PLAN_QUEUE_METRICS,
        team: 'experience',
      }) ??
        false) &&
      this.#userService.hasPermission(Permissions.CAN_MANAGE_QUEUES) &&
      !this.#isResellerPartner() &&
      this.#hasQueueOnCurrentChannel()
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['plan'] && this.plan) {
      this.#loadMetrics();
    }
  }

  updateSelectedTab(graph: Graph): void {
    this.selectedGraph.set(graph);
    this.#getGraphDataFreshness(graph);
    if (graph) {
      this.#trackingService.track(
        new LoadReportEvent({
          report_name: graph.name,
          restriction_type: graph.restrictionType,
          time: new Date().toISOString(),
        }),
      );
    }
  }

  #getNetworkGraph(): Observable<Graph[]> {
    let filters: Partial<SearchGraphFilters> = { planId: this.plan.id };
    if (this.#isResellerPartner()) {
      filters = {
        ...filters,
        groupName: GraphGroup.affiliatesNetwork,
        organizationOwnerId: this.plan.partnerId ?? undefined,
      };
    }

    return this.#graphService.searchOrganizationGraph(filters);
  }

  #getOutages(): Observable<BaseResponse<Outage[] | null>> {
    return this.#outageService.getOutages();
  }

  #getPlanGraph(): Observable<Graph[]> {
    let filters: Partial<SearchGraphFilters> = { groupName: GraphGroup.analytics, planId: this.plan.id };
    if (this.channelId) {
      filters = { ...filters, channelId: this.channelId };
    }

    if (this.#isResellerPartner()) {
      if (this.#userService.hasPermission(Permissions.CAN_VIEW_AMBASSADOR_DASHBOARD)) {
        filters.groupName = GraphGroup.ambassadors;
      } else if (this.#userService.hasPermission(Permissions.CAN_VIEW_AFFILIATE_DASHBOARD)) {
        filters.groupName = GraphGroup.affiliates;
      } else {
        filters = {};
      }
    } else if (this.plan?.isWaitlist) {
      filters.groupName = GraphGroup.waitlist;
    } else if (this.plan?.isPrizeDraw) {
      filters.groupName = GraphGroup.prizeDraw;
    } else if (this.plan?.isAuction) {
      filters.groupName = GraphGroup.auction;
    }

    return this.#graphService.searchOrganizationGraph(filters);
  }

  #hasQueueOnCurrentChannel(): boolean {
    const queueOverviewChannelIds =
      this.plan != null && 'queueOverviewChannelIds' in this.plan ? this.plan.queueOverviewChannelIds : undefined;
    if (queueOverviewChannelIds === undefined) {
      return true;
    }
    return queueOverviewChannelIds.includes(this.channelId || Channel.FeverMarketplace);
  }

  #isResellerPartner(): boolean {
    return this.#partner?.type !== undefined && this.#partnerService.isReseller(this.#partner.type);
  }

  #getGraphDataFreshness(graph: Graph): void {
    this.#selectedGraphForFreshness$.next(graph);
  }

  #setupDataFreshnessStream(): void {
    this.#selectedGraphForFreshness$
      .pipe(
        switchMap((graph: Graph) => {
          this.dataFreshness.set(null);

          const planId = this.plan.id;
          const partnerId = this.#partner?.id;

          if (planId == null || partnerId == null || graph.externalId === null) {
            return of(null);
          }
          return this.#graphService.getDataFreshness(planId, partnerId, graph.externalId).pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((dataFreshness: GraphDataFreshness | null) => {
        this.dataFreshness.set(dataFreshness);
      });
  }

  #loadMetrics(): void {
    this.graphs.set([]);
    this.selectedGraph.set(null);
    this.errorGraphs.set(false);
    this.loadingGraphs.set(true);
    this.dataFreshness.set(null);

    const graphRequests$: Observable<Graph[][]> = this.#userService.hasPermission(Permissions.CAN_VIEW_MY_NETWORK)
      ? forkJoin([this.#getPlanGraph(), this.#getNetworkGraph()])
      : forkJoin([this.#getPlanGraph()]);

    graphRequests$
      .pipe(
        catchError(() => {
          this.loadingGraphs.set(false);
          this.errorGraphs.set(true);
          return of(null as Graph[][] | null);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((planGraphs: Graph[][] | null) => {
        if (!planGraphs || planGraphs.length === 0) {
          this.loadingGraphs.set(false);
          this.errorGraphs.set(true);
          return;
        }

        this.graphs.set(planGraphs.flat());
        this.loadingGraphs.set(false);

        if (this.graphs().length > 0) {
          this.updateSelectedTab(this.graphs()[0]);
        }

        this.#getOutages()
          .pipe(takeUntilDestroyed(this.#destroyRef))
          .subscribe((outagesResponse: BaseResponse<Outage[] | null>) => {
            if (outagesResponse.data) {
              this.outage.set(outagesResponse.data[0]);
            }
          });
      });
  }
}

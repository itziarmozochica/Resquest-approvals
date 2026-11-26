import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { EventSelectionBandComponent } from '@fz-original/app/shared/components/event-selection-band/event-selection-band.component';
import { FzAssistantBannerComponent } from '@fz-original/app/shared/components/fz-assistant-banner/fz-assistant-banner.component';
import { HelpTopicBannerComponent } from '@fz-original/app/shared/components/help-topic-banner/help-topic-banner.component';
import { SharedComponentsModule } from '@fz-original/app/shared/components/shared-components.module';
import { HideWrapperOnHelpTopicCloseDirective } from '@fz-original/app/shared/directives/hide-wrapper-on-help-topic-close/hide-wrapper-on-help-topic-close.directive';
import { IFrameResizerModule } from '@fz-original/app/shared/directives/iframe-resizer/iframe-resizer.module';
import { RealTimeEmbeddedFrameComponent } from '@fz-original/app/shared/insights-embed/components/real-time-embedded-frame/real-time-embedded-frame.component';
import { RealTimeEmptySelectionComponent } from '@fz-original/app/shared/insights-embed/components/real-time-empty-selection/real-time-empty-selection.component';
import { REAL_TIME_CATALOG_TIMEOUT_MS } from '@fz-original/app/shared/insights-embed/constants/real-time-grant.constants';
import { RealTimeDashboardSlug, RealTimeDashboardSlugET } from '@fz-original/app/shared/insights-embed/models/real-time-dashboard-slug';
import { RealTimeFiltersEmbeddedSelection } from '@fz-original/app/shared/insights-embed/models/real-time-embedded-selection.model';
import { maxPlanIdsForDashboard } from '@fz-original/app/shared/insights-embed/models/real-time-plan-limits';
import { RealTimeDashboardService } from '@fz-original/app/shared/insights-embed/services/real-time-dashboard.service';
import { RealTimeEmbeddedAuthCookieService } from '@fz-original/app/shared/insights-embed/services/real-time-embedded-auth-cookie.service';
import { RealTimeEmbeddedMessagingService } from '@fz-original/app/shared/insights-embed/services/real-time-embedded-messaging.service';
import { RealTimeFiltersCookieService } from '@fz-original/app/shared/insights-embed/services/real-time-filters-cookie.service';
import { toRealTimeEmbeddedSelection } from '@fz-original/app/shared/insights-embed/utils/real-time-embedded-selection.util';
import { setupRealTimeInsightsPortalDnsPrefetch } from '@fz-original/app/shared/insights-embed/utils/real-time-insights-portal-prefetch.util';
import { FiltersModule } from '@fz-original/app/shared/layout/filters/filters.module';
import { PipesModule } from '@fz-original/app/shared/pipes/pipes.module';
import { ChatbotFacade } from '@fz-original/app/shared/services/chatbot/chatbot.facade';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntAlertComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { defer, EMPTY, forkJoin, merge, Observable, of, ReplaySubject, Subject } from 'rxjs';
import { catchError, finalize, map, switchMap, tap, timeout } from 'rxjs/operators';

import { Load360ReportEvent } from '../../../core/tracking/core/events/load-360-report';
import { TrackingService } from '../../../core/tracking/tracking.service';
import { BaseResponse } from '../../../shared/models/base-response';
import { GraphGroup } from '../../../shared/models/graph/graph.group';
import { Graph } from '../../../shared/models/graph/graph.model';
import { Outage } from '../../../shared/models/outage/outage.model';
import { GraphService } from '../../../shared/services/graph/graph.service';
import { OutageService } from '../../../shared/services/outage/outage.service';
import { GraphsTabComponent } from '../shared/components/graphs-tab/graphs-tab.component';
import { reports360RealTimeView } from '../tracking/events/reports-360-real-time-view.event';
import { CURRENCY_AGNOSTIC_DASHBOARD_EXTERNAL_IDS } from './constants/currency-agnostic-dashboards.constants';
import { PLAN_DASHBOARD_MOUNT_ROOT_SEGMENT } from './constants/plan-dashboard-mount.constants';
import { REAL_TIME_TAB_DESCRIPTORS, RealTimeTabDescriptor } from './constants/real-time-tab.constants';
import { ThreeSixtyAnalyticsFiltersComponent } from './three-sixty-analytics-filters/three-sixty-analytics-filters.component';
import { ThreeSixtySelection } from './three-sixty-analytics-filters/three-sixty-analytics-filters.model';
import {
  isRealTimeTabGraph,
  realTimeSlugForGraph,
  realTimeTabDescriptorForGraph,
  replaceRealTimeGrantsWithTabs,
} from './utils/real-time-tab.util';
import { isSinglePlanDashboardGraph } from './utils/single-plan-dashboard.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntAlertComponent,
    CommonModule,
    EventSelectionBandComponent,
    /** Container only — see the note in the template. */
    FiltersModule,
    FzAssistantBannerComponent,
    ThreeSixtyAnalyticsFiltersComponent,
    HelpTopicBannerComponent,
    HideWrapperOnHelpTopicCloseDirective,
    GraphsTabComponent,
    SharedComponentsModule,
    PipesModule,
    IgntIconComponent,
    IFrameResizerModule,
    TranslateModule,
    RealTimeEmbeddedFrameComponent,
    RealTimeEmptySelectionComponent,
  ],
  providers: [
    /**
     * The moved service, not 360's byte-identical twin, which this PR deletes: two instances writing
     * and clearing the same `b2b_embedded_auth_token` cookie in one component is exactly the hazard
     * PRD-4516 §3.9 describes.
     */
    RealTimeEmbeddedAuthCookieService,
    RealTimeFiltersCookieService,
  ],
  selector: 'app-three-sixty-analytics',
  standalone: true,
  styleUrl: './three-sixty-analytics.component.scss',
  templateUrl: './three-sixty-analytics.component.html',
})
export class ThreeSixtyAnalyticsComponent implements OnInit {
  readonly #activatedRoute = inject(ActivatedRoute);
  readonly #changeDetectorRef = inject(ChangeDetectorRef);
  readonly #chatbotFacade = inject(ChatbotFacade);
  readonly #destroyRef = inject(DestroyRef);
  readonly #embeddedAuthCookieService = inject(RealTimeEmbeddedAuthCookieService);
  readonly #fzTrackingService = inject(FzTrackingService);
  #graphRequestCount = 0;
  readonly #graphService = inject(GraphService);
  readonly #isMobile = inject(BreakpointStateService).getStateProp('isMobile');
  /** Set while the Real Time tab holds the screen and the Metabase graphs are therefore not refetched. */
  #graphsAreStaleForSelection = false;
  readonly #outageService = inject(OutageService);
  readonly #partnerService = inject(PartnerService);
  readonly #translateService = inject(TranslateService);
  readonly #realTimeDashboardService = inject(RealTimeDashboardService);
  readonly #realTimeEmbeddedMessagingService = inject(RealTimeEmbeddedMessagingService);
  readonly #realTimeFiltersCookieService = inject(RealTimeFiltersCookieService);
  readonly #reloadGraphsSubject = new Subject<void>();
  readonly #trackingService = inject(TrackingService);
  #realTimeEmbedPrepared = false;
  graphs: Array<Graph> | null = null;
  isFzAssistantEligible = false;
  loadingGraphs = false;
  outage: Outage | null = null;
  realTimeDashboardIdBySlug = new Map<RealTimeDashboardSlugET, string>();
  /**
   * Held in a field rather than derived in a getter: the frame posts `FILTERS_UPDATE` from an `effect`
   * on this input, so a new object identity on every change-detection pass would post on every pass.
   */
  realTimeEmbeddedSelection: RealTimeFiltersEmbeddedSelection | null = null;
  /**
   * Whether this is the `/plans/dashboard` mount rather than `/reports/three-sixty-analytics`. The
   * component renders the same screen on both, but the plan mount replaced a screen partners already
   * knew, so a few things follow what that screen did (PRD-4718).
   *
   * Read from the activated route rather than from a route `data` key on purpose: `data` is the
   * tidier mechanism, but it would mean editing two route configs, and this change is meant to stay
   * inside the component. The snapshot is safe to read at construction — unlike `Router.url`, which
   * is still the previous URL while the route is being activated.
   */
  readonly #isPlanDashboardMount = this.#activatedRoute.snapshot.pathFromRoot.some(route =>
    route.url.some(segment => segment.path === PLAN_DASHBOARD_MOUNT_ROOT_SEGMENT),
  );
  /**
   * On the plan mount the FZ Assistant banner goes back where `/plans/dashboard` had it before
   * #12837: on the page background above the card rather than inside it, and held back until the
   * graphs are in — both of which the legacy plan dashboard did. The reports mount is left alone;
   * it never had the legacy layout to return to, and nobody asked for it to change.
   */
  readonly showFzAssistantBannerAboveCard = this.#isPlanDashboardMount;
  readonly sectionKey = this.#isPlanDashboardMount ? 'menu.events' : 'analyticsHome.pageTitle';
  readonly pageTitleKey = this.#isPlanDashboardMount ? 'planDetail.dashboard' : 'analyticsHome.analytics360.title';
  selectCurrencyTemplate: TemplateRef<unknown> | null = null;
  selectedCurrency = '';
  selectedFiltersSubject = new ReplaySubject<ThreeSixtySelection>(1);
  selectedGraph: Graph | null = null;
  private readonly selectionBand = viewChild(EventSelectionBandComponent);
  private readonly threeSixtyFilters = viewChild(ThreeSixtyAnalyticsFiltersComponent);
  readonly #latestSelection = signal<ThreeSixtySelection | null>(null);
  protected readonly selectedPlansSummary = computed(() =>
    this.#latestSelection() ? (this.threeSixtyFilters()?.selectedPlanOptions ?? []).map(({ title }) => title).join(', ') : '',
  );
  selectedPlanIds: Array<number> = [];
  /**
   * Set to the tab that was open when a reload stopped returning it, and kept on the bar in its old
   * position so the notice explaining it has a referent. Cleared as soon as another tab is picked or
   * a reload brings it back.
   */
  unavailableGraph: Graph | null = null;

  /**
   * The last tab that a reload found unavailable on its own. Kept so its collapse stays off when the
   * widened reload brings it back: re-arming it there would narrow the selection again, which drops
   * the tab again, and the panel would flip between the report and the notice for as long as the
   * partner stayed on the screen. An explicit click clears it — asking for the tab is the one signal
   * that the narrowing is wanted.
   */
  #collapseSuppressedGraphId: string | null = null;
  #foldedPlanIds = '';

  constructor() {
    effect(() => {
      const selection = this.#latestSelection();
      const band = this.selectionBand();
      if (selection && band) {
        untracked(() => this.#applySelectionToBand(selection, band));
      }
    });

    this.#chatbotFacade
      .isEligible$()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((eligible: boolean) => {
        this.isFzAssistantEligible = eligible && !this.#chatbotFacade.isFzAssistantBannerDismissed();
        this.#changeDetectorRef.markForCheck();
      });

    this.#outageService
      .getOutages()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((outagesResponse: BaseResponse<Outage[] | null>) => {
        if (outagesResponse.data?.length) {
          this.outage = outagesResponse.data[0];
          this.#changeDetectorRef.markForCheck();
        }
      });
  }

  /**
   * None of these dashboards' cards read the currency parameter, so any pick would relabel the same
   * figures without changing them. The picker is pinned to the event's own currency instead.
   */
  get isCurrencyLockedToLocal(): boolean {
    // Gated on the narrowing rather than trusting the two lists to stay in step. Pinning while several
    // events across several cities are still rendering would label a multi-currency total with one
    // arbitrary city's currency — the exact mislabelling the pin exists to prevent — and it would do it
    // silently, on nothing louder than an id added to one list and not the other.
    if (!this.isSinglePlanDashboardSelected) {
      return false;
    }

    const externalId = this.#renderableSelectedGraph?.externalId;
    return externalId !== undefined && externalId !== null && CURRENCY_AGNOSTIC_DASHBOARD_EXTERNAL_IDS.has(externalId);
  }

  get isRealTimeSelectionTruncated(): boolean {
    return this.isRealTimeTabSelected && (this.realTimeEmbeddedSelection?.planIds.length ?? 0) < this.selectedPlanIds.length;
  }

  get isRealTimeTabSelected(): boolean {
    return isRealTimeTabGraph(this.#renderableSelectedGraph);
  }

  get isSelectedGraphUnavailable(): boolean {
    return this.unavailableGraph !== null;
  }

  /**
   * These dashboards bind `id_plan` as a Metabase template variable, so they only ever honour one
   * plan. Rather than dropping the tab, we narrow the selection while it is open and say so — the
   * same contract as the Real Time tab (PRD-4516 §3.3), and the partner keeps the report.
   */
  get isSinglePlanDashboardSelected(): boolean {
    const graph: Graph | null = this.#renderableSelectedGraph;
    return graph !== null && graph.id !== this.#collapseSuppressedGraphId && isSinglePlanDashboardGraph(graph);
  }

  get isSinglePlanSelectionActive(): boolean {
    return this.isSinglePlanDashboardSelected;
  }

  ngOnInit(): void {
    merge(
      this.selectedFiltersSubject,
      // Leaving the Real Time tab after the selection changed inside it: the graphs it skipped
      // refetching are now the ones on screen (PRD-4516 §3.3.3).
      this.#reloadGraphsSubject.pipe(map(() => ({ currency: this.selectedCurrency, planIds: this.selectedPlanIds }))),
    )
      .pipe(
        switchMap(({ currency, planIds }) => this.#loadGraph(planIds, currency as string)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  onFiltersSelected(selection: ThreeSixtySelection): void {
    this.selectedFiltersSubject.next(selection);
    this.#latestSelection.set(selection);
  }

  onTabSelected(graph: Graph): void {
    // The unavailable tab is on the bar to be read, not to be opened: there is nothing behind it.
    if (graph.id === this.unavailableGraph?.id) {
      return;
    }
    this.#collapseSuppressedGraphId = null;
    this.#dropUnavailableGraph();
    this.updateSelectedTab(graph, this.selectedPlanIds, this.selectedCurrency);
  }

  get realTimeDashboardId(): string | null {
    const slug = realTimeSlugForGraph(this.#renderableSelectedGraph);

    return slug === null ? null : (this.realTimeDashboardIdBySlug.get(slug) ?? null);
  }

  /**
   * The tab's own label, so the frame a screen reader lands in is named the same thing the partner
   * clicked to get there. A separate sentence held here would drift from the catalog on the first
   * rename, and name the frame after a report the bar no longer calls that.
   */
  get realTimeFrameTitle(): string {
    const graph: Graph | null = this.#renderableSelectedGraph;

    return graph !== null && isRealTimeTabGraph(graph) ? graph.name : '';
  }

  get realTimeNotice(): string {
    if (!this.isRealTimeSelectionTruncated) return '';

    return this.#translateService.instant('analytics.analytics360.realTime.truncatedNotice', {
      selected: this.selectedPlanIds.length,
      shown: this.realTimeEmbeddedSelection?.planIds.length ?? 0,
    });
  }

  setSelectCurrencyTemplate(template: TemplateRef<unknown> | null): void {
    this.selectCurrencyTemplate = template;
    this.#changeDetectorRef.detectChanges();
  }

  get isCurrencyPickerVisible(): boolean {
    return realTimeSlugForGraph(this.#renderableSelectedGraph) !== RealTimeDashboardSlug.Attendance;
  }

  updateSelectedTab(graph: Graph, planIds: Array<number>, currency: string): void {
    const wasRealTimeTabSelected = this.isRealTimeTabSelected;
    const previousRealTimeSlug: RealTimeDashboardSlugET | null = realTimeSlugForGraph(this.#renderableSelectedGraph);
    // Read before `selectedGraph` moves: leaving one of these widens the selection back, and the
    // tracking below has to know that a second, correct load event is already on its way.
    const wasSinglePlanDashboardSelected = this.isSinglePlanDashboardSelected;
    const realTimeDescriptor: RealTimeTabDescriptor | null = realTimeTabDescriptorForGraph(graph);
    const isRealTimeTab = realTimeDescriptor !== null;
    // Every tab that collapses the selection has the same tracking hazard, not just the Real Time one.
    const collapsesSelection: boolean = isSinglePlanDashboardGraph(graph);
    // Read before the branch below clears the flag, because the tracking further down needs to know.
    const graphsReloadQueued = !isRealTimeTab && wasRealTimeTabSelected && this.#graphsAreStaleForSelection;

    this.selectedGraph = graph;
    this.selectedPlanIds = planIds;
    this.selectedCurrency = currency;

    if (realTimeDescriptor !== null) {
      this.#updateRealTimeEmbeddedSelection(planIds, currency, realTimeDescriptor.slug);
      if (previousRealTimeSlug !== realTimeDescriptor.slug) {
        this.#fzTrackingService.track(
          reports360RealTimeView({
            dashboard: realTimeDescriptor.trackingDashboard,
            planCount: planIds.length,
            planCountSent: this.realTimeEmbeddedSelection?.planIds.length ?? 0,
            time: new Date().toISOString(),
          }),
        );
      }
    } else if (graphsReloadQueued) {
      this.#graphsAreStaleForSelection = false;
      this.#reloadGraphsSubject.next();
    }

    /**
     * Entering the tab with several plans selected means the single-plan collapse is about to re-emit,
     * and `#loadGraph` tracks it from there with the plan that actually gets rendered. Tracking here too
     * would report the pre-collapse selection for a screen that never showed it (PRD-4516 §3.14).
     *
     * Leaving it is that same leak mirrored, and it needs the same silence: `planIds` is the collapsed
     * plan, while the Metabase report being opened is fetched with the multi-plan selection the filters
     * are about to restore. The queued reload ends in `#loadGraph`, which comes back through here with
     * the ids it actually used, so waiting for it loses no event and reports the screen that exists.
     *
     * `graphsReloadQueued` only ever covers the way out of the Real Time tab, which is the one that
     * marks the graphs stale on the way in. A single-plan Metabase dashboard marks nothing, so leaving
     * one needs its own silence: without it the exit fires immediately with the collapsed plan, and the
     * widened re-emission fires a second event for the same graph.
     */
    const widenPending: boolean = wasSinglePlanDashboardSelected && !collapsesSelection;
    if (!graphsReloadQueued && !widenPending && (!collapsesSelection || planIds.length <= 1)) {
      this.#trackReportLoad(realTimeDescriptor?.reportName ?? graph.name, planIds, currency);
    }
  }

  #applySelectionToBand(selection: ThreeSixtySelection, band: EventSelectionBandComponent): void {
    const planIds = selection.planIds.join(',');
    if (!planIds) {
      this.#foldedPlanIds = '';
      band.unfold();
    } else if (planIds !== this.#foldedPlanIds) {
      this.#foldedPlanIds = planIds;
      if (this.#isMobile()) {
        band.fold();
      }
    }
  }

  #dropUnavailableGraph(): void {
    if (this.unavailableGraph === null) {
      return;
    }
    const unavailableGraphId: string = this.unavailableGraph.id;
    this.graphs = this.graphs?.filter(graph => graph.id !== unavailableGraphId) ?? null;
    this.unavailableGraph = null;
  }

  /**
   * The tab the partner was on can disappear from a reload: which dashboards a plan is entitled to is
   * resolved per `(partner, plan)`, so changing the selection can drop the open one. Two mechanisms do
   * it and the response tells them apart nowhere — the rules table intersects each plan's entitlements
   * (`DashboardRulesResult.for_plans`), so one event without the report is enough to remove it, and the
   * `dashboards-compatibility` map suppresses reports a sibling dashboard replaces. A dashboard that is
   * simply absent carries no reason with it, which is why the notice says what we can prove — that it
   * is not available for this selection — and never why.
   *
   * Silently switching them to another report was the alternative and is worse for a reporting screen:
   * figures would change under a partner mid-read with nothing saying so. Keeping the tab where it was
   * and explaining costs them one click and no misread.
   */
  #keepSelectedGraphAsUnavailable(previousTabIds: Array<string>): void {
    if (this.selectedGraph === null || this.graphs === null) {
      return;
    }
    this.unavailableGraph = this.selectedGraph;
    this.#collapseSuppressedGraphId = this.selectedGraph.id;
    // An empty reload lands here too: a lone unavailable tab over the notice beats a bar with
    // nothing in it over a blank panel, which is what the partner would otherwise be left with.
    //
    const previousIndex: number = previousTabIds.indexOf(this.selectedGraph.id);
    const insertAt: number = previousIndex < 0 ? this.graphs.length : Math.min(previousIndex, this.graphs.length);
    this.graphs = [...this.graphs.slice(0, insertAt), this.selectedGraph, ...this.graphs.slice(insertAt)];
  }

  #loadGraph(planIds: Array<number>, currency: string): Observable<void> {
    /**
     * The Real Time tab paints no Metabase iframe, so refetching the graphs would only tear the tab bar
     * down — `loadingGraphs` hides it — and remount the frame for a second Tinybird snapshot. The graphs
     * in memory stay valid because the persisted selection never collapsed (PRD-4516 §3.3.3), and they
     * are refetched on the way out only if the selection changed while inside.
     */
    const activeRealTimeDescriptor: RealTimeTabDescriptor | null = realTimeTabDescriptorForGraph(this.#renderableSelectedGraph);
    if (activeRealTimeDescriptor !== null) {
      this.selectedPlanIds = planIds;
      this.selectedCurrency = currency;
      this.#graphsAreStaleForSelection = true;
      this.#updateRealTimeEmbeddedSelection(planIds, currency, activeRealTimeDescriptor.slug);
      // With no plan the tab paints its empty state and no report loads, so there is nothing to report —
      // the same reason the Metabase branch below returns before reaching any tracking.
      if (planIds.length > 0) {
        this.#trackReportLoad(activeRealTimeDescriptor.reportName, planIds, currency);
      }
      this.#changeDetectorRef.markForCheck();
      return EMPTY;
    }

    if (planIds.length === 0) {
      this.graphs = null;
      this.loadingGraphs = false;
      this.#changeDetectorRef.markForCheck();
      return EMPTY;
    }

    const requestCount = ++this.#graphRequestCount;
    this.loadingGraphs = true;
    this.selectedPlanIds = planIds;
    this.selectedCurrency = currency;
    this.#changeDetectorRef.markForCheck();

    // `defer` so a synchronous throw from the service (it needs a partner) lands inside the stream and
    // is caught here, instead of escaping `#loadGraph`.
    const realTimeDashboardIdBySlug$: Observable<Map<RealTimeDashboardSlugET, string>> = forkJoin(
      REAL_TIME_TAB_DESCRIPTORS.map(({ slug }) =>
        defer(() => this.#realTimeDashboardService.getDashboard(slug)).pipe(
          timeout(REAL_TIME_CATALOG_TIMEOUT_MS),
          map((dashboard): [RealTimeDashboardSlugET, string] | null => (dashboard.id ? [slug, dashboard.id] : null)),
          catchError(() => of(null)),
        ),
      ),
    ).pipe(map(entries => new Map(entries.filter((entry): entry is [RealTimeDashboardSlugET, string] => entry !== null))));

    return forkJoin({
      graphs: this.#graphService.searchOrganizationGraph({
        currency,
        groupName: GraphGroup.analytics360,
        planIds,
      }),
      realTimeDashboardIdBySlug: realTimeDashboardIdBySlug$,
    }).pipe(
      catchError(() => EMPTY),
      finalize(() => {
        if (requestCount === this.#graphRequestCount) {
          this.loadingGraphs = false;
          this.#changeDetectorRef.markForCheck();
        }
      }),
      tap(({ graphs, realTimeDashboardIdBySlug }) => {
        this.realTimeDashboardIdBySlug = realTimeDashboardIdBySlug;
        // Read before the reassignment below: the fallback needs the order the tab bar had, not the new one.
        const previousTabIds: Array<string> = this.graphs?.map(graph => graph.id) ?? [];
        this.graphs = replaceRealTimeGrantsWithTabs(graphs, new Set(realTimeDashboardIdBySlug.keys()));
        if (!this.#realTimeEmbedPrepared && this.graphs.some(graph => isRealTimeTabGraph(graph))) {
          this.#realTimeEmbedPrepared = true;
          this.#embeddedAuthCookieService.saveToken();
          setupRealTimeInsightsPortalDnsPrefetch(this.#realTimeEmbeddedMessagingService.portalOrigin, this.#destroyRef);
        }
        /**
         * The default tab is the arrival destination, so it must not be one that collapses the
         * selection: landing on one would narrow the plans the partner arrived with before anything is
         * painted, and cost a second round-trip to do it.
         *
         * And a graph that survived the previous response may be gone from this one — the collapse
         * refetches with fewer plans, and the catalogue is plan-restricted server-side. Falling back
         * keeps the panel coherent instead of leaving `selectedGraph` pointing at a tab that no longer
         * exists, which renders nothing and leaves the collapse notice up.
         */
        const defaultGraph: Graph | undefined = this.graphs.find(graph => !isSinglePlanDashboardGraph(graph)) ?? this.graphs[0];
        // No fallback on the miss: from here on a graph that is gone gets the notice below rather than a
        // silent switch to another report. The default only picks the arrival tab.
        const selectedGraph: Graph | undefined =
          this.selectedGraph === null ? defaultGraph : this.graphs.find(graph => graph.id == this.selectedGraph?.id);
        if (selectedGraph !== undefined) {
          this.unavailableGraph = null;
          this.updateSelectedTab(selectedGraph, planIds, currency);
        } else if (this.selectedGraph !== null && !isRealTimeTabGraph(this.selectedGraph)) {
          this.#keepSelectedGraphAsUnavailable(previousTabIds);
        } else {
          /**
           * The Real Time sentinel is not a catalog graph, so its absence says nothing about the
           * selection: it is gone because the dashboard-id lookup returned nothing, and a transient
           * error is enough. Calling that "not available for the current selection" would be false,
           * and it would put the tab on the bar stripped of its own empty and error handling.
           */
          this.unavailableGraph = null;
          this.selectedGraph = this.graphs[0] ?? null;
          if (this.selectedGraph !== null) {
            this.updateSelectedTab(this.selectedGraph, planIds, currency);
          }
        }
        this.#changeDetectorRef.markForCheck();
      }),
      map((): undefined => undefined),
    );
  }

  /**
   * The selected graph only while it is one the reload actually returned. An unavailable tab stays
   * selected so the notice has something to point at, but nothing it would otherwise switch on —
   * the single-plan narrowing, the pinned currency, the Real Time branch — may act on it: there is
   * no report on screen for any of that to be true of, and leaving the narrowing in force would
   * trap the partner on the very selection the notice is asking them to widen.
   */
  get #renderableSelectedGraph(): Graph | null {
    return this.unavailableGraph === null ? this.selectedGraph : null;
  }

  /**
   * Written only while the Real Time tab is the one painting. The selection cookie lives on
   * `.feverup.com`, so it is global browser state: writing it on every filter change would clobber
   * a `/reports/real-time/big-launches` open in another window (PRD-4516 §3.7).
   */
  #saveRealTimeFiltersInCookie(): void {
    if (this.realTimeEmbeddedSelection === null) {
      return;
    }

    this.#realTimeFiltersCookieService.saveSelection(this.realTimeEmbeddedSelection);
  }

  #trackReportLoad(reportName: string, planIds: Array<number>, currency: string): void {
    this.#trackingService.track(
      new Load360ReportEvent({
        currency,
        plan_ids: planIds,
        report_name: reportName,
        time: new Date().toISOString(),
      }),
    );
  }

  /**
   * The cookie has to exist before the `src` does, because the portal reads it in a server resolver for
   * the first paint. Assigning it here — inside a click handler or a filter emission, both of which run
   * before Angular renders the frame — makes that ordering true by construction.
   *
   * It is **capped here**, at the one boundary where the embed selection is built, rather than at each
   * caller.
   */
  #updateRealTimeEmbeddedSelection(selectedPlanIds: Array<number>, currency: string | null, slug: RealTimeDashboardSlugET): void {
    const partnerId = this.#partnerService.getPartner()?.id ?? null;

    /**
     * Through the same funnel as the Real Time pages, which caps and deduplicates it (PRD-4640). The
     * selection itself is untouched: neither tab collapses anything, the bar keeps every plan for the
     * other four tabs, and `realTimeNotice` says how many of them this one is showing.
     *
     * `?? ''` is not defensive noise. `ThreeSixtySelection.currency` is optional and the filters emit
     * `null` while no currency option is resolved, which `#loadGraph` then casts away with `as string`.
     * The portal's cookie guard requires `typeof currency === 'string'`: a non-string marks the selection
     * **invalid** and sends the iframe to `/error/unavailable`, whereas `''` passes (PRD-4516 §3.10).
     */
    const selection = toRealTimeEmbeddedSelection(
      { currency: currency ?? '', planIds: selectedPlanIds },
      partnerId,
      maxPlanIdsForDashboard(slug),
    );

    this.realTimeEmbeddedSelection = selection === null || selection.planIds.length === 0 ? null : selection;
    this.#saveRealTimeFiltersInCookie();
  }
}

import { Injectable } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';

import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import { BehaviorSubject, combineLatest, EMPTY, merge, Observable, of, ReplaySubject, throwError } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, mergeMap, scan, switchMap } from 'rxjs/operators';

import { SelectedPlanContext } from '../__data__/selected-plan-context.model';
import { OrganizationTypeEnum } from '../../models/partner/organization-type.enum';
import { isInventoryAvailableForPlanKind } from '../../models/plan/is-inventory-available-for-plan-kind.util';
import { PLAN_KIND_PERMISSIONS } from '../../models/plan/plan-kind-permissions.config';
import { PlanKind } from '../../models/plan/plan-kind.enum';
import { OptimizelyService } from '../../optimizely/optimizely.service';
import { isMultiIdParam, parseSingleIdParam } from '../../utils/single-id-query-param.util';
import { PartnerService } from '../partner/partner.service';
import { PlanService } from '../plan/plan.service';
import { UserService } from '../user/user.service';

interface SelectedPlanContextChange {
  context: SelectedPlanContext;
  hasInferredCity: boolean;
  keepPreviousContext?: boolean;
  mergeWithPrevious?: boolean;
}

const INITIAL_CONTEXT_CHANGE: SelectedPlanContextChange = { context: {}, hasInferredCity: false };

@Injectable({
  providedIn: 'root',
})
export class SelectedPlanContextService {
  #planKind$ = new BehaviorSubject<{ kind: PlanKind | null; planId: number | undefined }>({ kind: null, planId: undefined });
  #route: ActivatedRoute;
  #router: Router;
  #userService: UserService;

  private storedPlanContext = new BehaviorSubject<SelectedPlanContextChange>({ ...INITIAL_CONTEXT_CHANGE });
  private updatedPlanContext = new ReplaySubject<SelectedPlanContextChange>(1);

  private queryParamsObservable: Observable<SelectedPlanContext>;
  private queryParamsWithoutVenueObservable: Observable<SelectedPlanContext>;
  private queryParamsWithoutPlanObservable: Observable<SelectedPlanContext>;
  private queryParamsNoMandatoryCityNoVenueObservable: Observable<SelectedPlanContext>;

  private readonly notMandatoryCityNoVenueFilterUrls = [/\/plans(?!\/dashboard).*/];

  private readonly notHavingVenueFilterUrls = ['/plan/detail', '/channels-settings'];

  private readonly notHavingPlanFilterUrls = ['/box-office/shifts-list', '/box-office/settings'];

  /**
   * Routes where URL updates may omit city/plan/venue (e.g. only channelId) without intending to clear sidebar context.
   */
  private readonly partialQueryParamsMergeUrls = ['/reservations/create-on-behalf'];

  private readonly sharingQueryParamsUrls = [
    /\/plans(?!\/dashboard).*/,
    '/plans/dashboard',
    '/attendees',
    '/invitations',
    '/plan/detail',
    '/capacity',
    '/sessions',
    '/reviews',
    '/order-list',
    '/orders-bulk-reschedule',
    '/bulk-partial-refunds',
    '/codes',
    '/reservations/list',
    '/reservations/user-list',
    '/reservations/create',
    '/reservations/create-on-behalf',
    '/reservations/deposit-settings',
    '/channels-settings',
    '/settings/tasks',
    '/event-settings',
    '/inventory',
    /\/box-office(?!\/sales-summary).+/,
  ];

  constructor(
    private planService: PlanService,
    private partnerService: PartnerService,
    private optimizelyService: OptimizelyService,
    userService: UserService,
    route: ActivatedRoute,
    router: Router,
  ) {
    this.#route = route;
    this.#router = router;
    this.#userService = userService;
    this.getContextChanges(route, router).subscribe(selectedPlan => {
      this.storedPlanContext.next(selectedPlan);

      const planId: number | undefined = selectedPlan?.context?.planId;
      if (planId !== undefined) {
        this.optimizelyService.setPlanId(planId.toString());
      }
      this.optimizelyService.setPlanData.next();
    });

    this.#autoPlanKindResolution();

    this.queryParamsObservable = this.storedPlanContext.pipe(map(({ context }) => context));

    this.queryParamsWithoutVenueObservable = this.storedPlanContext.pipe(map(({ context: { cityId, planId } }) => ({ cityId, planId })));

    this.queryParamsWithoutPlanObservable = this.storedPlanContext.pipe(map(({ context: { cityId, venueId } }) => ({ cityId, venueId })));

    this.queryParamsNoMandatoryCityNoVenueObservable = this.storedPlanContext.pipe(
      map(({ context: { cityId, planId, venueId }, hasInferredCity }) => (hasInferredCity ? { planId } : { cityId, planId, venueId })),
    );
  }

  canManageSelectedPlan(): boolean {
    return this.#hasPermissionForPlanKind(this.#planKind$.value.kind, 'edit');
  }

  clearPlanKind(): void {
    this.#planKind$.next({ kind: null, planId: undefined });
  }

  get currentContext(): SelectedPlanContext {
    return this.storedPlanContext.value.context;
  }

  getQueryParamsFor(url: string): Observable<SelectedPlanContext> {
    const mappings: Array<[Array<string | RegExp>, Observable<SelectedPlanContext>]> = [
      [this.notMandatoryCityNoVenueFilterUrls, this.queryParamsNoMandatoryCityNoVenueObservable],
      [this.notHavingVenueFilterUrls, this.queryParamsWithoutVenueObservable],
      [this.notHavingPlanFilterUrls, this.queryParamsWithoutPlanObservable],
    ];
    const found = mappings.find(([routes]) => this.isInOneOfThisRoutes(url, routes));
    return found ? found[1] : this.queryParamsObservable;
  }

  observeCanManageSelectedPlan(): Observable<boolean> {
    return this.#observeHasPermissionForPlanKind('edit');
  }

  observeCanViewSelectedPlan(): Observable<boolean> {
    return this.#observeHasPermissionForPlanKind('view');
  }

  observeContextChanges(): Observable<SelectedPlanContext> {
    return this.storedPlanContext.pipe(map(({ context }) => context));
  }

  observeIsInventoryAvailableForSelectedPlan(): Observable<boolean> {
    return this.#planKind$.pipe(
      map(({ kind }) => isInventoryAvailableForPlanKind(kind)),
      distinctUntilChanged(),
    );
  }

  setPlanKind(planId: number, kind: PlanKind | null): void {
    this.#planKind$.next({ kind, planId });
  }

  updatePlanContext(planId: number, cityId?: number, channelId?: string, venueId?: number): void {
    if (cityId) {
      this.updatedPlanContext.next({
        context: { channelId, cityId, planId, venueId },
        hasInferredCity: false,
      });
      return;
    }

    this.getPlanInferredCityContext(planId, channelId).subscribe(context => {
      this.updatedPlanContext.next({
        context,
        hasInferredCity: true,
      });
    });
  }

  #autoPlanKindResolution(): void {
    this.#route.queryParams
      .pipe(
        filter(() => !this.#router.url.includes('/kiosk/')),
        map(params => {
          // Plural too, since the dashboard links now carry `planIds`: reading only the singular form
          // cleared the kind on every dashboard navigation and left the menu gating unrestricted.
          const planId: number | undefined = parseSingleIdParam(params['planId']) ?? parseSingleIdParam(params['planIds']);
          const channelId: string | undefined = params['channelId'] ?? undefined;
          return planId === undefined ? undefined : { channelId, planId };
        }),
        distinctUntilChanged((prev, curr) => prev?.planId === curr?.planId && prev?.channelId === curr?.channelId),
        switchMap(result => {
          if (result === undefined) {
            this.clearPlanKind();
            return EMPTY;
          }
          const partner = this.partnerService.getPartner();
          if (!partner) {
            return EMPTY;
          }
          const getPlan$ =
            partner.type === OrganizationTypeEnum.RESELLER
              ? this.planService.getResellerPlan(partner.id, result.planId, result.channelId)
              : this.planService.getPlan(partner.id, result.planId);
          return getPlan$.pipe(
            map(response => ({ kind: (response.data?.kind ?? null) as PlanKind | null, planId: result.planId })),
            catchError(() => of({ kind: null as PlanKind | null, planId: result.planId })),
          );
        }),
      )
      .subscribe(({ kind, planId }) => {
        this.setPlanKind(planId, kind);
      });
  }

  #hasPermissionForPlanKind(kind: PlanKind | null, permission: 'edit' | 'view'): boolean {
    if (!kind) {
      return true;
    }
    const requiredPermission = permission === 'edit' ? PLAN_KIND_PERMISSIONS[kind]?.edit : PLAN_KIND_PERMISSIONS[kind]?.view;
    return (
      !requiredPermission ||
      this.#userService.hasPermission(requiredPermission) ||
      this.#userService.hasPermission('can_manage_plan_reviews')
    );
  }

  #mergePlanContext(previous: SelectedPlanContext, incoming: SelectedPlanContext): SelectedPlanContext {
    return {
      ...previous,
      ...(incoming.cityId !== undefined ? { cityId: incoming.cityId } : {}),
      ...(incoming.planId !== undefined ? { planId: incoming.planId } : {}),
      ...(incoming.venueId !== undefined ? { venueId: incoming.venueId } : {}),
    };
  }

  #namesSeveralEventsOrCities(params: Params): boolean {
    return isMultiIdParam(params['planIds']) || isMultiIdParam(params['cityIds']);
  }

  #observeHasPermissionForPlanKind(permission: 'edit' | 'view'): Observable<boolean> {
    return combineLatest([this.#planKind$, this.#userService.permissions$]).pipe(
      map(([{ kind }]) => this.#hasPermissionForPlanKind(kind, permission)),
      distinctUntilChanged(),
    );
  }

  #parsePlanContextFromQueryParams(params: Params): SelectedPlanContext {
    const context: SelectedPlanContext = {};

    // The dashboard links carry the plural params the 360 filters read, so the singular form alone
    // would stop tracking the selected event and take the menu's prefills with it.
    const cityId = parseSingleIdParam(params['cityId']) ?? parseSingleIdParam(params['cityIds']);
    if (cityId !== undefined) {
      context.cityId = cityId;
    }

    const planId = parseSingleIdParam(params['planId']) ?? parseSingleIdParam(params['planIds']);
    if (planId !== undefined) {
      context.planId = planId;
    }

    const venueId = parseSingleIdParam(params['venueId']);
    if (venueId !== undefined) {
      context.venueId = venueId;
    }

    return context;
  }

  private getContextChanges(route: ActivatedRoute, router: Router): Observable<SelectedPlanContextChange> {
    return merge(this.getRouterPlanContextChanges(route, router), this.updatedPlanContext).pipe(
      scan(
        (previousChange, { context: incoming, hasInferredCity, keepPreviousContext = false, mergeWithPrevious = false }) => {
          const { context: previous } = previousChange;

          /**
           * Returned whole, `hasInferredCity` included: the change is being ignored, and reporting a
           * city as no longer inferred would rewrite the `/plans` links the flag exists to shorten.
           */
          if (keepPreviousContext) {
            return previousChange;
          }

          let context = mergeWithPrevious ? this.#mergePlanContext(previous, incoming) : incoming;
          const noVenueFilterUrl = [...this.notHavingVenueFilterUrls, ...this.notMandatoryCityNoVenueFilterUrls];

          const shouldKeepPreviousPlans =
            this.isInOneOfThisRoutes(router.url, this.notHavingPlanFilterUrls) &&
            previous.cityId === context.cityId &&
            previous.venueId === context.venueId;

          if (shouldKeepPreviousPlans) {
            context = { ...context, planId: previous.planId };
          }

          const shouldKeepPreviousVenue =
            this.isInOneOfThisRoutes(router.url, noVenueFilterUrl) &&
            previous.cityId === context.cityId &&
            previous.planId === context.planId;

          if (shouldKeepPreviousVenue) {
            context = { ...context, venueId: previous.venueId };
          }

          return {
            context,
            hasInferredCity,
          };
        },
        { ...INITIAL_CONTEXT_CHANGE },
      ),
    );
  }

  private getPlanInferredCityContext(planId: number, channelId?: string): Observable<SelectedPlanContext> {
    const partner: Partner | null = this.partnerService.getPartner();
    if (partner === null) {
      throw new Error('Partner not found');
    }

    const getPlan$ =
      partner.type === OrganizationTypeEnum.RESELLER
        ? this.planService.getResellerPlan(partner.id, planId, channelId)
        : this.planService.getPlan(partner.id, planId);

    return getPlan$.pipe(
      map(response => response.data),
      mergeMap((plan: Plan | null) => {
        if (plan === null) {
          return throwError(() => new Error('Plan not found'));
        }
        const { firstPlace, id, places } = plan;
        const city = places?.find(place => place.city?.name === firstPlace?.cityName)?.city;
        if (!city) {
          return throwError(() => new Error('City not found'));
        }
        return of({
          cityId: city.id,
          planId: id,
        });
      }),
      catchError(() => EMPTY),
    );
  }

  private getRouterPlanContextChanges(route: ActivatedRoute, router: Router): Observable<SelectedPlanContextChange> {
    return route.queryParams.pipe(
      filter(() => this.isInOneOfThisRoutes(router.url, this.sharingQueryParamsUrls)),
      map((params: Params) => ({
        context: this.#parsePlanContextFromQueryParams(params),
        hasInferredCity: false,
        keepPreviousContext: this.#namesSeveralEventsOrCities(params),
        mergeWithPrevious: this.isInOneOfThisRoutes(router.url, this.partialQueryParamsMergeUrls),
      })),
    );
  }

  private isInOneOfThisRoutes(url: string, routes: Array<string | RegExp>): boolean {
    return routes.some(route => (route instanceof RegExp ? route.test(url) : url.includes(route)));
  }
}

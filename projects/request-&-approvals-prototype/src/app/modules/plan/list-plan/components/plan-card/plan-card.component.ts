import { ChangeDetectorRef, Component, DestroyRef, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationExtras, Params } from '@angular/router';

import { AmbassadorTrackingLinkService } from '@fz-original/app/ambassadors/services/ambassador-tracking-link.service';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { B2CSiteConfiguration } from '@fz-original/app/modules/resellers/models/b2c-site-configuration.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { PlanStatus } from '@fz-original/app/shared/models/plan/plan-status.enum';
import { B2cSiteService } from '@fz-original/app/shared/services/b2c-site/b2c-site.service';
import { PlanService } from '@fz-original/app/shared/services/plan/plan.service';
import { ToastService, ToastType } from '@fz-original/app/shared/services/toast/toast.service';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { IgntDialogService } from '@ignite/common';
import { IgntIconName, IgntIconVariant } from '@ignite/icon';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { EMPTY, Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, switchMap, take } from 'rxjs/operators';

import { ClickShareB2CSiteEvent } from '../../../../../core/tracking/core/events/click-share-b2c-site';
import { TagType } from '../../../../../shared/components/tag/model/tag-type';
import { OrganizationTypeEnum } from '../../../../../shared/models/partner/organization-type.enum';
import { Partner } from '../../../../../shared/models/partner/partner.model';
import { PlanReviewRequestStatus } from '../../../../../shared/models/plan-review/plan-review-request.model';
import { DASHBOARD_PLAN_STATUSES } from '../../../../../shared/models/plan/dashboard-plan-statuses.constant';
import { LEGACY_ONLY_DASHBOARD_PLAN_KINDS } from '../../../../../shared/models/plan/legacy-only-dashboard-plan-kinds.constant';
import { PlanKind } from '../../../../../shared/models/plan/plan-kind.enum';
import { Plan, PlanLiveStatusAndAnalytics } from '../../../../../shared/models/plan/plan.model';
import { ScreenSize } from '../../../../../shared/models/screen-size';
import { FeatureFlags } from '../../../../../shared/optimizely/feature-flags';
import { OptimizelyService } from '../../../../../shared/optimizely/optimizely.service';
import { PartnerService } from '../../../../../shared/services/partner/partner.service';
import { isDraftOrNeverPublished } from '../../../../../shared/utils/is-draft-or-never-published.util';
import { DuplicatePlanOrchestratorService } from '../../../services/duplicate-plan-orchestrator.service';
import { DuplicatePlanSuccess } from '../../../services/duplicate-plan-result.model';
import { DuplicatePlanNavigationContext } from '../../models/duplicate-plan-navigation-context.model';
import { PlanAction } from '../../models/plan-action.model';
import { PlanNavigateToSection } from '../../models/plan-navigate-to-section.model';
import {
  DuplicatePlanConfirmDialogComponent,
  DuplicatePlanConfirmDialogData,
} from '../duplicate-plan-confirm-dialog/duplicate-plan-confirm-dialog.component';
import { ShareModalComponent } from '../share-modal/share-modal.component';

interface ActionOption {
  label: string;
  icon: { name: IgntIconName; variant: IgntIconVariant };
  dataTestId: string;
  action: () => void;
  permission?: string;
  optimizely?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-plan-card',
  standalone: false,
  templateUrl: './plan-card.component.html',
  styleUrls: ['./plan-card.component.scss'],
})
export class PlanCardComponent implements OnChanges {
  static readonly too_may_request_code = 429;
  #ambassadorTrackingLinkService = inject(AmbassadorTrackingLinkService);
  #b2cSiteService = inject(B2cSiteService);
  #cdr = inject(ChangeDetectorRef);
  #destroyRef = inject(DestroyRef);
  #dialogService = inject(IgntDialogService);
  #duplicatePlanOrchestratorService = inject(DuplicatePlanOrchestratorService);
  #modalService = inject(NgbModal);
  #optimizelyService = inject(OptimizelyService);
  #partner: Partner | null = null;
  #partnerService = inject(PartnerService);
  #planService = inject(PlanService);
  #toastService = inject(ToastService);
  #trackingService = inject(TrackingService);
  #translate = inject(TranslateService);
  #userService = inject(UserService);
  readonly planStatus = PlanStatus;
  readonly desktopScreenSize = ScreenSize.DESKTOP;
  readonly mobileScreenSize = ScreenSize.MOBILE;
  readonly planKindEnum = PlanKind;
  readonly tabletScreenSize = ScreenSize.TABLET;
  readonly visibilityTagType = TagType.VISIBILITY;
  @Input() allowRefreshAction = false;
  @Input() channelId?: string;
  @Input() displayRefreshButton = true;
  @Input() plan: Plan | null = null;
  @Input() screenSize: ScreenSize = ScreenSize.DESKTOP;
  @Output() duplicateSucceeded = new EventEmitter<DuplicatePlanNavigationContext>();
  @Output() navigate = new EventEmitter<PlanAction>();
  @Output() updatedPlan = new EventEmitter<Plan>();
  canManagePlanReviews = false;
  draftOptions: ActionOption[] = [];
  duplicateOptions: ActionOption[] = [];
  firstPlaceName = '';
  isDuplicateInProgress = false;
  isRefreshingInProgress = false;
  isReseller = false;
  isSingleDateEvent = false;
  isTrackingLinkCopied = false;
  locale = '';
  publishedOptions: ActionOption[] = [];
  refreshOptions: ActionOption[] = [];
  reviewStatusLabelKey: string | null = null;
  trackingLink = '';

  constructor() {
    this.#partner = this.#partnerService.getPartner();
    this.locale = this.#translate.currentLang;
    this.isReseller = this.#partner?.type === OrganizationTypeEnum.RESELLER;
    this.canManagePlanReviews = this.#userService.hasPermission(Permissions.CAN_MANAGE_PLAN_REVIEWS);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes?.plan?.currentValue) return;
    this.onPlanUpdate();
  }

  private onPlanUpdate() {
    if (!this.plan) {
      return;
    }
    const planPlaces = this.plan.places ?? [];
    let [firstPlace] = planPlaces;
    firstPlace = planPlaces.find(place => this.plan?.firstPlace?.addressName === place.address) ?? firstPlace;
    this.firstPlaceName = firstPlace?.name;

    const startDate = this.plan.firstSessionDate ? new Date(this.plan.firstSessionDate).setHours(0, 0, 0, 0) : null;
    const endDate = this.plan.lastSessionDate ? new Date(this.plan.lastSessionDate).setHours(0, 0, 0, 0) : null;
    this.isSingleDateEvent = startDate === endDate;
    this.reviewStatusLabelKey = this.#resolveReviewStatusLabelKey();
    this.loadActions();
  }

  #resolveReviewStatusLabelKey(): string | null {
    if (!this.plan?.isDraft() || !this.plan.latestReview) {
      return null;
    }
    const status: PlanReviewRequestStatus = this.plan.latestReview.status;
    const isInReviewForNonReviewer = !this.canManagePlanReviews && (status === 'submitted' || status === 'claimed');
    return `listPlan.reviewStatus.${isInReviewForNonReviewer ? 'inReview' : status}`;
  }

  private loadActions(): void {
    if (!this.plan?.places?.length) return;
    const queryParams: NavigationExtras = {
      queryParams: { cityId: this.plan.places[0].city?.id, planId: this.plan.id },
    };

    const capacityOption: ActionOption = this.getCapacityOption(queryParams);

    if (this.isReseller) {
      this.publishedOptions = [
        {
          label: 'listPlan.viewFever',
          icon: { name: 'eye', variant: 'light' },
          dataTestId: 'plan-card-view-fever-button',
          permission: 'can_view_affiliate_dashboard',
          action: () => this.navigateTo('dropdown', PlanNavigateToSection.feverPage),
        },
        {
          label: 'listPlan.eventSales',
          icon: { name: 'chart-area', variant: 'light' },
          dataTestId: 'plan-card-event-sales-button',
          permission: 'can_view_affiliate_dashboard',
          action: () => this.goToDetail('dropdown'),
        },
      ];
    } else if (!this.isReseller) {
      this.publishedOptions = [
        {
          label: 'listPlan.eventSales',
          icon: { name: 'chart-area', variant: 'light' },
          dataTestId: 'plan-card-event-sales-button',
          permission: Permissions.CAN_VIEW_DASHBOARD,
          action: () => this.goToDetail('dropdown'),
        },
        {
          label: 'menu.attendeesList',
          icon: { name: 'users', variant: 'regular' },
          dataTestId: 'plan-card-attendees-button',
          permission: 'can_view_attendees',
          action: () => this.navigateTo('dropdown', PlanNavigateToSection.attendeesList, ['/attendees'], queryParams),
        },
        {
          label: 'menu.contentPlan',
          icon: { name: 'pen', variant: 'solid' },
          dataTestId: 'plan-card-content-button',
          permission: 'can_view_content',
          action: () => this.navigateTo('dropdown', PlanNavigateToSection.contentPlan, ['/plan/detail'], queryParams),
        },
        capacityOption,
        {
          label: 'menu.reviews',
          icon: { name: 'star', variant: 'light' },
          dataTestId: 'plan-card-reviews-button',
          permission: 'can_view_reviews',
          action: () => this.navigateTo('dropdown', PlanNavigateToSection.reviews, ['/reviews'], queryParams),
        },
        {
          label: 'listPlan.viewFever',
          icon: { name: 'eye', variant: 'light' },
          dataTestId: 'plan-card-view-fever-button',
          permission: 'can_view_plans',
          action: () => this.navigateTo('dropdown', PlanNavigateToSection.feverPage),
        },
      ];

      this.publishedOptions.splice(2, 0, {
        label: 'menu.seatingManagement',
        icon: { name: 'chair', variant: 'light' },
        dataTestId: 'plan-card-seating-management-button',
        permission: 'can_view_seating_management',
        action: () => this.navigateTo('dropdown', PlanNavigateToSection.seatingManagement, ['/sessions/tickets-per-timeslot'], queryParams),
      });

      this.draftOptions = [
        {
          label: 'menu.contentPlan',
          icon: { name: 'pen', variant: 'solid' },
          dataTestId: 'plan-card-content-button',
          permission: 'can_view_content',
          action: () => this.navigateTo('dropdown', PlanNavigateToSection.contentPlan, ['/plan/detail'], queryParams),
        },
        capacityOption,
      ];

      this.refreshOptions = this.getRefreshOption();
      this.duplicateOptions = this.#getDuplicateOption();
    }
  }

  getMenuOptions(plan: Plan): ActionOption[] {
    return [
      ...(plan.isOnSale() || plan.isOffSale() ? this.publishedOptions : []),
      ...(plan.isDraft() ? this.draftOptions : []),
      ...this.refreshOptions,
      ...this.duplicateOptions,
    ];
  }

  getPlanKindTranslationKey(kind: string): string {
    const kindCamelCase = kind.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    return `listPlan.${kindCamelCase}`;
  }

  goToDetail(source: string): void {
    const selection = window.getSelection();
    if (selection != null && selection.toString().length === 0) {
      if (this.isReseller) {
        this.navigateTo(source, PlanNavigateToSection.eventSales, ['/my-plans/dashboard', this.plan?.id, 'channel', this.channelId]);
        return;
      }
      this.navigateTo(source, PlanNavigateToSection.eventSales, ['/plans/dashboard'], { queryParams: this.#dashboardQueryParams() });
    }
  }

  // Users with reports access get the new dashboard, whose filters read the plural params;
  // they fall back to the last stored selection when planIds or cityIds are missing, so
  // only send them when both are known. Everyone else keeps the legacy singular params, and
  // so do the plan kinds the new dashboard cannot render and the drafts and never published
  // events `canMatchDashboardPlanKindGuard` resolves to the legacy one.
  #dashboardQueryParams(): Params {
    const cityId = this.plan?.places?.[0]?.city?.id;
    const isLegacyOnlyKind = this.plan?.kind !== undefined && LEGACY_ONLY_DASHBOARD_PLAN_KINDS.has(this.plan.kind);
    const rendersOnNewDashboard = !isLegacyOnlyKind && !isDraftOrNeverPublished(this.plan);
    if (this.#userService.hasPermission('can_view_reports') && this.plan?.id && cityId && rendersOnNewDashboard) {
      return {
        cityIds: `${cityId}`,
        planIds: `${this.plan.id}`,
        // `Plan.status` is optional. Sending nothing lets the 360 fall back to its `on_sale` default,
        // which filters a draft or off-sale event out of the picker before it can be selected and lands
        // the card on the empty state. The sidebar and `legacyDashboardParamsGuard` always name all
        // three; naming them here too is what keeps the three entry points agreeing.
        statuses: this.plan.status && this.plan.status !== PlanStatus.ALL ? this.plan.status : DASHBOARD_PLAN_STATUSES,
      };
    }
    return {
      ...(this.plan?.id && { planId: this.plan.id }),
      ...(cityId && { cityId }),
    };
  }

  private navigateTo(source: string, navigateTo: PlanNavigateToSection, commands?: any[], extras?: NavigationExtras): void {
    if (!this.plan) {
      return;
    }
    if (this.isReseller) {
      this.navigate.emit({ plan: this.plan, trackingLink: this.trackingLink, source, commands, extras, navigateTo });
      return;
    }
    this.navigate.emit({ plan: this.plan, source, commands, extras, navigateTo });
  }

  shareModal(event: Event): void {
    event.stopPropagation();
    this.#getTrackingLink().then(trackingLink => {
      if (!trackingLink) {
        return;
      }
      const modal = this.#modalService.open(ShareModalComponent);
      const component: ShareModalComponent = modal.componentInstance;
      component.link = () => trackingLink;
      component.message = `${this.#translate.instant('listPlan.trackingLink.shareModal.message')} ${this.plan?.name ?? ''}`;
      this.trackClickShareB2CSiteEvent();
    });
  }
  private getCapacityOption(queryParams: NavigationExtras): ActionOption {
    return {
      label: 'menu.sessions',
      icon: { name: 'sort-alt', variant: 'solid' },
      dataTestId: 'plan-card-capacity-button',
      permission: 'can_view_capacity',
      action: () => this.navigateTo('dropdown', PlanNavigateToSection.capacity, ['/sessions'], queryParams),
    };
  }

  copyToClipboard(event: Event): void {
    event.stopPropagation();
    this.#getTrackingLink().then(trackingLink => {
      if (trackingLink) {
        this.trackingLink = trackingLink;
        this.trackClickShareB2CSiteEvent();
        this.isTrackingLinkCopied = true;
      }
    });
    setTimeout(() => {
      this.isTrackingLinkCopied = false;
    }, 3000);
  }

  private trackClickShareB2CSiteEvent(): void {
    if (!this.plan?.id) {
      return;
    }
    this.#trackingService.track(
      new ClickShareB2CSiteEvent({
        site_link: this.trackingLink,
        plan_id: this.plan.id,
      }),
    );
  }

  #canShowDuplicatePlanAction(): boolean {
    if (this.#userService.hasPermission(Permissions.CAN_CREATE_PLANS)) {
      return true;
    }
    return (
      this.#userService.hasPermission(Permissions.CAN_DUPLICATE_EVENT) &&
      this.#optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.DUPLICATE_EVENT_MODAL,
        team: 'b2b-platform',
      }) === true
    );
  }

  #getDuplicateOption(): ActionOption[] {
    if (!this.#canShowDuplicatePlanAction()) {
      return [];
    }
    return [
      {
        label: 'planRequest.duplicate',
        icon: { name: 'copy', variant: 'light' },
        dataTestId: 'plan-card-duplicate-button',
        action: () => {
          // Delay to allow the dropdown to close before opening the confirmation modal
          setTimeout(() => {
            this.#openDuplicateConfirmModal();
          });
        },
      },
    ];
  }

  #openDuplicateConfirmModal(): void {
    if (!this.plan) {
      return;
    }
    const planName: string | undefined = this.plan.name;
    if (planName === undefined) {
      return;
    }
    const dialogRef = this.#dialogService.openModal<boolean, DuplicatePlanConfirmDialogData>(DuplicatePlanConfirmDialogComponent, {
      data: {
        title: this.#translate.instant('listPlan.duplicateEvent.confirmTitle'),
        question: this.#translate.instant('listPlan.duplicateEvent.confirmMessage', { planName }),
        acceptButtonLabel: this.#translate.instant('listPlan.duplicateEvent.confirmAccept'),
        cancelButtonLabel: this.#translate.instant('common.cancel'),
      },
      size: 'sm',
    });

    dialogRef.closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe((accepted: boolean | undefined) => {
      if (accepted === true) {
        this.#duplicateAndEmit();
      }
    });
  }

  #duplicateAndEmit(): void {
    if (!this.plan) {
      return;
    }
    const planId: number | undefined = this.plan.id;
    const planName: string | undefined = this.plan.name;
    if (planId === undefined || planName === undefined) {
      return;
    }
    this.isDuplicateInProgress = true;
    this.#cdr.markForCheck();

    this.#duplicatePlanOrchestratorService
      .executeDuplicate({ planId, planName, source: 'plan_card' })
      .pipe(
        finalize(() => {
          this.isDuplicateInProgress = false;
          this.#cdr.markForCheck();
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (result: DuplicatePlanSuccess) => {
          this.#toastService.add({
            autoHide: true,
            delay: 5000,
            message: this.#translate.instant('listPlan.duplicateEvent.successMessage'),
            sentiment: AlertSentiment.positive,
            title: this.#translate.instant('listPlan.duplicateEvent.successTitle'),
          });
          this.duplicateSucceeded.emit({ duplicatedPlanId: result.duplicatedPlanId });
        },
        error: () => {
          this.#toastService.add({
            autoHide: true,
            delay: 5000,
            message: this.#translate.instant('errors.generic'),
            sentiment: AlertSentiment.danger,
            title: this.#translate.instant('common.errorTitle'),
          });
        },
      });
  }

  private getRefreshOption(disabled: boolean = false): ActionOption[] {
    if (!this.allowRefreshAction) {
      return [];
    }
    return [
      {
        label: 'menu.refresh',
        icon: { name: 'redo', variant: 'solid' },
        dataTestId: 'plan-card-refresh-button',
        permission: 'can_refresh_plan',
        optimizely: 'plan_refresh_action',
        disabled,
        action: () => {
          // Delay to allow the dropdown to close
          setTimeout(() => {
            this.#refreshAndUpdatePlan();
          });
        },
      },
    ];
  }

  #getPlanLiveStatusAndAnalytics(): Observable<PlanLiveStatusAndAnalytics> {
    if (!this.plan?.id) {
      return throwError(() => new Error('Invalid plan or plan ID'));
    }
    return this.#planService.genPlanLiveStatusAndAnalytics(this.plan.id).pipe(
      catchError(error => {
        const code = error?.code ?? 0;
        return code === PlanCardComponent.too_may_request_code ? EMPTY : throwError(() => error);
      }),
    );
  }

  #getTrackingLink(): Promise<string> {
    return new Promise(resolve => {
      const affiliateId: number | null | undefined = this.#userService.hasPermission(Permissions.CAN_EDIT_NOTIFICATIONS)
        ? null
        : this.#userService.getUserId();
      if (!this.plan || !this.channelId || affiliateId === undefined) {
        resolve('');
        return;
      }
      this.#partnerService
        .partner$()
        .pipe(
          map(partner => partner?.id),
          switchMap(resellerId => {
            if (!resellerId) {
              return of(null);
            }
            return this.#b2cSiteService.getB2cSiteConfigurations(resellerId, affiliateId ?? undefined).pipe(
              switchMap(response => {
                if (response.error || !response.data || !response.data.length) {
                  return of(null);
                }
                const b2cSiteConfigurations = response.data as B2CSiteConfiguration[];

                const siteHost = b2cSiteConfigurations[0]?.host || '';
                if (!this.channelId || !this.plan?.id) return of(null);
                return this.#ambassadorTrackingLinkService.getTrackingLink(
                  resellerId,
                  Number(this.plan.id),
                  this.channelId,
                  siteHost || '',
                );
              }),
            );
          }),
          takeUntilDestroyed(this.#destroyRef),
          catchError(error => {
            this.#toastService.add({
              message: this.#translate.instant(error.message),
              type: ToastType.ERROR,
              delay: 3000,
              autoHide: true,
            });
            return of(null);
          }),
        )
        .subscribe(trackingLink => {
          resolve(trackingLink?.[0]?.trackingLink ?? '');
        });
    });
  }

  #getUpdatedPlanWithLiveStatusAndAnalytics(
    plan: Plan,
    {
      status: { status, isHiddenFeed, isSoldOut, publishedAt },
      analytics: { grossRevenue, paidTicketsSold, freeTicketsSold, addOnsSold },
    }: PlanLiveStatusAndAnalytics,
  ): Plan {
    const clone = plan.clone();
    clone.status = status;
    clone.isHiddenFeed = isHiddenFeed;
    clone.isSoldOut = isSoldOut;
    clone.isPublished = Boolean(publishedAt);
    const currency = clone?.grossRevenue?.currency ?? this.#getPlanCurrency(plan) ?? '';
    clone.grossRevenue = grossRevenue ? new Money(grossRevenue, currency) : undefined;

    clone.paidTicketsSold = paidTicketsSold;
    clone.freeTicketsSold = freeTicketsSold;
    clone.addOnsSold = addOnsSold;

    return clone;
  }

  #getPlanCurrency(plan: Plan): string | undefined {
    const planFirstLocation =
      plan.places?.find(place => place.address === plan.firstPlace?.addressName) ??
      plan.places?.find(place => place.city?.name === plan.firstPlace?.cityName) ??
      plan.places?.[0];

    return planFirstLocation?.city?.currency;
  }

  #refreshAndUpdatePlan(): void {
    if (!this.plan) {
      return;
    }
    this.isRefreshingInProgress = true;
    this.#cdr.markForCheck();
    this.#getPlanLiveStatusAndAnalytics()
      .pipe(
        map(liveStatusAndAnalytics => this.#getUpdatedPlanWithLiveStatusAndAnalytics(this.plan!, liveStatusAndAnalytics)),
        finalize(() => {
          this.isRefreshingInProgress = false;
          this.#cdr.markForCheck();
        }),
      )
      .subscribe({
        next: plan => {
          this.plan = plan;
          this.onPlanUpdate();
          this.updatedPlan.emit(this.plan);
        },
        error: error => {
          this.#toastService.add({
            translationKey: error?.message ?? 'errors.generic',
            type: ToastType.ERROR,
          });
        },
      });
  }
}

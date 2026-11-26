import { computed, DestroyRef, inject, Injectable, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { confirmApproveReview } from '@fz-original/app/modules/plan/tracking/events/confirm-approve-review.event';
import { confirmClaimReview } from '@fz-original/app/modules/plan/tracking/events/confirm-claim-review.event';
import { confirmRejectReview } from '@fz-original/app/modules/plan/tracking/events/confirm-reject-review.event';
import { confirmReleaseReview } from '@fz-original/app/modules/plan/tracking/events/confirm-release-review.event';
import { confirmSetPlanAsReady } from '@fz-original/app/modules/plan/tracking/events/confirm-set-plan-as-ready.event';
import { confirmSubmitForReview } from '@fz-original/app/modules/plan/tracking/events/confirm-submit-for-review.event';
import { confirmWithdrawSubmission } from '@fz-original/app/modules/plan/tracking/events/confirm-withdraw-submission.event';
import { loadPlanReview } from '@fz-original/app/modules/plan/tracking/events/load-plan-review.event';
import { Project } from '@fz-original/app/modules/project-management/models/project.model';
import { ProjectsService } from '@fz-original/app/modules/project-management/services/projects.service';
import {
  RejectPlanReviewModalComponent,
  RejectPlanReviewModalData,
  RejectPlanReviewModalResult,
} from '@fz-original/app/shared/components/reject-plan-review-modal/reject-plan-review-modal.component';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { PlanReviewRequestModel } from '@fz-original/app/shared/models/plan-review/plan-review-request.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { PlanReviewService } from '@fz-original/app/shared/services/plan-review/plan-review.service';
import { PlanService } from '@fz-original/app/shared/services/plan/plan.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntDialogService } from '@ignite/common';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { TranslateService } from '@ngx-translate/core';
import { EMPTY, forkJoin, Observable, Subject } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import {
  PlanLaunchModalComponent,
  PlanLaunchModalData,
  PlanLaunchModalResult,
} from '../components/plan-launch-modal/plan-launch-modal.component';
import { PlanReviewSubmitVariant } from '../models/plan-review-submit-variant.model';
import { PlanLaunchCodeService } from './plan-launch-code.service';

const PLAN_READINESS_ERROR_TO_TRANSLATION_KEY: Record<string, string> = {
  AUCTION: 'planReview.readinessErrors.auction',
  AUCTION_EVENT_SESSION: 'planReview.readinessErrors.auctionEventSession',
  AUCTION_RULES: 'planReview.readinessErrors.auctionRules',
  AUCTION_SESSION: 'planReview.readinessErrors.auctionSession',
  BILLING_TERMS: 'planReview.readinessErrors.billingTerms',
  CITY: 'planReview.readinessErrors.city',
  CONTRACT_ID: 'planReview.readinessErrors.contractId',
  DESCRIPTION: 'planReview.readinessErrors.description',
  DRAW: 'planReview.readinessErrors.draw',
  DRAW_EVENT_SESSION: 'planReview.readinessErrors.drawEventSession',
  DRAW_SESSIONS: 'planReview.readinessErrors.drawSessions',
  DRAW_SETTINGS: 'planReview.readinessErrors.drawSettings',
  GALLERY: 'planReview.readinessErrors.gallery',
  LINK_OUT: 'planReview.readinessErrors.linkOut',
  LINK_OUT_SESSION: 'planReview.readinessErrors.linkOutSession',
  NAME: 'planReview.readinessErrors.name',
  NO_BILLING_TERMS: 'planReview.readinessErrors.noBillingTerms',
  NO_VALIDATION: 'planReview.readinessErrors.noValidation',
  PARTNERSHIP_TYPE: 'planReview.readinessErrors.partnershipType',
  PHOTOS: 'planReview.readinessErrors.photos',
  PLACE: 'planReview.readinessErrors.place',
  PRODUCT_TAX_RATE: 'planReview.readinessErrors.productTaxRate',
  SESSION_TYPE_PRODUCT_TYPE: 'planReview.readinessErrors.sessionTypeProductType',
  SESSIONS: 'planReview.readinessErrors.sessions',
  SESSIONS_CODE_POOL: 'planReview.readinessErrors.sessionsCodePool',
  SESSIONS_PLACE: 'planReview.readinessErrors.sessionsPlace',
  SESSIONS_TAX_LOOKUP: 'planReview.readinessErrors.sessionsTaxLookup',
  TAGS: 'planReview.readinessErrors.tags',
  VALIDATION_METHOD: 'planReview.readinessErrors.validationMethod',
  WAITLIST: 'planReview.readinessErrors.waitlist',
  WAITLIST_PRICING: 'planReview.readinessErrors.waitlistPricing',
};

@Injectable()
export class PlanReviewFacade {
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #injector = inject(Injector);
  readonly #launchCodeService = inject(PlanLaunchCodeService);
  readonly #partnerService = inject(PartnerService);
  readonly #planReviewService = inject(PlanReviewService);
  readonly #planService = inject(PlanService);
  readonly #projectsService = inject(ProjectsService);
  readonly #toastService = inject(ToastService);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #translateService = inject(TranslateService);
  readonly #userService = inject(UserService);

  readonly #reviewStatus = signal<PlanReviewRequestModel | null>(null);
  readonly #reviewHistory = signal<PlanReviewRequestModel[]>([]);
  readonly #reviewLoading = signal<boolean>(false);
  readonly #reviewStatusLoaded = signal<boolean>(false);
  readonly #reviewStatusLoading = signal<boolean>(false);
  readonly #justSetAsReady = signal<boolean>(false);
  readonly #planId = signal<number | null>(null);
  readonly #planReviewLoadRequest = new Subject<number>();

  readonly #approveReadinessToastLabels = {
    genericMessageKey: 'planReview.toast.approveErrorConflictGeneric',
    titleKey: 'planReview.toast.approveErrorConflictTitle',
  } as const;

  readonly #changeToReadyReadinessToastLabels = {
    genericMessageKey: 'planReview.toast.changeToReadyErrorGeneric',
    titleKey: 'planReview.toast.changeToReadyErrorTitle',
  } as const;

  readonly reviewStatus = this.#reviewStatus.asReadonly();
  readonly reviewHistory = this.#reviewHistory.asReadonly();
  readonly reviewLoading = this.#reviewLoading.asReadonly();
  readonly reviewStatusLoaded = this.#reviewStatusLoaded.asReadonly();
  readonly reviewStatusLoading = this.#reviewStatusLoading.asReadonly();
  readonly justSetAsReady = this.#justSetAsReady.asReadonly();

  readonly currentUserId = computed<number | null>(() => this.#userService.getUserId() ?? null);

  readonly hasReviewerPermissions = computed(() => this.#userService.hasPermission(Permissions.CAN_MANAGE_PLAN_REVIEWS));

  readonly canCreatePlans = computed(() => this.#userService.hasPermission(Permissions.CAN_CREATE_PLANS));

  readonly reviewSubmitVariant = computed<PlanReviewSubmitVariant>(() => {
    const canCreate = this.canCreatePlans();
    const canReview = this.hasReviewerPermissions();

    if (canCreate && canReview) {
      return 'both';
    }
    if (canReview) {
      return 'setReady';
    }
    return 'submit';
  });

  readonly #canSetLaunchCode = computed(() => this.canCreatePlans() && this.#userService.getUser()?.isStaff() === true);

  readonly showReviewSubmitPanel = computed(() => this.canCreatePlans() || this.hasReviewerPermissions());

  readonly canWithdrawSubmission = computed(() => {
    if (!this.canCreatePlans()) {
      return false;
    }
    const status = this.#reviewStatus();
    if (!status?.canBeWithdrawn) {
      return false;
    }
    const userId = this.currentUserId();
    if (userId === null) {
      return false;
    }
    return status.submitterId === userId;
  });

  readonly showSubmittedSuccess = computed(() => {
    const status = this.#reviewStatus();
    if (!status?.isInProgress) {
      return false;
    }
    if (!this.hasReviewerPermissions()) {
      return true;
    }
    if (!this.canCreatePlans()) {
      return false;
    }
    const userId = this.currentUserId();
    return userId !== null && status.submitterId === userId;
  });

  readonly showReadySuccess = computed(() => {
    const status = this.#reviewStatus();
    return this.#justSetAsReady() || (status !== null && status.status === 'approved');
  });

  readonly previousRejectedReviews = computed<PlanReviewRequestModel[]>(() => {
    const status = this.#reviewStatus();
    if (!status) {
      return [];
    }

    const shouldShowHistory = status.status === 'rejected' || (this.hasReviewerPermissions() && status.status === 'claimed');
    if (!shouldShowHistory) {
      return [];
    }

    const currentReviewId = status.reviewId;
    return this.#reviewHistory()
      .filter(review => review.status === 'rejected' && review.reviewId !== currentReviewId)
      .filter(review => (review.comments?.length ?? 0) > 0)
      .sort((a, b) => {
        const aTime = a.rejectedAt?.getTime() ?? a.approvedAt?.getTime() ?? 0;
        const bTime = b.rejectedAt?.getTime() ?? b.approvedAt?.getTime() ?? 0;
        return bTime - aTime;
      });
  });

  constructor() {
    this.#planReviewLoadRequest
      .pipe(
        switchMap(planId => this.#loadReviewDataForPlan$(planId)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  approveReview(planName: string): void {
    const planId = this.#planId();
    const partner = this.#partnerService.getPartner();
    const reviewId = this.#reviewStatus()?.reviewId;

    if (!planId || !partner?.id || !reviewId) {
      return;
    }

    this.#reviewLoading.set(true);
    this.#fzTracking.track(confirmApproveReview({ plan_id: planId }));
    this.#planReviewService
      .approveReview(partner.id, planId, reviewId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.#reviewLoading.set(false);
        },
        next: response => {
          this.#reviewLoading.set(false);
          if (!response.error) {
            this.#refresh();
            this.#showReadyToast(planName);
            return;
          }
          if (this.#tryShowReadinessErrorToasts(response.error, this.#approveReadinessToastLabels)) {
            return;
          }
          this.#toastService.add({
            autoHide: true,
            delay: 7000,
            message: this.#translateService.instant('planReview.toast.approveErrorConflictGeneric'),
            sentiment: AlertSentiment.danger,
            title: this.#translateService.instant('planReview.toast.approveErrorConflictTitle'),
          });
        },
      });
  }

  claimReview(): void {
    const planId = this.#planId();
    const partner = this.#partnerService.getPartner();
    const reviewId = this.#reviewStatus()?.reviewId;

    if (!planId || !partner?.id || !reviewId) {
      return;
    }

    this.#reviewLoading.set(true);
    this.#fzTracking.track(confirmClaimReview({ plan_id: planId }));
    this.#planReviewService
      .claimReview(partner.id, planId, reviewId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.#reviewLoading.set(false);
        },
        next: response => {
          this.#reviewLoading.set(false);
          if (!response.error) {
            this.#refresh();
            this.#toastService.add({
              autoHide: true,
              delay: 5000,
              message: this.#translateService.instant('planReview.toast.claimMessage'),
              sentiment: AlertSentiment.positive,
              title: this.#translateService.instant('planReview.toast.claimTitle'),
            });
            return;
          }
          this.#toastService.add({
            autoHide: true,
            delay: 7000,
            message: this.#translateService.instant('planReview.toast.claimErrorGeneric'),
            sentiment: AlertSentiment.danger,
            title: this.#translateService.instant('planReview.toast.claimErrorTitle'),
          });
        },
      });
  }

  releaseReview(): void {
    const planId = this.#planId();
    const partner = this.#partnerService.getPartner();
    const reviewId = this.#reviewStatus()?.reviewId;

    if (!planId || !partner?.id || !reviewId) {
      return;
    }

    this.#reviewLoading.set(true);
    this.#fzTracking.track(confirmReleaseReview({ plan_id: planId }));
    this.#planReviewService
      .releaseReview(partner.id, planId, reviewId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.#reviewLoading.set(false);
          this.#toastService.add({
            autoHide: true,
            delay: 7000,
            message: this.#translateService.instant('planReview.toast.releaseErrorGeneric'),
            sentiment: AlertSentiment.danger,
            title: this.#translateService.instant('planReview.toast.releaseErrorTitle'),
          });
        },
        next: response => {
          this.#reviewLoading.set(false);
          if (!response.error) {
            this.#refresh();
            this.#toastService.add({
              autoHide: true,
              delay: 5000,
              message: this.#translateService.instant('planReview.toast.releaseMessage'),
              sentiment: AlertSentiment.positive,
              title: this.#translateService.instant('planReview.toast.releaseTitle'),
            });
            return;
          }
          this.#toastService.add({
            autoHide: true,
            delay: 7000,
            message: this.#translateService.instant('planReview.toast.releaseErrorGeneric'),
            sentiment: AlertSentiment.danger,
            title: this.#translateService.instant('planReview.toast.releaseErrorTitle'),
          });
        },
      });
  }

  loadForPlan(planId: number | null): void {
    this.#planId.set(planId);
    this.#justSetAsReady.set(false);

    if (planId === null) {
      this.#reviewStatus.set(null);
      this.#reviewHistory.set([]);
      this.#reviewStatusLoading.set(false);
      this.#reviewStatusLoaded.set(true);
      return;
    }

    this.#planReviewLoadRequest.next(planId);
  }

  rejectReview(planName: string): void {
    const dialogRef = this.#dialogService.openModal<RejectPlanReviewModalResult, RejectPlanReviewModalData>(
      RejectPlanReviewModalComponent,
      {
        data: { planId: this.#planId() },
        disableCloseShortcuts: true,
        injector: this.#injector,
        size: 'sm',
      },
    );

    dialogRef.closed$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(comments => {
      if (comments && comments.length > 0) {
        this.#performReject(comments, planName);
      }
    });
  }

  setPlanAsReady(planName: string, launchCode: string | null = null): void {
    const planId = this.#planId();
    const partner = this.#partnerService.getPartner();

    if (!planId || !partner?.id) {
      return;
    }

    if (launchCode || !this.#canSetLaunchCode()) {
      this.#performSetPlanAsReady(partner.id, planId, planName);
      return;
    }

    this.#reviewLoading.set(true);
    this.#projectsService
      .list(partner.id)
      .pipe(
        map(response => (response.data ?? []).filter(launch => Boolean(launch.launchIdC))),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(launches => {
        this.#reviewLoading.set(false);
        if (launches.length === 0) {
          this.#performSetPlanAsReady(partner.id, planId, planName);
          return;
        }

        this.#openLaunchModal(partner.id, planId, planName, launches);
      });
  }

  submitReview(): void {
    const planId = this.#planId();
    const partner = this.#partnerService.getPartner();

    if (!planId || !partner?.id) {
      return;
    }

    this.#reviewLoading.set(true);
    this.#fzTracking.track(confirmSubmitForReview({ plan_id: planId }));
    this.#planReviewService
      .submitReview(partner.id, planId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.#reviewLoading.set(false);
        },
        next: response => {
          this.#reviewLoading.set(false);
          if (!response.error) {
            this.#refresh();
            this.#toastService.add({
              autoHide: true,
              delay: 5000,
              message: this.#translateService.instant('planReview.toast.submittedMessage'),
              sentiment: AlertSentiment.positive,
              title: this.#translateService.instant('planReview.toast.submittedTitle'),
            });
            return;
          }
          this.#toastService.add({
            autoHide: true,
            delay: 7000,
            message: this.#translateService.instant('planReview.toast.submitErrorGeneric'),
            sentiment: AlertSentiment.danger,
            title: this.#translateService.instant('planReview.toast.submitErrorTitle'),
          });
        },
      });
  }

  withdrawReview(): void {
    const planId = this.#planId();
    const partner = this.#partnerService.getPartner();
    const reviewId = this.#reviewStatus()?.reviewId;

    if (!planId || !partner?.id || !reviewId) {
      return;
    }

    this.#reviewLoading.set(true);
    this.#fzTracking.track(confirmWithdrawSubmission({ plan_id: planId }));
    this.#planReviewService
      .withdrawReview(partner.id, planId, reviewId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.#reviewLoading.set(false);
          this.#toastService.add({
            autoHide: true,
            delay: 7000,
            message: this.#translateService.instant('planReview.toast.withdrawErrorGeneric'),
            sentiment: AlertSentiment.danger,
            title: this.#translateService.instant('planReview.toast.withdrawErrorTitle'),
          });
        },
        next: response => {
          this.#reviewLoading.set(false);
          if (!response.error) {
            this.#refresh();
            this.#toastService.add({
              autoHide: true,
              delay: 5000,
              message: this.#translateService.instant('planReview.toast.withdrawMessage'),
              sentiment: AlertSentiment.positive,
              title: this.#translateService.instant('planReview.toast.withdrawTitle'),
            });
            return;
          }
          this.#toastService.add({
            autoHide: true,
            delay: 7000,
            message: this.#translateService.instant('planReview.toast.withdrawErrorGeneric'),
            sentiment: AlertSentiment.danger,
            title: this.#translateService.instant('planReview.toast.withdrawErrorTitle'),
          });
        },
      });
  }

  #loadReviewDataForPlan$(planId: number): Observable<void> {
    const partner = this.#partnerService.getPartner();
    if (!partner?.id) {
      return EMPTY;
    }

    this.#reviewStatusLoading.set(true);
    this.#reviewStatusLoaded.set(false);
    this.#reviewStatus.set(null);

    return forkJoin({
      reviews: this.#planReviewService.getReviews(partner.id, planId),
      status: this.#planReviewService.getStatus(partner.id, planId),
    }).pipe(
      tap({
        next: ({ reviews, status }) => {
          if (status.data) {
            this.#reviewStatus.set(status.data);
          }
          if (reviews.error === null && reviews.data) {
            this.#reviewHistory.set(reviews.data);
          }
          this.#reviewStatusLoading.set(false);
          this.#reviewStatusLoaded.set(true);

          const reviewStatus = status.data?.status ?? null;
          if (reviewStatus !== null) {
            this.#fzTracking.track(
              loadPlanReview({
                is_reviewer: this.hasReviewerPermissions(),
                plan_id: planId,
                review_status: reviewStatus,
              }),
            );
          }
        },
      }),
      catchError(() => {
        this.#reviewStatus.set(null);
        this.#reviewStatusLoading.set(false);
        this.#reviewStatusLoaded.set(true);
        return EMPTY;
      }),
      map((): undefined => void 0),
    );
  }

  #openLaunchModal(partnerId: number, planId: number, planName: string, launches: Project[]): void {
    const dialogRef = this.#dialogService.openModal<PlanLaunchModalResult, PlanLaunchModalData>(PlanLaunchModalComponent, {
      data: { launches },
      disableCloseShortcuts: true,
      injector: this.#injector,
      size: 'sm',
    });

    dialogRef.closed$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(result => {
      if (!result) {
        return;
      }

      if (!result.launchCode) {
        this.#performSetPlanAsReady(partnerId, planId, planName);
        return;
      }

      this.#saveLaunchCodeAndSetPlanAsReady(partnerId, planId, planName, result.launchCode);
    });
  }

  #performReject(comments: string[], planName: string): void {
    const planId = this.#planId();
    const partner = this.#partnerService.getPartner();
    const reviewId = this.#reviewStatus()?.reviewId;

    if (!planId || !partner?.id || !reviewId) {
      return;
    }

    this.#reviewLoading.set(true);
    this.#fzTracking.track(confirmRejectReview({ plan_id: planId }));
    this.#planReviewService
      .rejectReview(partner.id, planId, reviewId, comments)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.#reviewLoading.set(false);
        },
        next: response => {
          this.#reviewLoading.set(false);
          if (!response.error) {
            this.#refresh();
            this.#toastService.add({
              autoHide: true,
              delay: 5000,
              message: this.#translateService.instant('planReview.toast.rejectedMessage'),
              sentiment: AlertSentiment.positive,
              title: this.#translateService.instant('planReview.toast.rejectedTitle', { eventName: planName }),
            });
            return;
          }
          this.#toastService.add({
            autoHide: true,
            delay: 7000,
            message: this.#translateService.instant('planReview.toast.rejectErrorGeneric'),
            sentiment: AlertSentiment.danger,
            title: this.#translateService.instant('planReview.toast.rejectErrorTitle'),
          });
        },
      });
  }

  #performSetPlanAsReady(partnerId: number, planId: number, planName: string): void {
    this.#reviewLoading.set(true);
    this.#fzTracking.track(confirmSetPlanAsReady({ plan_id: planId }));
    this.#planService
      .setPlanStatusAsReadyThroughPartners(partnerId, planId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.#reviewLoading.set(false);
          this.#toastService.add({
            autoHide: true,
            delay: 7000,
            message: this.#translateService.instant('planReview.toast.changeToReadyErrorGeneric'),
            sentiment: AlertSentiment.danger,
            title: this.#translateService.instant('planReview.toast.changeToReadyErrorTitle'),
          });
        },
        next: (response: BaseResponse<unknown>) => {
          this.#reviewLoading.set(false);
          if (response.error) {
            if (this.#tryShowReadinessErrorToasts(response.error, this.#changeToReadyReadinessToastLabels)) {
              return;
            }
            this.#toastService.add({
              autoHide: true,
              delay: 7000,
              message: this.#translateService.instant('planReview.toast.changeToReadyErrorGeneric'),
              sentiment: AlertSentiment.danger,
              title: this.#translateService.instant('planReview.toast.changeToReadyErrorTitle'),
            });
            return;
          }

          this.#justSetAsReady.set(true);
          this.#showReadyToast(planName);
        },
      });
  }

  #refresh(): void {
    const planId = this.#planId();
    if (planId === null) {
      return;
    }

    this.#planReviewLoadRequest.next(planId);
  }

  #saveLaunchCodeAndSetPlanAsReady(partnerId: number, planId: number, planName: string, launchCode: string): void {
    this.#reviewLoading.set(true);
    this.#launchCodeService
      .setLaunchCode(partnerId, planId, launchCode)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.#reviewLoading.set(false);
          this.#toastService.add({
            autoHide: true,
            delay: 7000,
            message: this.#translateService.instant('planReview.toast.launchCodeErrorGeneric'),
            sentiment: AlertSentiment.danger,
            title: this.#translateService.instant('planReview.toast.changeToReadyErrorTitle'),
          });
        },
        next: () => this.#performSetPlanAsReady(partnerId, planId, planName),
      });
  }

  #showReadyToast(planName: string): void {
    this.#toastService.add({
      autoHide: true,
      delay: 5000,
      message: this.#translateService.instant('planReview.toast.readyMessage'),
      sentiment: AlertSentiment.positive,
      title: this.#translateService.instant('planReview.toast.readyTitle', { eventName: planName }),
    });
  }

  #showReadinessErrorToasts(readinessErrors: string[], labels: { genericMessageKey: string; titleKey: string }): void {
    const title = this.#translateService.instant(labels.titleKey);
    readinessErrors.forEach(readinessError => {
      const translationKey = PLAN_READINESS_ERROR_TO_TRANSLATION_KEY[readinessError];
      const message =
        translationKey !== undefined
          ? this.#translateService.instant(translationKey)
          : this.#translateService.instant(labels.genericMessageKey);

      this.#toastService.add({
        autoHide: true,
        delay: 7000,
        message,
        sentiment: AlertSentiment.danger,
        title,
      });
    });
  }

  #tryShowReadinessErrorToasts(
    error: NonNullable<BaseResponse<unknown>['error']>,
    labels: { genericMessageKey: string; titleKey: string },
  ): boolean {
    const readinessMessage = this.#getReadinessErrorMessage(error);
    const readinessErrors = readinessMessage !== null ? this.#parseReadinessErrorsFromMessage(readinessMessage) : [];
    if (readinessErrors.length === 0) {
      return false;
    }
    this.#showReadinessErrorToasts(readinessErrors, labels);
    return true;
  }

  #getReadinessErrorMessage(error: { code?: unknown; error?: unknown; message?: unknown }): string | null {
    const errorCode = error.code;
    if (errorCode !== 'PLAN_READINESS_VALIDATION_FAILED') {
      return null;
    }

    const httpError = error.error as { error?: unknown } | undefined;
    const apiResponse = httpError?.error as { error?: unknown } | undefined;
    const apiError = apiResponse?.error as { message?: unknown } | undefined;
    const apiMessage = apiError?.message;
    if (typeof apiMessage === 'string' && apiMessage.length > 0) {
      return apiMessage;
    }

    const fallbackMessage = error.message;
    return typeof fallbackMessage === 'string' && fallbackMessage.length > 0 ? fallbackMessage : null;
  }

  #parseReadinessErrorsFromMessage(message: string): string[] {
    const trimmed = message.trim();
    if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
      return [];
    }

    const inner = trimmed.slice(1, -1).trim();
    if (inner.length === 0) {
      return [];
    }

    return inner
      .split(',')
      .map(part => part.trim())
      .filter(part => part.length > 0)
      .filter((part, index, allParts) => allParts.indexOf(part) === index);
  }
}

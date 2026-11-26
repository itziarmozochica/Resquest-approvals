import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Observable, of, Subject } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';

import { BaseResponse } from '../../models/base-response';
import { PlanReviewRequestModel } from '../../models/plan-review/plan-review-request.model';
import { Plan } from '../../models/plan/plan.model';
import { PartnerService } from '../partner/partner.service';
import { PlanService } from '../plan/plan.service';
import { Permissions } from '../user/permissions';
import { UserService } from '../user/user.service';
import { PlanReviewService } from './plan-review.service';

export interface LockReasonReviewInProgress {
  kind: 'review_in_progress';
  reviewStatus: PlanReviewRequestModel;
}

export interface LockReasonPlanReady {
  kind: 'plan_ready';
  reviewStatus: PlanReviewRequestModel;
}

export interface LockReasonLoading {
  kind: 'loading';
}

export interface LockReasonLoadError {
  error: unknown;
  kind: 'load_error';
}

export type LockReason = LockReasonLoadError | LockReasonLoading | LockReasonPlanReady | LockReasonReviewInProgress | null;

type LockPhase = 'idle' | 'loading' | 'loaded' | 'error';
const LockResolvedStates = ['loaded', 'error'];

interface LockState {
  error: unknown;
  isPlanPublished: boolean | null;
  phase: LockPhase;
  planId: number | null;
  status: PlanReviewRequestModel | null;
}

const IDLE_STATE: LockState = { error: null, isPlanPublished: null, phase: 'idle', planId: null, status: null };

@Injectable({
  providedIn: 'root',
})
export class PlanEditionLockService {
  readonly #destroyRef = inject(DestroyRef);
  readonly #partnerService = inject(PartnerService);
  readonly #planReviewService = inject(PlanReviewService);
  readonly #planService = inject(PlanService);
  readonly #userService = inject(UserService);

  readonly #request$ = new Subject<number | null>();
  readonly #state = signal<LockState>(IDLE_STATE);
  readonly #hasReviewerPermission = signal<boolean>(this.#userService.hasPermission(Permissions.CAN_MANAGE_PLAN_REVIEWS));

  readonly reviewStatus = computed(() => this.#state().status);
  readonly lockResolved = computed(() => LockResolvedStates.includes(this.#state().phase));
  readonly lockLoadError = computed(() => this.#state().error);
  readonly showLockedBanner = computed(() => {
    const { isPlanPublished, phase, status } = this.#state();
    if (!LockResolvedStates.includes(phase)) {
      return false;
    }
    if (status?.status === 'approved' && isPlanPublished === null) {
      return false;
    }
    return this.isLockedForEdition();
  });

  readonly isLockedForEdition = computed<boolean>(() => {
    const { isPlanPublished, phase, planId, status } = this.#state();
    if (planId === null) {
      return false;
    }
    if (this.#hasReviewerPermission()) {
      return false;
    }
    if (phase === 'loading' || phase === 'error') {
      return true;
    }
    return this.#shouldLockForReviewStatus(status, isPlanPublished);
  });

  readonly lockReason = computed<LockReason>(() => {
    if (!this.isLockedForEdition()) {
      return null;
    }
    const { error, phase, status } = this.#state();
    if (phase === 'loading') {
      return { kind: 'loading' };
    }
    if (phase === 'error') {
      return { error, kind: 'load_error' };
    }
    if (status === null) {
      return null;
    }
    if (status.status === 'approved') {
      return { kind: 'plan_ready', reviewStatus: status };
    }
    return { kind: 'review_in_progress', reviewStatus: status };
  });

  constructor() {
    this.#request$
      .pipe(
        switchMap(planId => this.#resolveState$(planId)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(state => this.#state.set(state));

    this.#userService
      .observePermissions()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.#hasReviewerPermission.set(this.#userService.hasPermission(Permissions.CAN_MANAGE_PLAN_REVIEWS));
      });
  }

  loadForPlan(planId: number | null): void {
    if (planId === null) {
      this.#request$.next(null);
      return;
    }
    const current = this.#state();
    if (current.planId === planId && (current.phase === 'loaded' || current.phase === 'loading')) {
      return;
    }
    this.#request$.next(planId);
  }

  #resolveState$(planId: number | null): Observable<LockState> {
    if (planId === null) {
      return of(IDLE_STATE);
    }
    const partner = this.#partnerService.getPartner();
    const partnerId = partner?.id;
    if (!partnerId) {
      return of<LockState>({ error: new Error('No partner available'), isPlanPublished: null, phase: 'error', planId, status: null });
    }
    if (partner.type !== undefined && this.#partnerService.isReseller(partner.type)) {
      return of<LockState>({ error: null, isPlanPublished: null, phase: 'loaded', planId, status: null });
    }
    return this.#planReviewService.getStatus(partnerId, planId).pipe(
      switchMap((reviewResponse: BaseResponse<PlanReviewRequestModel | null>): Observable<LockState> => {
        if (reviewResponse.error != null) {
          return of<LockState>({ error: reviewResponse.error, isPlanPublished: null, phase: 'error', planId, status: null });
        }
        const status = reviewResponse.data ?? null;
        if (status?.status !== 'approved' || this.#hasReviewerPermission()) {
          return of<LockState>({
            error: null,
            isPlanPublished: null,
            phase: 'loaded',
            planId,
            status,
          });
        }
        return this.#planService.getPlan(partnerId, planId).pipe(
          map(
            (planResponse: BaseResponse<Plan | null>): LockState => ({
              error: null,
              isPlanPublished: planResponse.data?.isPublished === true,
              phase: 'loaded',
              planId,
              status,
            }),
          ),
        );
      }),
      catchError(error => of<LockState>({ error, isPlanPublished: null, phase: 'error', planId, status: null })),
      startWith<LockState>({ error: null, isPlanPublished: null, phase: 'loading', planId, status: null }),
    );
  }

  #shouldLockForReviewStatus(status: PlanReviewRequestModel | null, isPlanPublished: boolean | null): boolean {
    const reviewStatus = status?.status;
    if (reviewStatus === 'approved' && isPlanPublished === true) {
      return false;
    }
    return reviewStatus === 'submitted' || reviewStatus === 'claimed' || reviewStatus === 'approved';
  }
}

import { inject, Injectable } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationStart, Router } from '@angular/router';

import { PlanCreationAbandonedData } from '@fz-original/app/modules/plan/tracking/events/plan-creation-abandoned.event';
import { PlanCreationAbandonStep } from '@fz-original/app/modules/plan/tracking/models/plan-tracking.model';
import {
  isDashboardUrlForPlan,
  isInventoryUrlForPlan,
} from '@fz-original/app/modules/plan/tracking/utils/plan-creation-route-context.util';

export interface PlanCreationAbandonmentRegistration {
  getLastStepReached: () => PlanCreationAbandonStep | null;
  getPlanId: () => number | null;
  isActive?: () => boolean;
  trackAbandoned: (payload: PlanCreationAbandonedData) => void;
}

interface PendingPlanCreationAbandonment {
  emit: () => void;
  navigationId: number;
  planId: number;
}

@Injectable({ providedIn: 'root' })
export class PlanCreationAbandonmentTrackerService {
  readonly #router = inject(Router);

  #pendingAbandonment: PendingPlanCreationAbandonment | null = null;
  #registration: PlanCreationAbandonmentRegistration | null = null;
  #skipNextNavigation = false;

  constructor() {
    this.#router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.#handleNavigationStart(event);
        return;
      }

      if (event instanceof NavigationEnd) {
        this.#handleNavigationEnd(event);
        return;
      }

      if (event instanceof NavigationCancel) {
        this.#handleNavigationCancel(event);
      }
    });
  }

  register(registration: PlanCreationAbandonmentRegistration): void {
    this.#registration = registration;
  }

  skipNextNavigation(): void {
    this.#skipNextNavigation = true;
  }

  unregister(registration: PlanCreationAbandonmentRegistration): void {
    if (this.#registration === registration) {
      this.#registration = null;
    }
  }

  #handleNavigationCancel(event: NavigationCancel): void {
    if (this.#pendingAbandonment?.navigationId === event.id) {
      this.#pendingAbandonment = null;
    }
  }

  #handleNavigationEnd(event: NavigationEnd): void {
    const pending = this.#pendingAbandonment;

    if (pending?.navigationId !== event.id) {
      return;
    }

    if (this.#shouldTrackAbandonmentForPlan(pending.planId, event.urlAfterRedirects)) {
      pending.emit();
    }

    this.#pendingAbandonment = null;
  }

  #handleNavigationStart(event: NavigationStart): void {
    if (this.#skipNextNavigation) {
      this.#skipNextNavigation = false;
      this.#pendingAbandonment = null;
      return;
    }

    const registration = this.#registration;

    if (!registration || registration.isActive?.() === false) {
      this.#pendingAbandonment = null;
      return;
    }

    const lastStepReached = registration.getLastStepReached();
    const planId = registration.getPlanId();

    if (planId === null || lastStepReached === null || !this.#shouldTrackAbandonmentForPlan(planId, event.url)) {
      this.#pendingAbandonment = null;
      return;
    }

    const payload: PlanCreationAbandonedData = {
      creationFlow: 'advanced',
      lastStepReached,
      planId,
    };

    this.#pendingAbandonment = {
      emit: () => registration.trackAbandoned(payload),
      navigationId: event.id,
      planId,
    };
  }

  #shouldTrackAbandonmentForPlan(planId: number, targetUrl: string): boolean {
    const targetUrlTree = this.#router.parseUrl(targetUrl);

    if (isDashboardUrlForPlan(targetUrlTree, planId)) {
      return false;
    }

    if (isInventoryUrlForPlan(targetUrlTree, planId)) {
      return false;
    }

    return true;
  }
}

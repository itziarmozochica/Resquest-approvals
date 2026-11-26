import { inject, Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { clickPlanCreationStepper } from '@fz-original/app/modules/plan/tracking/events/click-plan-creation-stepper.event';
import { PlanCreationStep } from '@fz-original/app/modules/plan/tracking/models/plan-tracking.model';
import { PlanEditionLockService } from '@fz-original/app/shared/services/plan-review/plan-edition-lock.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { Step } from '@ignite/legacy/components/ignt-stepper/ignt.stepper.model';

@Injectable()
export class PlanStepperNavigationService {
  readonly #planEditionLockService = inject(PlanEditionLockService);
  #router = inject(Router);
  readonly #fzTracking = inject(FzTrackingService);

  handleStepClick(stepIndex: number, steps: Step[], planId: number, route: ActivatedRoute, currentStepId?: string): void {
    if (stepIndex < 0 || stepIndex >= steps.length) {
      return;
    }

    const clickedStep = steps[stepIndex];
    const targetStep = this.#toPlanCreationStep(clickedStep.id);
    const currentStep = currentStepId ? this.#toPlanCreationStep(currentStepId) : null;
    if (targetStep !== null && currentStep !== null) {
      this.#fzTracking.track(
        clickPlanCreationStepper({
          current_step: currentStep,
          plan_id: planId,
          step: targetStep,
        }),
      );
    }
    this.#navigateToStep(clickedStep.id, planId, route);
  }

  #navigateToStep(stepId: string, planId: number, route: ActivatedRoute): void {
    if (this.#planEditionLockService.isLockedForEdition()) {
      return;
    }

    const navigableSteps = ['content', 'settings'];

    if (!navigableSteps.includes(stepId)) {
      return;
    }

    this.#router.navigate([], {
      relativeTo: route,
      queryParams: {
        step: stepId,
        planId,
      },
      queryParamsHandling: 'merge',
    });
  }

  #toPlanCreationStep(stepId: string): PlanCreationStep | null {
    if (stepId === 'content' || stepId === 'settings' || stepId === 'setup') {
      return stepId;
    }
    return null;
  }
}

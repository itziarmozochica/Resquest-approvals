import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { EditingPlanService } from '@fz-original/app/modules/content-plan/services/editing-plan/editing-plan.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { PlanDetailService } from '@fz-original/app/shared/services/plan/plan-detail.service';
import { IgntToastService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { catchError, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';

import type { ImmersivePlanContext } from '../../models/immersive-plan-context.model';

/** Loads the detail of the selected plan to tell the editor its audience. Provided on the editor, not in root. */
@Injectable()
export class ImmersivePlanContextService implements ImmersivePlanContext {
  readonly #editingPlan = inject(EditingPlanService);
  readonly #partnerService = inject(PartnerService);
  readonly #planDetailService = inject(PlanDetailService);
  readonly #toastService = inject(IgntToastService);
  readonly #translateService = inject(TranslateService);

  readonly isWaitlist = toSignal(
    this.#editingPlan.getSelectedPlanOption$().pipe(
      map(option => option?.id ?? null),
      distinctUntilChanged(),
      switchMap(planId => {
        const partnerId = this.#partnerService.getActingOrganizationId();
        return planId === null || partnerId === null
          ? of(null)
          : this.#planDetailService.getPlanDetail(partnerId, planId).pipe(
              map(detail => detail.isWaitlist),
              catchError(() => {
                this.#toastService.danger(this.#translateService.instant('planEdition.immersiveContentPlan.planDetailFailed'));
                return of(null);
              }),
              startWith(null),
            );
      }),
    ),
    { initialValue: null },
  );
}

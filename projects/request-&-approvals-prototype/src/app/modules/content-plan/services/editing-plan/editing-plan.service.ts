import { inject, Injectable } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

import { combineLatest, Observable, ReplaySubject, Subject } from 'rxjs';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';

import { SelectOption } from '../../../../shared/layout/filters/select/select.interface';
import { BaseResponse } from '../../../../shared/models/base-response';
import { PlanDetail } from '../../../../shared/models/plan/plan-detail.model';
import { PlanKind } from '../../../../shared/models/plan/plan-kind.enum';
import { PlanEditionLockService } from '../../../../shared/services/plan-review/plan-edition-lock.service';
import { SelectedPlanContextService } from '../../../../shared/services/selected-plan-context/selected-plan-context.service';
import { PlanSaveContext } from '../../../plan/tracking/models/plan-tracking.model';

@Injectable({
  providedIn: 'root',
})
export class EditingPlanService {
  readonly #planEditionLockService = inject(PlanEditionLockService);
  readonly #selectedPlanContextService = inject(SelectedPlanContextService);

  readonly #isLocked$ = toObservable(this.#planEditionLockService.isLockedForEdition);

  #selectedPlanOption!: SelectOption;
  #selectedPlanDetail!: BaseResponse<PlanDetail>;
  #selectedPlanOption$!: ReplaySubject<SelectOption>;
  #selectedPlanDetail$!: ReplaySubject<BaseResponse<PlanDetail>>;
  #selectedPlanChanged$!: Subject<SelectOption>;
  #saveContext: PlanSaveContext = 'standalone';

  constructor() {
    this.reset();
  }

  getSaveContext(): PlanSaveContext {
    return this.#saveContext;
  }

  setSaveContext(context: PlanSaveContext): void {
    this.#saveContext = context;
  }

  canEditPlan(): boolean {
    return this.#selectedPlanContextService.canManageSelectedPlan() && !this.#planEditionLockService.isLockedForEdition();
  }

  observeCanEditPlan$(): Observable<boolean> {
    return combineLatest([this.#selectedPlanContextService.observeCanManageSelectedPlan(), this.#isLocked$]).pipe(
      map(([canManage, isLocked]) => canManage && !isLocked),
      distinctUntilChanged(),
    );
  }

  triggerSelectedPlanChanged(): void {
    this.#selectedPlanChanged$.next(this.#selectedPlanOption);
  }

  getSelectedPlanChanged$(): Observable<SelectOption> {
    return this.#selectedPlanChanged$.asObservable();
  }

  getSelectedPlanOption(): SelectOption {
    return this.#selectedPlanOption;
  }

  getSelectedPlanOption$(): Observable<SelectOption> {
    return this.#selectedPlanOption$.pipe(distinctUntilChanged((prev, curr) => prev?.id === curr?.id));
  }

  getSelectedPlanDetail$(): Observable<BaseResponse<PlanDetail>> {
    return this.#selectedPlanDetail$.pipe(filter(Boolean)) as Observable<BaseResponse<PlanDetail>>;
  }

  setSelectedPlanOption(option: SelectOption): void {
    this.#selectedPlanOption = option;
    this.#selectedPlanOption$.next(option);
  }

  setSelectedPlanDetail(detail: BaseResponse<PlanDetail>): void {
    this.#selectedPlanDetail = detail;
    this.#selectedPlanDetail$.next(detail);

    const planDetail = detail?.data;
    if (planDetail) {
      this.#selectedPlanContextService.setPlanKind(planDetail.id, (planDetail.type as PlanKind) ?? null);
    }
  }

  getSelectedPlanDetail(): BaseResponse<PlanDetail> {
    return this.#selectedPlanDetail;
  }

  reset(): void {
    this.#selectedPlanOption = undefined as unknown as SelectOption;
    this.#selectedPlanOption$?.complete();
    this.#selectedPlanDetail$?.complete();
    this.#selectedPlanOption$ = new ReplaySubject<SelectOption>(1);
    this.#selectedPlanDetail$ = new ReplaySubject<BaseResponse<PlanDetail>>(1);
    this.#selectedPlanChanged$ = new Subject<SelectOption>();
    this.#saveContext = 'standalone';
  }
}

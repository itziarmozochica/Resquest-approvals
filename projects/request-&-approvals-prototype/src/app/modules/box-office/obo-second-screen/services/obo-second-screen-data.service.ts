import { inject, Injectable } from '@angular/core';

import { OboSecondScreenCart } from '@fz-original/app/modules/box-office/obo-second-screen/models/obo-second-screen-cart.model';
import { OboSecondScreenPaymentStatus } from '@fz-original/app/modules/box-office/obo-second-screen/models/obo-second-screen-payment-status.model';
import { OboSecondScreenPayment } from '@fz-original/app/modules/box-office/obo-second-screen/models/obo-second-screen-payment.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { DualScreenStorageService } from '@fz-original/app/shared/services/dual-screen/dual-screen-storage.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { PlanService } from '@fz-original/app/shared/services/plan/plan.service';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, filter, map, take } from 'rxjs/operators';

import { OboSecondScreenData } from '../models/obo-second-screen-data.model';
import { OboSecondScreenPlan } from '../models/obo-second-screen-plan.model';
import { OboSecondScreenSeatingMap } from '../models/seating-map/obo-second-screen-seating-map.model';
import { OboSecondScreenStorageService } from './obo-second-screen-storage.service';

@Injectable({
  providedIn: 'root',
})
export class OboSecondScreenDataService {
  readonly #dualScreenStorageService = inject(DualScreenStorageService);
  readonly #oboSecondScreenStorageService = inject(OboSecondScreenStorageService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #partnerService = inject(PartnerService);
  readonly #planService = inject(PlanService);
  #plansByMainPlanId = new Map<number, OboSecondScreenPlan>();
  #cartRequestId = 0;

  readonly seatingMapHiddenByCustomerScreen$: Observable<void> = this.#oboSecondScreenStorageService.observeExternalChanges().pipe(
    filter(({ current, previous }) => previous?.isSeatingMapVisible === true && current?.isSeatingMapVisible === false),
    map((): void => undefined),
  );

  completeSurvey(): void {
    this.#updateData((data: OboSecondScreenData) => (data.isSurveyCompleted = true));
  }

  create(organizationId: number): void {
    if (this.#dualScreenStorageService.containsData()) {
      this.#oboSecondScreenStorageService.setData(new OboSecondScreenData(organizationId));
    }
  }

  /**
   * Starts the customer screen for the organization the user is acting as. The Odoo handoff login
   * (`/login/handoff`) selects the organization without going through the login or sidebar flows
   * that call `create`, and a cashier change clears the stored record.
   */
  createForActingOrganization(): void {
    const organizationId = this.#partnerService.getActingOrganizationId();
    if (organizationId !== null) {
      this.create(organizationId);
    }
  }

  finishPayment(): void {
    this.#updateData((data: OboSecondScreenData) => {
      data.payment = new OboSecondScreenPayment(OboSecondScreenPaymentStatus.Success);
      data.showSurvey = this.#optimizelyService.isFeatureEnabled('dual_screen_show_surveys') ?? false;
    });
  }

  resetCart(): void {
    ++this.#cartRequestId;
    this.#updateData((data: OboSecondScreenData) => data.resetCartData());
  }

  setCart(cart: Cart | null, seatingMap?: OboSecondScreenSeatingMap): void {
    const cartRequestId = ++this.#cartRequestId;
    this.#updateData((data: OboSecondScreenData) => {
      if (cart !== null) {
        data.cart = OboSecondScreenCart.fromCart(cart, this.#plansByMainPlanId);
      } else {
        data.cart = undefined;
      }
      data.seatingMap = seatingMap;
    });
    if (cart !== null) {
      this.#loadMissingPlansForCart(cart, cartRequestId);
    }
  }

  setPlace(placeId?: number): void {
    this.#updateData((data: OboSecondScreenData) => (data.placeId = placeId));
  }

  setPlan(plan: Plan): void {
    if (plan.id != null) {
      this.#plansByMainPlanId.set(plan.id, this.#toSecondScreenPlan(plan));
    }
    this.#updateData((data: OboSecondScreenData) => {
      data.plan = this.#toSecondScreenPlan(plan);
    });
  }

  setSeatingMap(seatingMap: OboSecondScreenSeatingMap): void {
    this.#updateData((data: OboSecondScreenData) => (data.seatingMap = seatingMap));
  }

  setIsSeatingMapVisible(isVisible: boolean): void {
    this.#updateData((data: OboSecondScreenData) => (data.isSeatingMapVisible = isVisible));
  }

  setIsContactInfoActive(isActive: boolean): void {
    this.#updateData((data: OboSecondScreenData) => (data.isContactInfoActive = isActive));
  }

  #updateData(update: (data: OboSecondScreenData) => void): void {
    const data: OboSecondScreenData | null = this.#oboSecondScreenStorageService.getData();
    if (data !== null) {
      update(data);
      this.#oboSecondScreenStorageService.setData(data);
    }
  }

  #loadMissingPlansForCart(cart: Cart, cartRequestId: number): void {
    const partnerId = this.#partnerService.getPartner()?.id;
    if (partnerId == null) {
      return;
    }
    const sessionsByMainPlanAndDatetime = cart.getSessionItemsByMainPlanAndDatetime?.();
    if (sessionsByMainPlanAndDatetime == null) {
      return;
    }
    const missingPlanIds = [...sessionsByMainPlanAndDatetime.keys()].filter(mainPlanId => !this.#plansByMainPlanId.has(mainPlanId));
    if (missingPlanIds.length === 0) {
      return;
    }
    const missingPlanRequests = missingPlanIds.map(mainPlanId =>
      this.#planService.getPlan(partnerId, mainPlanId).pipe(
        map(response => ({ mainPlanId, plan: response.data })),
        catchError(() => of({ mainPlanId, plan: null })),
      ),
    );

    forkJoin(missingPlanRequests)
      .pipe(take(1))
      .subscribe(plans => {
        if (cartRequestId !== this.#cartRequestId) {
          return;
        }
        let hasNewPlanData = false;
        for (const planData of plans) {
          if (planData.plan == null) {
            continue;
          }
          this.#plansByMainPlanId.set(planData.mainPlanId, this.#toSecondScreenPlan(planData.plan));
          hasNewPlanData = true;
        }
        if (!hasNewPlanData) {
          return;
        }
        this.#updateData((data: OboSecondScreenData) => {
          data.cart = OboSecondScreenCart.fromCart(cart, this.#plansByMainPlanId);
        });
      });
  }

  #toSecondScreenPlan(plan: Plan): OboSecondScreenPlan {
    return {
      places: plan.places?.map(place => ({
        id: place.id,
        name: place.name,
      })),
      imageUrl: plan.pictureURL,
      name: plan.name,
    };
  }
}

import { Component, Input } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import {
  OboSecondScreenCart,
  OboSecondScreenCartPlanGroup,
  OboSecondScreenCartSessionGroup,
} from '../../../models/obo-second-screen-cart.model';
import { OboSecondScreenPlan } from '../../../models/obo-second-screen-plan.model';

@Component({
  selector: 'app-cart',
  standalone: false,
  styleUrls: ['./cart.component.scss'],
  templateUrl: './cart.component.html',
})
export class CartComponent {
  @Input() plan: OboSecondScreenPlan | null = null;
  @Input() cart: OboSecondScreenCart | null = null;
  @Input() paymentInProgress = false;

  readonly locale: string;

  get sessionGroups(): OboSecondScreenCartSessionGroup[] {
    if (this.cart === null) {
      return [];
    }
    if (this.cart.sessionGroups?.length > 0) {
      return this.cart.sessionGroups;
    }
    return [{ isoDate: this.cart.isoDate, sessions: this.cart.sessions }];
  }

  get planGroups(): OboSecondScreenCartPlanGroup[] {
    if (this.cart === null) {
      return [];
    }
    if (this.cart.planGroups?.length > 0) {
      return this.cart.planGroups;
    }
    return [
      {
        mainPlanId: null,
        place: undefined,
        plan: this.plan ?? undefined,
        sessionGroups: this.sessionGroups,
      },
    ];
  }

  get hasMultiplePlaces(): boolean {
    const uniquePlaceIds = new Set(
      this.planGroups.map(planGroup => planGroup.place?.id).filter((placeId): placeId is number => placeId != null),
    );
    return uniquePlaceIds.size > 1;
  }

  getPlanGroupPlaceName(planGroup: OboSecondScreenCartPlanGroup): string | null {
    if (!this.hasMultiplePlaces) {
      return null;
    }
    return planGroup.place?.name ?? null;
  }

  constructor(translateService: TranslateService) {
    this.locale = translateService.currentLang;
  }
}

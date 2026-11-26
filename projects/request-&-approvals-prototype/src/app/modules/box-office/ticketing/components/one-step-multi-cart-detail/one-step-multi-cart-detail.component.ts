import { KeyValuePipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';

import { OneStepMultiCartDetailMainPlanComponent } from '../one-step-multi-cart-detail-main-plan/one-step-multi-cart-detail-main-plan.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KeyValuePipe, NgFor, NgIf, OneStepMultiCartDetailMainPlanComponent],
  selector: 'app-one-step-multi-cart-detail',
  standalone: true,
  styleUrls: ['./one-step-multi-cart-detail.component.scss'],
  templateUrl: './one-step-multi-cart-detail.component.html',
})
export class OneStepMultiCartDetailComponent {
  @Input() cartSessionsByMainPlanAndDatetime: Map<number, Map<string, CartSession[]>> | null = null;
  @Input() currentPlanId: number | null = null;

  @Output() goToMainPlanClicked: EventEmitter<number> = new EventEmitter<number>();

  trackByMainPlanId(_: number, item: { key: number; value: Map<string, CartSession[]> }): number {
    return item.key;
  }

  shouldHideMainPlan(mainPlanId: number): boolean {
    if (this.cartSessionsByMainPlanAndDatetime === null) {
      return false;
    }
    const hasOnlyOnePlan = this.cartSessionsByMainPlanAndDatetime.size === 1;
    const isCurrentPlan = this.currentPlanId !== null && mainPlanId === this.currentPlanId;
    return hasOnlyOnePlan && isCurrentPlan;
  }

  goToMainPlan(mainPlanId: number): void {
    this.goToMainPlanClicked.emit(mainPlanId);
  }
}

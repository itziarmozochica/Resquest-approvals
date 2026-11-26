import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';

import { KioskPlanItem } from '@fz-original/app/modules/kiosk/models/kiosk-plan.model';

import { KioskPlanFormatterService } from '../../services/kiosk-plan-formatter.service';
import { KioskPlanItemComponent } from '../kiosk-plan-item/kiosk-plan-item.component';

@Component({
  selector: 'app-kiosk-plans-grid',
  templateUrl: './kiosk-plans-grid.component.html',
  styleUrls: ['./kiosk-plans-grid-component.scss'],
  standalone: true,
  imports: [KioskPlanItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KioskPlansGridComponent {
  readonly #kioskPlanFormatterService = inject(KioskPlanFormatterService);

  @Input() isTwoPlans = false;
  @Input() onItemClicked: (plan: KioskPlanItem) => void = () => {};
  @Input() plans: KioskPlanItem[] = [];

  formatPrice(plan: KioskPlanItem): string {
    return this.#kioskPlanFormatterService.formatPrice(plan);
  }

  formatStrikethroughPrice(plan: KioskPlanItem): string {
    return this.#kioskPlanFormatterService.formatStrikethroughPrice(plan);
  }

  getPlanCoverImage(plan: KioskPlanItem): string {
    return this.#kioskPlanFormatterService.getPlanCoverImage(plan, this.isTwoPlans);
  }

  isPlanSoldOut(plan: KioskPlanItem): boolean {
    return !plan.is_purchasable;
  }

  showPrice(plan: KioskPlanItem): boolean {
    return this.#kioskPlanFormatterService.showPrice(plan);
  }

  showRating(plan: KioskPlanItem): boolean {
    return this.#kioskPlanFormatterService.showRating(plan);
  }
}

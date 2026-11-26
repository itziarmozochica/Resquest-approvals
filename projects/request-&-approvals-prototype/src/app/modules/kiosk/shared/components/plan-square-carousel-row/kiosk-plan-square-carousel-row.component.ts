import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { KioskPlanItem } from '@fz-original/app/modules/kiosk/models/kiosk-plan.model';

import { KioskPlanSquareItemComponent } from '../kiosk-plan-square-item/kiosk-plan-square-item.component';

@Component({
  selector: 'app-kiosk-plan-square-carousel-row',
  templateUrl: './kiosk-plan-square-carousel-row.component.html',
  styleUrls: ['./kiosk-plan-square-carousel-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [KioskPlanSquareItemComponent],
})
export class KioskPlanSquareCarouselRowComponent {
  onItemClicked = input<(plan: KioskPlanItem) => void>(() => {});
  plans = input<KioskPlanItem[]>([]);
}

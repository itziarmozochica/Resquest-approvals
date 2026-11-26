import { Component, Input } from '@angular/core';

import { KioskPlanItem } from '@fz-original/app/modules/kiosk/models/kiosk-plan.model';

@Component({
  selector: 'app-kiosk-cover-image',
  standalone: false,
  templateUrl: './kiosk-cover-image.component.html',
  styleUrls: ['./kiosk-cover-image.component.scss'],
})
export class KioskCoverImageComponent {
  get animated(): boolean {
    return this.plan ? !this.plan.kiosk_cover_image : true;
  }

  get image(): string {
    return this.plan ? (this.plan.kiosk_cover_image ?? this.plan.cover_image) : '';
  }

  @Input() plan: KioskPlanItem | null = null;

  isPlanSoldOut(): boolean {
    return this.plan ? !this.plan.is_purchasable : false;
  }
}

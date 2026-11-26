import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { IgntRatingComponent } from '@ignite/legacy/components/ignt-rating/ignt-rating.component';
import { TranslateModule } from '@ngx-translate/core';

import { FitTextDirective } from '../../directives/fit-text/fit-text.directive';
import { KioskImageDirective } from '../../directives/kiosk-image/kiosk-image.directive';

@Component({
  selector: 'app-kiosk-plan-item',
  templateUrl: './kiosk-plan-item.component.html',
  styleUrls: ['./kiosk-plan-item.scss'],
  standalone: true,
  imports: [CommonModule, IgntRatingComponent, TranslateModule, FitTextDirective, KioskImageDirective],
})
export class KioskPlanItemComponent {
  @Input() isSoldOut = false;
  @Input() isTwoPlans = false;
  @Input() planImage = '';
  @Input() planName = '';
  @Input() planNumRatings = 0;
  @Input() planPrice = '';
  @Input() planPriceStrikethrough = '';
  @Input() planRating: number | null = null;
  @Input() showRating = true;
}

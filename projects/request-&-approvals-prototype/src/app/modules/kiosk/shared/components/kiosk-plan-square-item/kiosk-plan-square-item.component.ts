import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { KioskPlanItem } from '@fz-original/app/modules/kiosk/models/kiosk-plan.model';
import { IgntRatingComponent } from '@ignite/legacy/components/ignt-rating/ignt-rating.component';
import { TranslateModule } from '@ngx-translate/core';

import { FitTextDirective } from '../../directives/fit-text/fit-text.directive';
import { KioskImageDirective } from '../../directives/kiosk-image/kiosk-image.directive';
import { KioskPlanFormatterService } from '../../services/kiosk-plan-formatter.service';

@Component({
  selector: 'app-kiosk-plan-square-item',
  templateUrl: './kiosk-plan-square-item.component.html',
  styleUrls: ['./kiosk-plan-square-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [IgntRatingComponent, TranslateModule, FitTextDirective, KioskImageDirective],
})
export class KioskPlanSquareItemComponent {
  readonly #formatter = inject(KioskPlanFormatterService);

  plan = input.required<KioskPlanItem>();
  onItemClicked = input<(plan: KioskPlanItem) => void>(() => {});

  get isSoldOut(): boolean {
    return !this.plan().is_purchasable;
  }

  get planImage(): string {
    return this.plan().cover_image;
  }

  get formattedPrice(): string {
    return this.#formatter.formatPrice(this.plan());
  }

  get formattedStrikethroughPrice(): string {
    return this.#formatter.formatStrikethroughPrice(this.plan());
  }

  get showRating(): boolean {
    return this.#formatter.showRating(this.plan());
  }

  get showPrice(): boolean {
    return this.#formatter.showPrice(this.plan());
  }
}

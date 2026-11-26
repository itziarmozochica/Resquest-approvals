import { inject, Injectable } from '@angular/core';

import { KioskPlanItem } from '@fz-original/app/modules/kiosk/models/kiosk-plan.model';

import { KioskLanguageService } from '../../services/kiosk-language.service';
import { formatCurrencyAmount } from '../../utils/currency-locale.util';

@Injectable({
  providedIn: 'root',
})
export class KioskPlanFormatterService {
  readonly #kioskLanguageService = inject(KioskLanguageService);

  formatPrice(plan: KioskPlanItem): string {
    if (!this.showPrice(plan)) {
      return '';
    }
    return formatCurrencyAmount(plan.price_info.amount, plan.price_info.currency, this.#kioskLanguageService.locale());
  }

  formatStrikethroughPrice(plan: KioskPlanItem): string {
    if (!this.showPrice(plan) || plan.price_info.strikethrough === null || plan.price_info.strikethrough <= 0) {
      return '';
    }
    return formatCurrencyAmount(plan.price_info.strikethrough, plan.price_info.currency, this.#kioskLanguageService.locale());
  }

  getPlanCoverImage(plan: KioskPlanItem, isTwoPlans: boolean = false): string {
    if (isTwoPlans) {
      return plan.cover_image;
    }
    return plan.kiosk_cover_image ?? plan.cover_image;
  }

  showPrice(plan: KioskPlanItem): boolean {
    return !plan.price_info.hide && plan.price_info.amount > 0;
  }

  showRating(plan: KioskPlanItem): boolean {
    return !plan.rating.hide && plan.rating.num_ratings > 0;
  }
}
